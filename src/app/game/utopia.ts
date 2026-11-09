import type { ActionCard, CardEffect, Corporation, CounterInitiative, Initiative, UtopiaCard, UtopiaGame, UtopiaMetric, UtopiaPerk, UtopiaPerkEffect } from '../models/utopia.model.ts';
import {
  attackRules, corporations, corpStartPower, counterInitiatives, duelRules, outcomeRules, initiatives, megacorpCards, metrics, playerCards, utopiaPerks, utopiaStart
} from './utopia-content.ts';

const percent = (value: number) => Math.max(0, Math.min(100, value));

const cap = (value: number) => Math.min(Number.MAX_SAFE_INTEGER, value);

/**
 * A fresh level 3: bars at their start values, every corporation at full power. TCA, budget and integrity come
 * from level 2 when given.
 */
export function newUtopia(
  carry: { actions: number; budget: number; integrity: number; actionRate: number; budgetRate: number } = utopiaStart
): UtopiaGame {
  return {
    seconds: 0,
    actions: carry.actions,
    budget: carry.budget,
    integrity: carry.integrity,
    startActions: carry.actions,
    actionRate: Math.max(0, Math.round(carry.actionRate)),
    budgetRate: Math.max(0, Math.round(carry.budgetRate)),
    perks: [],
    metrics: Object.fromEntries(metrics.map(metric => [metric.id, metric.start])) as Record<UtopiaMetric, number>,
    corpPower: Object.fromEntries(corporations.map(corp => [corp.id, corpStartPower])),
    built: [],
    building: {},
    running: [],
    megacorpSeconds: 0,
    nextAttack: attackRules.baseInterval,
    attackLog: [],
    effects: [],
    cardCooldowns: {},
    duel: null,
    duelCooldown: 0,
    outcome: null,
    outcomeSeen: false
  };
}

export function corporation(id: string): Corporation | undefined {
  return corporations.find(corp => corp.id === id);
}

/** Corporations that still have power left. */
export function activeCorporations(state: UtopiaGame): Corporation[] {
  return corporations.filter(corp => (state.corpPower[corp.id] ?? 0) > 0);
}

// ---------- Perks ----------

type ValueEffect = Exclude<UtopiaPerkEffect, { kind: 'unlock' } | { kind: 'unlockAction' }>;

/** The combined value of all activated perks of one kind (their multipliers multiplied). */
export function perkValue(state: UtopiaGame, kind: ValueEffect['kind']): number {
  const values = utopiaPerks
    .filter(perk => state.perks.includes(perk.id) && perk.effect.kind === kind)
    .map(perk => (perk.effect as ValueEffect).value);
  return values.reduce((total, value) => total * value, 1);
}

/** TCA gained per second: the rate from level 2, times rate boosts. */
export function actionsPerSecond(state: UtopiaGame): number {
  return Math.round(state.actionRate * perkValue(state, 'rateBoost'));
}

/** Budget gained per second: the rate from level 2, times rate boosts. */
export function budgetPerSecond(state: UtopiaGame): number {
  return Math.round(state.budgetRate * perkValue(state, 'rateBoost'));
}

/** Whether a hidden card (Utopia, MegaCorp) has been opened by its perk. */
export function cardUnlocked(state: UtopiaGame, card: UtopiaCard): boolean {
  return utopiaPerks.some(perk => state.perks.includes(perk.id) && perk.effect.kind === 'unlock' && perk.effect.card === card);
}

/** The perk that opens a hidden card. */
export function unlockPerk(card: UtopiaCard): UtopiaPerk | undefined {
  return utopiaPerks.find(perk => perk.effect.kind === 'unlock' && perk.effect.card === card);
}

/** Coding actions gained since level 3 started (what perk thresholds count). */
export function actionsGained(state: UtopiaGame): number {
  return Math.max(0, state.actions - state.startActions);
}

export function utopiaPerkAvailable(state: UtopiaGame, perk: UtopiaPerk): boolean {
  return !state.perks.includes(perk.id) && state.actions >= perk.actionsRequired && state.budget >= perk.cost;
}

/** Perks not taken yet: available ones first, then by TCA threshold; at most five. */
export function openUtopiaPerks(state: UtopiaGame, limit = 5): UtopiaPerk[] {
  return utopiaPerks
    .filter(perk => !state.perks.includes(perk.id))
    .sort((a, b) => Number(utopiaPerkAvailable(state, b)) - Number(utopiaPerkAvailable(state, a)) || a.actionsRequired - b.actionsRequired)
    .slice(0, limit);
}

