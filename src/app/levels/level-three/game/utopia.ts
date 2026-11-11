import { type Smoothing } from '../../../shared/game/smoothing.ts';
import type { LevelSummary } from '../../../shared/models/shared.model.ts';
import type { Attack, BattleCard, CardCategory, CardEffect, Corporation, Opponent, PlayerCard, Reward, Stage, UtopiaGame } from '../models/utopia.model.ts';
import { battleRules, campaign, corporations, megacorpCards, playerCards } from './utopia-content.ts';

// ---------- Lookups ----------

export function corporation(id: string): Corporation | undefined {
  return corporations.find(corp => corp.id === id);
}

export function playerCard(id: string): PlayerCard | undefined {
  return playerCards.find(card => card.id === id);
}

/** A corporation's deck: its own cards plus the shared MegaCorp cards. */
export function enemyDeck(corpId: string): BattleCard[] {
  return [...(corporation(corpId)?.cards ?? []), ...megacorpCards];
}

export function enemyCard(corpId: string, id: string): BattleCard | undefined {
  return enemyDeck(corpId).find(card => card.id === id);
}

export function currentStage(state: UtopiaGame): Stage | undefined {
  return campaign[state.stage];
}

/** Your deck: the starter cards plus everything you bought in the shop. */
export function ownedCards(state: UtopiaGame): PlayerCard[] {
  return playerCards.filter(card => (card.price === 0 && !card.learned) || state.owned.includes(card.id));
}

/** Counter cards you can learn from the corporations; `known` tells whether you already have them. */
export function learnableCards(state: UtopiaGame): { card: PlayerCard; known: boolean }[] {
  return playerCards.filter(card => card.learned).map(card => ({ card, known: state.owned.includes(card.id) }));
}

/** The cards of the shop, cheapest first. */
export function shopCards(): PlayerCard[] {
  return playerCards.filter(card => card.price > 0 && !card.learned).sort((a, b) => a.price - b.price);
}

/** Why a card cannot be bought right now, or null when it can. */
export function buyBlocker(state: UtopiaGame, id: string): string | null {
  const card = playerCard(id);
  if (!card || card.price === 0) return 'Not for sale';
  if (state.owned.includes(id)) return 'Owned';
  if (state.credits < card.price) return `Needs ${card.price - state.credits} more ${card.price - state.credits === 1 ? 'credit' : 'credits'}`;
  return null;
}

/**
 * Buys a card in the shop: it joins your deck, and the hand is drawn afresh from the whole deck with the new card in
 * it (resting cards stay out; the picked cards are put back).
 */
export function buyCard(state: UtopiaGame, id: string, random: () => number = Math.random): UtopiaGame | null {
  const card = playerCard(id);
  if (!card || buyBlocker(state, id)) return null;
  const bought: UtopiaGame = { ...state, credits: state.credits - card.price, owned: [...state.owned, id], hand: [id], selected: [] };
  return { ...bought, hand: drawHand(bought, random) };
}

/** Multiplier for a corporation's damage and healing in the given battle of a station. */
export function enemyStrength(stage: Stage, battle: number): number {
  return stage.damage + stage.damageStep * battle;
}

/** A card's colour scheme: damage, block, heal, instant battle or counter, or combo when it does more than one of them. */
export function cardCategory(card: BattleCard): CardCategory {
  const kinds = [...new Set(card.effects.map(effect => effect.kind))];
  return kinds.length === 1 ? kinds[0]! : 'combo';
}

/** What a card does in a few words, e.g. "12 damage · block 50%". `factor` scales damage and healing (corporations). */
export function cardSummary(card: BattleCard, factor = 1): string {
  return card.effects.map(effect => {
    switch (effect.kind) {
      case 'damage': return `${Math.round(effect.amount * factor)} damage`;
      case 'block': return `block ${effect.percent}%`;
      case 'heal': return `+${Math.round(effect.amount * factor)} heal`;
      case 'instant': return `${Math.round(effect.amount * factor)} instant damage`;
      case 'counter': return `counters “${playerCard(effect.of)?.name ?? enemyCardById(effect.of)?.name ?? effect.of}”`;
    }
  }).join(' · ');
}

/** Any corporation's card by id. */
function enemyCardById(id: string): BattleCard | undefined {
  return [...corporations.flatMap(corp => corp.cards), ...megacorpCards].find(card => card.id === id);
}

/** The counter cards among the played ones: they wait for the opponent's next attack. */
function countersOf(played: BattleCard[]): string[] {
  return played.filter(card => card.effects.some(effect => effect.kind === 'counter')).map(card => card.id);
}

interface InstantResult { dealt: number; recoil: number; counteredBy: string | null; usedCounters: BattleCard[]; hits: CardEffect[] }

/**
 * Instant battle: every instant card hits for its amount (no block helps) unless the defender played its counter card
 * last turn (`armed`); then `recoilShare` of it strikes back at the attacker.
 */
