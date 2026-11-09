import type { Corporation, CounterInitiative, Initiative, UtopiaCard, UtopiaGame, UtopiaMetric, UtopiaPerk, UtopiaPerkEffect } from '../models/utopia.model.ts';
import {
  attackRules, corporations, corpStartPower, counterInitiatives, initiatives, metrics, utopiaPerks, utopiaStart
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
    nextAttack: attackRules.interval,
    attackLog: []
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

type ValueEffect = Exclude<UtopiaPerkEffect, { kind: 'unlock' }>;

/** The combined value of all activated perks of one kind (their multipliers multiplied). */
export function perkValue(state: UtopiaGame, kind: ValueEffect['kind']): number {
  const values = utopiaPerks
    .filter(perk => state.perks.includes(perk.id) && perk.effect.kind === kind)
    .map(perk => (perk.effect as ValueEffect).value);
  return values.reduce((total, value) => total * value, 1);
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
 * push back, and every few seconds MegaCorp attacks with a lawsuit or a defamation campaign.
 */
export function tickUtopia(state: UtopiaGame, random: () => number = Math.random): UtopiaGame {
  const drift = perkValue(state, 'driftShield');
  const next: UtopiaGame = {
    ...state,
    seconds: state.seconds + 1,
    actions: cap(state.actions + state.actionRate),
    budget: cap(state.budget + state.budgetRate),
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
  // MegaCorp only attacks once you know about it.
  if (!cardUnlocked(state, 'megacorp')) return next;
  next.nextAttack = state.nextAttack - 1;
  if (next.nextAttack > 0) return next;
  next.nextAttack = attackRules.interval;
  return attack(next, random);
}

/** MegaCorp strikes: a random corporation (weighted by power) uses one of its attacks, scaled by its power. */
export function attack(state: UtopiaGame, random: () => number): UtopiaGame {
  const active = activeCorporations(state);
  const total = active.reduce((sum, corp) => sum + state.corpPower[corp.id]!, 0);
  if (!total) return state;
  let roll = random() * total;
  const attacker = active.find(corp => (roll -= state.corpPower[corp.id]!) < 0) ?? active[active.length - 1]!;
  const strike = attacker.attacks[Math.min(attacker.attacks.length - 1, Math.floor(random() * attacker.attacks.length))]!;
  const scale = state.corpPower[attacker.id]! / 100 * perkValue(state, 'attackShield');
  const scaled = Object.fromEntries(Object.entries(strike.effects).map(([metric, amount]) => [metric, amount * scale]));
  return {
    ...state,
    metrics: shiftMetrics(state, scaled, -1),
    integrity: percent(state.integrity - (strike.integrity ?? 0) * scale),
    attackLog: [strike.name, ...state.attackLog].slice(0, attackRules.logLength)
  };
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
 * MegaCorp's counter initiatives. Attacks come on top every few seconds.
 */
export function metricRate(state: UtopiaGame, metric: UtopiaMetric): number {
  if (!cardUnlocked(state, 'utopia')) return 0;
  const drift = (metrics.find(entry => entry.id === metric)?.drift ?? 0) * perkValue(state, 'driftShield');
  const mine = state.running
    .filter(id => initiative(id)?.metric === metric && initiativeFunded(state, id))
    .reduce((total, id) => total + initiativeRate(state, id), 0);
  const theirs = counterInitiatives.filter(counter => counter.metric === metric).reduce((total, counter) => total + counterRate(state, counter), 0);
  return drift + mine - theirs;
}

// ---------- Counter initiatives ----------

/** Whether a counter initiative has launched (MegaCorp visible long enough). */
export function counterLaunched(state: UtopiaGame, counter: CounterInitiative): boolean {
  return cardUnlocked(state, 'megacorp') && state.megacorpSeconds >= counter.launchAfter;
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