export function activateUtopiaPerk(state: UtopiaGame, id: string): UtopiaGame | null {
  const perk = utopiaPerks.find(entry => entry.id === id);
  if (!perk || !utopiaPerkAvailable(state, perk)) return null;
  return { ...state, budget: state.budget - perk.cost, perks: [...state.perks, id] };
}

/** Lowers or raises bars by the given percentage points. */
function shiftMetrics(state: UtopiaGame, changes: Partial<Record<UtopiaMetric, number>>, sign: 1 | -1): Record<UtopiaMetric, number> {
  const next = { ...state.metrics };
  for (const [metric, amount] of Object.entries(changes) as [UtopiaMetric, number][]) {
    next[metric] = percent(next[metric] + sign * amount);
  }
  return next;
}

/**
 * One second of level 3: TCA and budget grow, bars drift, initiatives build and run, MegaCorp's counter initiatives
 * push back, timed cards run, and every few seconds MegaCorp plays a card.
 */
export function tickUtopia(state: UtopiaGame, random: () => number = Math.random): UtopiaGame {
  if (state.outcome) return state;
  return decide(advance(state, random));
}

/** Every bar at 100% wins level 3; every bar at 0% ends it (`loseWhen: 'all'`; 'any' would end it at the first). Only once Utopia is open. */
export function levelOutcome(state: UtopiaGame): 'won' | 'lost' | null {
  if (!cardUnlocked(state, 'utopia')) return null;
  const values = Object.values(state.metrics);
  if (values.every(value => value >= outcomeRules.win)) return 'won';
  const dropped = values.filter(value => value <= outcomeRules.lose).length;
  if (outcomeRules.loseWhen === 'any' ? dropped > 0 : dropped === values.length) return 'lost';
  return null;
}

function decide(state: UtopiaGame): UtopiaGame {
  const outcome = levelOutcome(state);
  return outcome ? { ...state, outcome, duel: null } : state;
}

/** Closes the "utopia achieved" dialog. */
export function dismissOutcome(state: UtopiaGame): UtopiaGame | null {
  return state.outcome === 'won' && !state.outcomeSeen ? { ...state, outcomeSeen: true } : null;
}

function advance(state: UtopiaGame, random: () => number): UtopiaGame {
  const drift = perkValue(state, 'driftShield');
  const next: UtopiaGame = {
    ...state,
    seconds: state.seconds + 1,
    actions: cap(state.actions + actionsPerSecond(state)),
    budget: cap(state.budget + budgetPerSecond(state)),
    // The bars only start to erode once the Utopia card is open.
    metrics: cardUnlocked(state, 'utopia')
      ? Object.fromEntries(metrics.map(metric => [metric.id, percent(state.metrics[metric.id] + metric.drift * drift)])) as Record<UtopiaMetric, number>
      : state.metrics,
  };
  next.building = Object.fromEntries(Object.entries(state.building).map(([id, seconds]) => [id, seconds + 1]));
  const finished = Object.entries(next.building).filter(([id, seconds]) => seconds >= (initiative(id)?.buildTime ?? 0)).map(([id]) => id);
  if (finished.length) {
    next.built = [...next.built, ...finished];
    next.building = Object.fromEntries(Object.entries(next.building).filter(([id]) => !finished.includes(id)));
  }
  runInitiatives(next);
  if (cardUnlocked(state, 'megacorp')) {
    next.megacorpSeconds = state.megacorpSeconds + 1;
    runCounterInitiatives(next);
  }
  runCards(next);
  if (next.duelCooldown > 0 && !next.duel) next.duelCooldown = next.duelCooldown - 1;
  // A defeated MegaCorp stops for good: its running moves end and it plays no more cards.
  if (megacorpDefeated(next)) {
    next.effects = next.effects.filter(active => actionCard(active.cardId)?.actor !== 'megacorp');
    return next;
  }
  // MegaCorp only plays cards once you know about it, and waits while a duel is open.
  if (!cardUnlocked(state, 'megacorp') || next.duel) return next;
  next.nextAttack = state.nextAttack - 1;
  if (next.nextAttack > 0) return next;
  // Sometimes MegaCorp challenges you to a duel instead of playing a card.
  if (canDuel(next) && random() < duelRules.megacorpChance) {
    return { ...next, duel: { startedBy: 'megacorp', result: null }, nextAttack: attackInterval(next) };
  }
  const played = megacorpMove(next, random);
  return { ...played, nextAttack: attackInterval(played) };
}