function instantBattle(played: BattleCard[], factor: number, armed: BattleCard[]): InstantResult {
  const result: InstantResult = { dealt: 0, recoil: 0, counteredBy: null, usedCounters: [], hits: [] };
  for (const card of played) {
    for (const effect of card.effects) {
      if (effect.kind !== 'instant') continue;
      const amount = Math.round(effect.amount * factor);
      const counter = armed.find(entry => !result.usedCounters.includes(entry) &&
        entry.effects.some(other => other.kind === 'counter' && other.of === card.id));
      if (counter) {
        result.recoil += Math.round(amount * battleRules.recoilShare);
        result.counteredBy = counter.id;
        result.usedCounters.push(counter);
      } else {
        result.dealt += amount;
        result.hits.push(effect);
      }
    }
  }
  return result;
}

// ---------- Setup ----------

function newOpponent(stageIndex: number, battle: number): Opponent {
  const stage = campaign[stageIndex]!;
  const maxPower = stage.power + stage.powerStep * battle;
  return { corpId: stage.corpId, power: maxPower, maxPower, block: 0, counters: [], cooldowns: {} };
}

/** Fills the hand with random cards you own that are neither in the hand nor resting. */
function drawHand(state: UtopiaGame, random: () => number): string[] {
  const hand = [...state.hand];
  const pool = ownedCards(state).map(card => card.id).filter(id => !hand.includes(id) && !((state.cooldowns[id] ?? 0) > 0));
  while (hand.length < battleRules.handSize && pool.length) {
    hand.push(pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0]!);
  }
  return hand;
}

/** A battle against the corporation of the given station: fresh opponent, fresh hand, no blocks or cooldowns. */
function startBattle(state: UtopiaGame, stage: number, battle: number, random: () => number): UtopiaGame {
  const next: UtopiaGame = {
    ...state, stage, battle, enemy: newOpponent(stage, battle), hand: [], selected: [], cooldowns: {}, block: 0, counters: [], turn: 'player'
  };
  return { ...next, hand: drawHand(next, random) };
}

/** The start of level 3: the first battle of the campaign with full credibility. */
export function newUtopia(history: LevelSummary[] = [], random: () => number = Math.random): UtopiaGame {
  const blank: UtopiaGame = {
    seconds: 0,
    credibility: battleRules.maxCredibility,
    stage: 0,
    battle: 0,
    enemy: newOpponent(0, 0),
    hand: [],
    selected: [],
    cooldowns: {},
    block: 0,
    counters: [],
    turn: 'player',
    log: [],
    wins: 0,
    losses: 0,
    credits: 0,
    owned: [],
    outcome: null,
    outcomeSeen: false,
    history,
    stats: { cardsPlayed: 0, damageDealt: 0, damageTaken: 0, attempts: 1 }
  };
  return startBattle(blank, 0, 0, random);
}

// ---------- Your turn ----------

/** True while you can pick cards and attack. */
export function playerTurn(state: UtopiaGame): boolean {
  return state.outcome === null && state.turn === 'player';
}

/** Picks a card of your hand for the next attack, or puts it back. At most `maxCards` at once. */
export function toggleCard(state: UtopiaGame, id: string): UtopiaGame | null {
  if (!playerTurn(state) || !state.hand.includes(id)) return null;
  if (state.selected.includes(id)) return { ...state, selected: state.selected.filter(entry => entry !== id) };
  if (state.selected.length >= battleRules.maxCards) return null;
  return { ...state, selected: [...state.selected, id] };
}

interface Resolution { damage: number; blocked: number; healed: number; shield: number }

/** Adds up a set of cards: damage (scaled, minus the defender's block), healing (scaled) and block. */
function resolve(effects: CardEffect[], factor: number, defenderBlock: number): Resolution {
  const value = (effect: CardEffect) => effect.kind === 'block' ? effect.percent : effect.kind === 'counter' ? 0 : effect.amount;
  // Instant battle cards are settled on their own (see instantBattle).
  const sum = (kind: 'damage' | 'block' | 'heal') => effects.reduce((total, effect) => total + (effect.kind === kind ? value(effect) : 0), 0);
  const raw = Math.round(sum('damage') * factor);
  const blocked = Math.round(raw * defenderBlock / 100);
  return { damage: raw - blocked, blocked, healed: Math.round(sum('heal') * factor), shield: sum('block') };
}

/** Cooldowns after a turn: all resting cards rest one turn less, the cards just played start resting. */
function restCards(cooldowns: Record<string, number>, played: BattleCard[]): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [id, turns] of Object.entries(cooldowns)) if (turns > 1) next[id] = turns - 1;
  for (const card of played) if (card.cooldown > 0) next[card.id] = card.cooldown;
  return next;
}

function logAttack(state: UtopiaGame, attack: Omit<Attack, 'id'>): Attack[] {
  const id = (state.log[0]?.id ?? 0) + 1;
  return [{ id, ...attack }, ...state.log].slice(0, battleRules.logLength);
}

/** Plays the picked cards. The corporation answers on the next tick, unless it is beaten. */
export function attack(state: UtopiaGame, random: () => number = Math.random): UtopiaGame | null {
  if (!playerTurn(state) || !state.selected.length) return null;
  const played = state.selected.map(playerCard).filter((card): card is PlayerCard => !!card);
  const result = resolve(played.flatMap(card => card.effects), 1, state.enemy.block);
  const armed = state.enemy.counters.map(id => enemyCard(state.enemy.corpId, id)).filter((card): card is BattleCard => !!card);
  const instant = instantBattle(played, 1, armed);
  const damage = result.damage + instant.dealt;
  const power = Math.max(0, state.enemy.power - damage);
  const credibility = Math.max(0, Math.min(battleRules.maxCredibility, state.credibility + result.healed) - instant.recoil);
  const next: UtopiaGame = {
    ...state,
    credibility,
    // A blocker is used up by the next attack that does damage.
    // Its counters answered this attack (or not): they are gone. Yours now wait for its next attack.
    enemy: {
      ...state.enemy, power,
      block: result.damage + result.blocked > 0 ? 0 : state.enemy.block,
      counters: []
    },
    block: Math.min(battleRules.maxBlock, state.block + result.shield),
    counters: countersOf(played),
    cooldowns: restCards(state.cooldowns, played),
    hand: state.hand.filter(id => !state.selected.includes(id)),
    selected: [],
    turn: 'enemy',
    log: logAttack(state, {
      by: 'player', corpId: state.enemy.corpId, cards: played.map(card => card.id), ...result, damage,
      recoil: instant.recoil, counteredBy: instant.counteredBy
    }),
    stats: {
      ...state.stats, cardsPlayed: state.stats.cardsPlayed + played.length,
      damageDealt: state.stats.damageDealt + damage, damageTaken: state.stats.damageTaken + instant.recoil
    }
  };
  next.hand = drawHand(next, random);
  if (power <= 0) return winBattle(next, random);
  return credibility <= 0 ? lose(next) : next;
}

/** Credibility ran out: the battle is lost. */
function lose(state: UtopiaGame): UtopiaGame {
  return { ...state, credibility: 0, losses: state.losses + 1, credits: state.credits + battleRules.credits.loss, outcome: 'lost', selected: [] };
}

/** What a won battle pays: the win, a bonus for high credibility, and more when the corporation is beaten for good. */
export function battleReward(credibility: number, corporationBeaten: boolean): Reward {
  const rules = battleRules.credits;
  const reward: Reward = { credits: rules.win, reasons: ['win'] };
  if (credibility > rules.highCredibility && rules.highCredibilityBonus) {
    reward.credits += rules.highCredibilityBonus;
    reward.reasons.push(`credibility above ${rules.highCredibility}`);
  }
  if (corporationBeaten && rules.corporationBeaten) {
    reward.credits += rules.corporationBeaten;
    reward.reasons.push('corporation beaten');
  }
  return reward;
}

/** The corporation is beaten: count the win, heal a little and move on to the next battle (or win the level). */
function winBattle(state: UtopiaGame, random: () => number): UtopiaGame {
  const stage = campaign[state.stage]!;
  const nextBattle = state.battle + 1 < stage.battles ? { stage: state.stage, battle: state.battle + 1 } : { stage: state.stage + 1, battle: 0 };
  const reward = battleReward(state.credibility, nextBattle.stage !== state.stage);
  const won: UtopiaGame = {
    ...state,
    wins: state.wins + 1,
    credits: state.credits + reward.credits,
    lastReward: reward,
    credibility: Math.min(battleRules.maxCredibility, state.credibility + battleRules.healAfterWin)
  };
  if (nextBattle.stage >= campaign.length) return { ...won, outcome: 'won', turn: 'player', selected: [] };
  return startBattle(won, nextBattle.stage, nextBattle.battle, random);
}

// ---------- The corporation's turn ----------