// ---------- Action cards ----------

export function actionCard(id: string): ActionCard | undefined {
  return [...megacorpCards, ...playerCards].find(card => card.id === id);
}

/** Seconds until MegaCorp's next card: 10 at an average of 70% on your bars, sooner when they are higher. */
export function attackInterval(state: UtopiaGame): number {
  const values = Object.values(state.metrics);
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const seconds = attackRules.baseInterval - (average - attackRules.referenceLevel) * attackRules.secondsPerPoint;
  return Math.max(attackRules.minInterval, Math.min(attackRules.maxInterval, Math.round(seconds)));
}

/** Share of MegaCorp's card effects that reaches you (firewalls). */
export function firewallFactor(state: UtopiaGame): number {
  return state.effects.reduce((factor, active) => {
    const card = actionCard(active.cardId);
    const firewall = card?.effects.find(effect => effect.kind === 'firewall');
    return firewall && firewall.kind === 'firewall' ? factor * firewall.factor : factor;
  }, 1);
}

/** Your owned card that stops a MegaCorp move (Shut It Down), if it is off cooldown. */
function readyCanceller(state: UtopiaGame): ActionCard | undefined {
  return playerCards.find(card => card.effects.some(effect => effect.kind === 'cancelMove') && cardOwned(state, card.id) &&
    cardUnlocked(state, 'megacorp') && (state.cardCooldowns[card.id] ?? 0) <= 0);
}

/** Whether you can stop the running effect at this position: it is MegaCorp's and Shut It Down is ready. */
export function canCancelEffect(state: UtopiaGame, index: number): boolean {
  const active = state.effects[index];
  return !!active && actionCard(active.cardId)?.actor === 'megacorp' && !!readyCanceller(state) && !state.outcome;
}

/** Stops the running MegaCorp move you picked; Shut It Down then cools down. */
export function cancelMegacorpEffect(state: UtopiaGame, index: number): UtopiaGame | null {
  const card = readyCanceller(state);
  if (!card || !canCancelEffect(state, index)) return null;
  return {
    ...state,
    effects: state.effects.filter((_, position) => position !== index),
    cardCooldowns: { ...state.cardCooldowns, [card.id]: card.cooldown ?? 0 }
  };
}

/** Whether MegaCorp is protected from losing power (bribed government). */
export function powerShielded(state: UtopiaGame): boolean {
  return state.effects.some(active => actionCard(active.cardId)?.effects.some(effect => effect.kind === 'powerShield'));
}

/** Applies a card's effects once (one-time cards) or for one second (timed cards). Mutates `next`. */
function applyEffects(next: UtopiaGame, card: ActionCard, corpId?: string): void {
  const incoming = card.actor === 'megacorp' ? firewallFactor(next) : 1;
  for (const effect of card.effects) applyEffect(next, effect, incoming, corpId);
}

function applyEffect(next: UtopiaGame, effect: CardEffect, incoming: number, corpId?: string): void {
  if (effect.kind === 'metric') {
    next.metrics = { ...next.metrics, [effect.metric]: percent(next.metrics[effect.metric] + effect.amount * incoming) };
  } else if (effect.kind === 'credibility') {
    next.integrity = percent(next.integrity + effect.amount * incoming);
  } else if (effect.kind === 'corpPower') {
    if (effect.amount < 0 && powerShielded(next)) return;
    const living = activeCorporations(next);
    const targets = effect.target === 'all' ? living.map(corp => corp.id)
      : effect.target === 'self' ? (corpId ? [corpId] : [])
        : living.length ? [living.reduce((best, corp) => (next.corpPower[corp.id]! > next.corpPower[best.id]! ? corp : best)).id] : [];
    next.corpPower = { ...next.corpPower };
    for (const id of targets) next.corpPower[id] = percent((next.corpPower[id] ?? 0) + effect.amount);
  }
}

/** One second of the timed cards that are running (mutates `next`); expired ones end. */
function runCards(next: UtopiaGame): void {
  next.cardCooldowns = Object.fromEntries(Object.entries(next.cardCooldowns).map(([id, seconds]) => [id, Math.max(0, seconds - 1)]));
  for (const active of next.effects) {
    const card = actionCard(active.cardId);
    if (card) applyEffects(next, card, active.corpId);
  }
  next.effects = next.effects.map(active => ({ ...active, remaining: active.remaining - 1 })).filter(active => active.remaining > 0);
}