/** The corporation plays 1 to `maxCards` random cards that are not resting. */
export function enemyAttack(state: UtopiaGame, random: () => number = Math.random): UtopiaGame {
  const stage = currentStage(state);
  if (state.outcome !== null || state.turn !== 'enemy' || !stage) return state;
  const pool = enemyDeck(state.enemy.corpId).filter(card => !((state.enemy.cooldowns[card.id] ?? 0) > 0));
  const count = Math.min(pool.length, 1 + Math.floor(random() * battleRules.maxCards));
  const played: BattleCard[] = [];
  while (played.length < count) played.push(pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0]!);
  const factor = enemyStrength(stage, state.battle);
  const result = resolve(played.flatMap(card => card.effects), factor, state.block);
  // The counter cards you played last turn answer.
  const instant = instantBattle(played, factor, state.counters.map(playerCard).filter((card): card is PlayerCard => !!card));
  const damage = result.damage + instant.dealt;
  const credibility = Math.max(0, state.credibility - damage);
  const power = Math.max(0, Math.min(state.enemy.maxPower, state.enemy.power + result.healed) - instant.recoil);
  // An instant card that hits teaches you its answer.
  const learned = instant.hits.map(effect => effect.kind === 'instant' ? effect.counter : '')
    .filter(id => playerCard(id)?.learned && !state.owned.includes(id));
  const next: UtopiaGame = {
    ...state,
    credibility,
    block: result.damage + result.blocked > 0 ? 0 : state.block,
    counters: [],
    owned: learned.length ? [...state.owned, ...learned] : state.owned,
    credits: state.credits + instant.usedCounters.length * battleRules.credits.counter,
    enemy: {
      ...state.enemy,
      power,
      counters: countersOf(played),
      block: Math.min(battleRules.maxBlock, state.enemy.block + result.shield),
      cooldowns: restCards(state.enemy.cooldowns, played)
    },
    turn: 'player',
    log: logAttack(state, {
      by: 'enemy', corpId: state.enemy.corpId, cards: played.map(card => card.id), ...result, damage,
      recoil: instant.recoil, counteredBy: instant.counteredBy, learned
    }),
    stats: { ...state.stats, damageTaken: state.stats.damageTaken + damage, damageDealt: state.stats.damageDealt + instant.recoil }
  };
  if (credibility <= 0) return lose(next);
  return power <= 0 ? winBattle(next, random) : next;
}

/** One second of level 3: the clock runs, and the corporation answers your attack. Nothing happens once it is over. */
export function tickUtopia(state: UtopiaGame, random: () => number = Math.random): UtopiaGame {
  if (state.outcome !== null) return state;
  const next = { ...state, seconds: state.seconds + 1 };
  return next.turn === 'enemy' ? enemyAttack(next, random) : next;
}

// ---------- The end ----------

/** Credibility ran out: try again with full credibility, from the current station (or from the start). Credits and cards stay. */
export function retry(state: UtopiaGame, random: () => number = Math.random): UtopiaGame | null {
  if (state.outcome !== 'lost') return null;
  const stage = battleRules.retryFrom === 'campaign' ? 0 : state.stage;
  return startBattle({
    ...state,
    credibility: battleRules.maxCredibility,
    outcome: null,
    stats: { ...state.stats, attempts: state.stats.attempts + 1 }
  }, stage, 0, random);
}

/** Closes the "utopia achieved" dialog. */
export function dismissOutcome(state: UtopiaGame): UtopiaGame | null {
  return state.outcome === 'won' && !state.outcomeSeen ? { ...state, outcomeSeen: true } : null;
}

/** Level 3 in a few numbers. */
export function level3Summary(state: UtopiaGame): LevelSummary {
  const minutes = Math.round(state.seconds / 60);
  return {
    level: 3,
    title: 'Level 3 · Building utopia',
    facts: [
      { label: 'Time', value: minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min` },
      { label: 'Battles', value: `${state.wins + state.losses} (${state.wins} won, ${state.losses} lost)` },
      { label: 'Attempts', value: state.stats.attempts.toLocaleString('en-US') },
      { label: 'Cards played', value: state.stats.cardsPlayed.toLocaleString('en-US') },
      { label: 'Damage dealt', value: state.stats.damageDealt.toLocaleString('en-US') },
      { label: 'Damage taken', value: state.stats.damageTaken.toLocaleString('en-US') },
      { label: 'Credibility at the end', value: `${Math.round(state.credibility)}` }
    ]
  };
}

/** All three levels for the final summary; levels that were not played (disabled in the game config) are marked as such. */
export function gameSummary(state: UtopiaGame): LevelSummary[] {
  const skipped = (level: number, title: string): LevelSummary => ({ level, title, facts: [{ label: 'Skipped', value: 'No stats from this run' }] });
  const level1 = state.history.find(entry => entry.level === 1) ?? skipped(1, 'Level 1 · Building the platform');
  const level2 = state.history.find(entry => entry.level === 2) ?? skipped(2, 'Level 2 · Fixing the world');
  return [level1, level2, level3Summary(state)];
}

/** Numbers that glide between ticks: your credibility and the corporation's power. */
export const utopiaSmoothing: Smoothing<UtopiaGame> = {
  read: state => ({ credibility: state.credibility, power: state.enemy.power }),
  write: (state, values) => ({
    ...state,
    credibility: values['credibility'] ?? state.credibility,
    enemy: { ...state.enemy, power: values['power'] ?? state.enemy.power }
  })
};