/** Plays a card: one-time effects hit now, timed cards start running. */
function playCard(state: UtopiaGame, card: ActionCard, corpId?: string): UtopiaGame {
  const next: UtopiaGame = { ...state };
  if (card.duration) next.effects = [...state.effects, { cardId: card.id, corpId, remaining: card.duration }];
  else applyEffects(next, card, corpId);
  return next;
}

/** MegaCorp's move: a random corporation (weighted by power) plays a random card from its deck (shared cards plus its own). */
export function megacorpMove(state: UtopiaGame, random: () => number): UtopiaGame {
  const active = activeCorporations(state);
  const total = active.reduce((sum, corp) => sum + state.corpPower[corp.id]!, 0);
  if (!total) return state;
  let roll = random() * total;
  const corp = active.find(entry => (roll -= state.corpPower[entry.id]!) < 0) ?? active[active.length - 1]!;
  const deck = megacorpCards.filter(entry => !entry.corpId || entry.corpId === corp.id);
  const card = deck[Math.min(deck.length - 1, Math.floor(random() * deck.length))]!;
  const next = playCard(state, card, corp.id);
  return { ...next, attackLog: [{ cardId: card.id, corpId: corp.id }, ...state.attackLog].slice(0, attackRules.logLength) };
}

/** Whether one of your cards can be used at all: available from the start, or unlocked by its perk. */
export function cardOwned(state: UtopiaGame, id: string): boolean {
  const card = playerCards.find(entry => entry.id === id);
  if (!card) return false;
  return !card.locked || utopiaPerks.some(perk => state.perks.includes(perk.id) && perk.effect.kind === 'unlockAction' && perk.effect.action === id);
}

/** Your cards you can use (owned), in config order. */
export function ownedCards(state: UtopiaGame): ActionCard[] {
  return playerCards.filter(card => cardOwned(state, card.id));
}

/** Why you cannot play one of your cards right now, or null when you can. */
export function cardBlocker(state: UtopiaGame, id: string): string | null {
  const card = playerCards.find(entry => entry.id === id);
  if (!card) return 'Unknown card';
  if (!cardOwned(state, id)) return 'Needs its perk';
  if (!cardUnlocked(state, 'megacorp')) return 'MegaCorp is unknown';
  if ((state.cardCooldowns[id] ?? 0) > 0) return `Ready in ${state.cardCooldowns[id]}s`;
  // Cancelling is not played like a card: you pick the running MegaCorp move to stop.
  if (card.effects.some(effect => effect.kind === 'cancelMove')) {
    return state.effects.some(active => actionCard(active.cardId)?.actor === 'megacorp') ? 'Pick a running MegaCorp move above' : 'No running MegaCorp move';
  }
  return null;
}

/** Plays one of your cards; it then cools down. */
export function playPlayerCard(state: UtopiaGame, id: string): UtopiaGame | null {
  const card = playerCards.find(entry => entry.id === id);
  if (!card || state.outcome || cardBlocker(state, id)) return null;
  const next = playCard(state, card);
  return { ...next, cardCooldowns: { ...next.cardCooldowns, [id]: card.cooldown ?? 0 } };
}

/** A short line about what a card does, e.g. "Housing −1%/s for 30s". */
export function cardSummary(card: ActionCard): string {
  const timed = !!card.duration;
  const parts = card.effects.map(effect => {
    const sign = (value: number) => (value > 0 ? '+' : '−') + Math.abs(value);
    switch (effect.kind) {
      case 'metric': return `${metrics.find(entry => entry.id === effect.metric)?.name ?? effect.metric} ${sign(effect.amount)}%${timed ? '/s' : ''}`;
      case 'credibility': return `Credibility ${sign(effect.amount)}${timed ? '/s' : ''}`;
      case 'corpPower': return `${sign(effect.amount)}% power for ${effect.target === 'self' ? 'its corporation' : effect.target === 'all' ? 'every corporation' : 'the strongest corporation'}${timed ? '/s' : ''}`;
      case 'powerShield': return 'No power loss';
      case 'firewall': return `MegaCorp effects reach you at ${Math.round(effect.factor * 100)}%`;
      case 'duelBoost': return `Battle push +${effect.clickGain}% per click`;
      case 'cancelMove': return 'Stops a running MegaCorp move of your choice';
    }
  });
  return parts.join(', ') + (timed ? ` for ${card.duration}s` : '');
}

export function initiative(id: string): Initiative | undefined {
  return initiatives.find(entry => entry.id === id);
}

/** Percentage points per second an initiative adds to its bar: its rate × credibility (50% credibility: half), with perks. */
export function initiativeRate(state: UtopiaGame, id: string): number {
  return (initiative(id)?.rate ?? 0) * state.integrity / 100 * perkValue(state, 'initiativeGain');
}

/** Budget per second an initiative costs, with perks. */
export function initiativeUpkeep(state: UtopiaGame, id: string): number {
  return (initiative(id)?.upkeep ?? 0) * perkValue(state, 'upkeep');
}

/** Where an initiative stands: not built yet, building, built (ready to start) or running. */
export function initiativeStage(state: UtopiaGame, id: string): 'new' | 'building' | 'built' | 'running' {
  if (state.running.includes(id)) return 'running';
  if (state.built.includes(id)) return 'built';
  return id in state.building ? 'building' : 'new';
}

/** Why an initiative cannot be initialized right now, or null when it can. */
export function initializeBlocker(state: UtopiaGame, id: string): string | null {
  const entry = initiative(id);
  if (!entry) return 'Unknown initiative';
  if (!cardUnlocked(state, 'utopia')) return 'Utopia is locked';
  if (initiativeStage(state, id) !== 'new') return 'Already initialized';
  if (state.budget < entry.cost) return 'Not enough budget';
  return null;
}

/** Pays for an initiative and starts building it; after its build time it can be started. */
export function initializeInitiative(state: UtopiaGame, id: string): UtopiaGame | null {
  const entry = initiative(id);
  if (!entry || initializeBlocker(state, id)) return null;
  return { ...state, budget: state.budget - entry.cost, building: { ...state.building, [id]: 0 } };
}

/** Why an initiative cannot start right now, or null when it can. */
export function initiativeBlocker(state: UtopiaGame, id: string): string | null {
  if (!initiative(id)) return 'Unknown initiative';
  if (!cardUnlocked(state, 'utopia')) return 'Utopia is locked';
  const stage = initiativeStage(state, id);
  if (stage === 'running') return 'Already running';
  if (stage !== 'built') return 'Needs to be initialized first';
  return null;
}

/** Starts a built initiative; from then on it runs every second. */
export function startInitiative(state: UtopiaGame, id: string): UtopiaGame | null {
  if (initiativeBlocker(state, id)) return null;
  return { ...state, running: [...state.running, id] };
}

export function stopInitiative(state: UtopiaGame, id: string): UtopiaGame | null {
  if (!state.running.includes(id)) return null;
  return { ...state, running: state.running.filter(entry => entry !== id) };
}

/**
 * How much a bar changes per second right now: drift (once Utopia is open), your funded running initiatives and
 * MegaCorp's counter initiatives and running timed cards. One-time cards come on top.
 */
export function metricRate(state: UtopiaGame, metric: UtopiaMetric): number {
  if (!cardUnlocked(state, 'utopia')) return 0;
  const drift = (metrics.find(entry => entry.id === metric)?.drift ?? 0) * perkValue(state, 'driftShield');
  const mine = state.running
    .filter(id => initiative(id)?.metric === metric && initiativeFunded(state, id))
    .reduce((total, id) => total + initiativeRate(state, id), 0);
  const theirs = counterInitiatives.filter(counter => counter.metric === metric).reduce((total, counter) => total + counterRate(state, counter), 0);
  const cards = state.effects.reduce((total, active) => {
    const card = actionCard(active.cardId);
    const incoming = card?.actor === 'megacorp' ? firewallFactor(state) : 1;
    return total + (card?.effects ?? []).reduce((sum, effect) => sum + (effect.kind === 'metric' && effect.metric === metric ? effect.amount * incoming : 0), 0);
  }, 0);
  return drift + mine - theirs + cards;
}

// ---------- Counter initiatives ----------

/** Whether a counter initiative has launched (MegaCorp visible long enough). */
export function counterLaunched(state: UtopiaGame, counter: CounterInitiative): boolean {
  return cardUnlocked(state, 'megacorp') && !megacorpDefeated(state) && state.megacorpSeconds >= counter.launchAfter;
}

/** Every corporation is at 0% power: no more battles, moves or counter initiatives. */
export function megacorpDefeated(state: UtopiaGame): boolean {
  return corporations.every(corp => (state.corpPower[corp.id] ?? 0) <= 0);
}

/** Percentage points per second a counter initiative takes right now: scaled by power, halved by fact-checkers. */
export function counterRate(state: UtopiaGame, counter: CounterInitiative): number {
  if (!counterLaunched(state, counter)) return 0;
  return counter.rate * (state.corpPower[counter.corpId] ?? 0) / 100 * perkValue(state, 'attackShield');
}

/** Counter initiatives that have launched, in config order. */
export function launchedCounters(state: UtopiaGame): CounterInitiative[] {
  return counterInitiatives.filter(counter => counterLaunched(state, counter));
}

/** One second of MegaCorp's counter initiatives (mutates `next`). */
function runCounterInitiatives(next: UtopiaGame): void {
  for (const counter of counterInitiatives) {
    const rate = counterRate(next, counter);
    if (rate > 0) next.metrics = { ...next.metrics, [counter.metric]: percent(next.metrics[counter.metric] - rate) };
  }
}

/** Whether a running initiative can pay this second's upkeep. */
export function initiativeFunded(state: UtopiaGame, id: string): boolean {
  return state.budget >= initiativeUpkeep(state, id);
}

/** One second of all running initiatives (mutates `next`): each pays its upkeep and raises its bar, or pauses without budget. */
function runInitiatives(next: UtopiaGame): void {
  for (const id of next.running) {
    const entry = initiative(id);
    if (!entry || !initiativeFunded(next, id)) continue;
    next.budget = Math.max(0, next.budget - initiativeUpkeep(next, id));
    next.metrics = { ...next.metrics, [entry.metric]: percent(next.metrics[entry.metric] + initiativeRate(next, id)) };
  }
}


// ---------- Duels ----------

/** Whether a duel can start now: MegaCorp is known, no duel is open and the cooldown is over. */
export function canDuel(state: UtopiaGame): boolean {
  return cardUnlocked(state, 'megacorp') && !megacorpDefeated(state) && !state.duel && state.duelCooldown <= 0;
}

/** You challenge MegaCorp to a duel. */
export function startDuel(state: UtopiaGame): UtopiaGame | null {
  return canDuel(state) ? { ...state, duel: { startedBy: 'player', result: null } } : null;
}

/** The duel's bar reached 100% (won) or 0% (lost): applies the outcome. */
export function finishDuel(state: UtopiaGame, won: boolean): UtopiaGame | null {
  if (!state.duel || state.duel.result) return null;
  const next: UtopiaGame = { ...state, duel: { ...state.duel, result: won ? 'won' : 'lost' } };
  if (won) applyEffect(next, { kind: 'corpPower', target: 'all', amount: -duelRules.winPowerLoss }, 1);
  else next.integrity = percent(next.integrity - duelRules.lossCredibility);
  return next;
}

/** Closes a decided duel; the next one can start after the cooldown. */
export function closeDuel(state: UtopiaGame): UtopiaGame | null {
  return state.duel?.result ? { ...state, duel: null, duelCooldown: duelRules.cooldown } : null;
}

/** Points one push moves the duel bar: 1.2, or more while a boost (Battle Cry) runs. */
export function duelClickGain(state: UtopiaGame): number {
  return state.effects.reduce((gain, active) => {
    const boost = actionCard(active.cardId)?.effects.find(effect => effect.kind === 'duelBoost');
    return boost && boost.kind === 'duelBoost' ? Math.max(gain, boost.clickGain) : gain;
  }, duelRules.clickGain);
}

/** Your cards that boost duels and can be played right now. */
export function duelBoostCards(state: UtopiaGame): ActionCard[] {
  return ownedCards(state).filter(card => card.effects.some(effect => effect.kind === 'duelBoost'));
}

/** One step of the duel bar: clicks add, time drains; the result once it hits 0% or 100%. */
export function duelStep(bar: number, clicks: number, seconds: number, clickGain = duelRules.clickGain): { bar: number; result: 'won' | 'lost' | null } {
  const next = Math.max(0, Math.min(100, bar + clicks * clickGain - seconds * duelRules.drainPerSecond));
  return { bar: next, result: next >= 100 ? 'won' : next <= 0 ? 'lost' : null };
}
