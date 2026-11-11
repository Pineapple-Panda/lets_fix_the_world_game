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

/** The colour scheme each effect belongs to. Removing a block, locking and shuffling hurt (damage); delaying the
 * opponent's cards protects (block); healing over time heals. What a card costs you does not change its colour. */
const effectCategory: Record<CardEffect['kind'], CardCategory | null> = {
  damage: 'damage', strip: 'damage', lock: 'damage', shuffle: 'damage',
  block: 'block', delay: 'block', heal: 'heal', regen: 'heal', instant: 'instant', counter: 'counter', selfDamage: null
};

/** A card's colour scheme: damage, block, heal, instant battle or counter, or combo when it does more than one of them. */
export function cardCategory(card: BattleCard): CardCategory {
  const kinds = [...new Set(card.effects.map(effect => effectCategory[effect.kind]).filter((kind): kind is CardCategory => !!kind))];
  return kinds.length === 1 ? kinds[0]! : kinds.length ? 'combo' : 'damage';
}

/**
 * What a card does in a few words, e.g. "12 damage · block 50%". `factor` scales damage and healing (corporations);
 * `wins` adds the per-win bonus of your cards.
 */
export function cardSummary(card: BattleCard, factor = 1, wins = 0): string {
  return card.effects.map(effect => {
    switch (effect.kind) {
      case 'damage': return `${Math.round((effect.amount + (effect.perWin ?? 0) * wins) * factor)} damage${effect.perWin ? ` (+${effect.perWin} per win)` : ''}`;
      case 'block': return `block ${effect.percent}%${(effect.attacks ?? 1) > 1 ? ` × ${effect.attacks} attacks` : ''}`;
      case 'strip': return 'removes their block';
      case 'selfDamage': return `costs you ${effect.amount}`;
      case 'regen': return `+${Math.round(effect.amount * factor)} heal × ${effect.turns} turns`;
      case 'delay': return `their strongest card rests +${effect.turns}`;
      case 'lock': return `locks ${effect.count} of your ${effect.count === 1 ? 'cards' : 'cards'}`;
      case 'shuffle': return 'shuffles your hand';
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
  return { corpId: stage.corpId, power: maxPower, maxPower, block: 0, blockAttacks: 0, counters: [], cooldowns: {} };
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
    ...state, stage, battle, enemy: newOpponent(stage, battle), hand: [], selected: [], cooldowns: {}, block: 0, blockAttacks: 0,
    counters: [], regen: [], locked: [], turn: 'player'
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
    blockAttacks: 0,
    counters: [],
    regen: [],
    locked: [],
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
  if (!playerTurn(state) || !state.hand.includes(id) || state.locked.includes(id)) return null;
  if (state.selected.includes(id)) return { ...state, selected: state.selected.filter(entry => entry !== id) };
  if (state.selected.length >= battleRules.maxCards) return null;
  return { ...state, selected: [...state.selected, id] };
}

interface Resolution {
  damage: number; blocked: number; healed: number; shield: number;
  /** For how many attacks the new block lasts, what playing the cards cost, and whether they removed the block. */
  shieldAttacks: number; selfDamage: number; strip: boolean;
}

/**
 * Adds up a set of cards: damage (scaled, plus the per-win bonus, minus the defender's block unless a card removes
 * it), healing (scaled), block and what the cards cost. Instant battle cards are settled on their own (instantBattle).
 */
function resolve(effects: CardEffect[], factor: number, defenderBlock: number, wins = 0): Resolution {
  let damage = 0, heal = 0, shield = 0, shieldAttacks = 0, selfDamage = 0, strip = false;
  for (const effect of effects) {
    if (effect.kind === 'damage') damage += effect.amount + (effect.perWin ?? 0) * wins;
    if (effect.kind === 'heal') heal += effect.amount;
    if (effect.kind === 'block') { shield += effect.percent; shieldAttacks = Math.max(shieldAttacks, effect.attacks ?? 1); }
    if (effect.kind === 'selfDamage') selfDamage += effect.amount;
    if (effect.kind === 'strip') strip = true;
  }
  const raw = Math.round(damage * factor);
  const blocked = strip ? 0 : Math.round(raw * defenderBlock / 100);
  return { damage: raw - blocked, blocked, healed: Math.round(heal * factor), shield, shieldAttacks, selfDamage, strip };
}

/** A block after an attack: one attack less if the attack did damage; gone when it has none left. */
function afterHit(block: number, attacks: number, hit: boolean): { block: number; blockAttacks: number } {
  if (!hit || block <= 0) return { block, blockAttacks: attacks };
  return attacks > 1 ? { block, blockAttacks: attacks - 1 } : { block: 0, blockAttacks: 0 };
}

/** A block with new blockers on top: the percents add up (to `maxBlock`), it lasts as long as the longest of them. */
function addBlock(current: { block: number; blockAttacks: number }, shield: number, attacks: number): { block: number; blockAttacks: number } {
  if (shield <= 0) return current;
  return { block: Math.min(battleRules.maxBlock, current.block + shield), blockAttacks: Math.max(current.blockAttacks, attacks) };
}

/** Delay: the corporation's strongest resting card (most damage) rests longer; if none rests, its strongest card starts resting. */
function delayCards(corpId: string, cooldowns: Record<string, number>, turns: number): { cooldowns: Record<string, number>; card?: BattleCard } {
  const strength = (card: BattleCard) => card.effects.reduce((total, effect) =>
    total + (effect.kind === 'damage' || effect.kind === 'instant' ? effect.amount : 0), 0);
  const deck = [...enemyDeck(corpId)].sort((a, b) => strength(b) - strength(a));
  const card = deck.find(entry => (cooldowns[entry.id] ?? 0) > 0) ?? deck[0];
  return card ? { cooldowns: { ...cooldowns, [card.id]: (cooldowns[card.id] ?? 0) + turns }, card } : { cooldowns };
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
  const effects = played.flatMap(card => card.effects);
  const result = resolve(effects, 1, state.enemy.block, state.wins);
  const armed = state.enemy.counters.map(id => enemyCard(state.enemy.corpId, id)).filter((card): card is BattleCard => !!card);
  const instant = instantBattle(played, 1, armed);
  const damage = result.damage + instant.dealt;
  const power = Math.max(0, state.enemy.power - damage);
  const credibility = Math.max(0, Math.min(battleRules.maxCredibility, state.credibility + result.healed) - instant.recoil - result.selfDamage);
  const notes: string[] = [];
  if (result.strip && state.enemy.block) notes.push('removed their block');
  if (result.selfDamage) notes.push(`cost you ${result.selfDamage}`);
  // Delay: its strongest card rests longer.
  let enemyCooldowns = state.enemy.cooldowns;
  for (const effect of effects) {
    if (effect.kind !== 'delay') continue;
    const delayed = delayCards(state.enemy.corpId, enemyCooldowns, effect.turns);
    enemyCooldowns = delayed.cooldowns;
    if (delayed.card) notes.push(`“${delayed.card.name}” rests ${effect.turns} longer`);
  }
  // Healing over time starts now and heals after each of its next attacks.
  const regen = [...state.regen, ...effects.flatMap(effect => effect.kind === 'regen' ? [{ amount: effect.amount, turns: effect.turns }] : [])];
  const hit = result.damage + result.blocked > 0;
  const next: UtopiaGame = {
    ...state,
    credibility,
    // A blocker counts down with every attack that does damage (removed at once by a strip card).
    // Its counters answered this attack (or not): they are gone. Yours now wait for its next attack.
    enemy: {
      ...state.enemy, power,
      ...(result.strip ? { block: 0, blockAttacks: 0 } : afterHit(state.enemy.block, state.enemy.blockAttacks, hit)),
      cooldowns: enemyCooldowns,
      counters: []
    },
    ...addBlock({ block: state.block, blockAttacks: state.blockAttacks }, result.shield, result.shieldAttacks),
    counters: countersOf(played),
    regen,
    locked: [],
    cooldowns: restCards(state.cooldowns, played),
    hand: state.hand.filter(id => !state.selected.includes(id)),
    selected: [],
    turn: 'enemy',
    enemyWait: battleRules.enemyDelay,
    log: logAttack(state, {
      by: 'player', corpId: state.enemy.corpId, cards: played.map(card => card.id),
      damage, blocked: result.blocked, healed: result.healed, shield: result.shield,
      recoil: instant.recoil, counteredBy: instant.counteredBy, notes
    }),
    stats: {
      ...state.stats, cardsPlayed: state.stats.cardsPlayed + played.length,
      damageDealt: state.stats.damageDealt + damage, damageTaken: state.stats.damageTaken + instant.recoil + result.selfDamage
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
  const effects = played.flatMap(card => card.effects);
  const result = resolve(effects, factor, state.block);
  // The counter cards you played last turn answer.
  const instant = instantBattle(played, factor, state.counters.map(playerCard).filter((card): card is PlayerCard => !!card));
  const damage = result.damage + instant.dealt;
  // Your healing over time works after each of its attacks.
  const healing = state.regen.reduce((total, entry) => total + entry.amount, 0);
  const afterDamage = Math.max(0, state.credibility - damage);
  const credibility = afterDamage > 0 ? Math.min(battleRules.maxCredibility, afterDamage + healing) : 0;
  const regen = state.regen.map(entry => ({ ...entry, turns: entry.turns - 1 })).filter(entry => entry.turns > 0);
  const power = Math.max(0, Math.min(state.enemy.maxPower, state.enemy.power + result.healed) - instant.recoil - result.selfDamage);
  const notes: string[] = [];
  if (result.strip && state.block) notes.push('removed your block');
  if (healing && afterDamage > 0) notes.push(`you heal ${healing}`);
  // An instant card that hits teaches you its answer.
  const learned = instant.hits.map(effect => effect.kind === 'instant' ? effect.counter : '')
    .filter(id => playerCard(id)?.learned && !state.owned.includes(id));
  const next: UtopiaGame = {
    ...state,
    credibility,
    ...(result.strip ? { block: 0, blockAttacks: 0 } : afterHit(state.block, state.blockAttacks, result.damage + result.blocked > 0)),
    regen,
    counters: [],
    owned: learned.length ? [...state.owned, ...learned] : state.owned,
    credits: state.credits + instant.usedCounters.length * battleRules.credits.counter,
    enemy: {
      ...state.enemy,
      power,
      counters: countersOf(played),
      ...addBlock({ block: state.enemy.block, blockAttacks: state.enemy.blockAttacks }, result.shield, result.shieldAttacks),
      cooldowns: restCards(state.enemy.cooldowns, played)
    },
    turn: 'player',
    log: logAttack(state, {
      by: 'enemy', corpId: state.enemy.corpId, cards: played.map(card => card.id),
      damage, blocked: result.blocked, healed: result.healed, shield: result.shield,
      recoil: instant.recoil, counteredBy: instant.counteredBy, learned, notes
    }),
    stats: { ...state.stats, damageTaken: state.stats.damageTaken + damage, damageDealt: state.stats.damageDealt + instant.recoil }
  };
  if (credibility <= 0) return lose(next);
  // Shuffle: your hand is drawn afresh; lock: random cards of your hand cannot be picked next turn.
  if (effects.some(effect => effect.kind === 'shuffle')) {
    next.hand = drawHand({ ...next, hand: [] }, random);
    notes.push('shuffled your hand');
  }
  const lockCount = effects.reduce((total, effect) => total + (effect.kind === 'lock' ? effect.count : 0), 0);
  if (lockCount) {
    const pool = [...next.hand];
    const locked: string[] = [];
    while (locked.length < lockCount && pool.length) locked.push(pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0]!);
    next.locked = locked;
    if (locked.length) notes.push(`locked ${locked.map(id => `“${playerCard(id)?.name ?? id}”`).join(', ')}`);
  }
  return power <= 0 ? winBattle(next, random) : next;
}

/**
 * One second of level 3: the clock runs, and the corporation answers your attack once `enemyWait` ticks have passed.
 * Nothing happens once it is over.
 */
export function tickUtopia(state: UtopiaGame, random: () => number = Math.random): UtopiaGame {
  if (state.outcome !== null) return state;
  const next = { ...state, seconds: state.seconds + 1 };
  if (next.turn !== 'enemy') return next;
  const wait = (next.enemyWait ?? 0) - 1;
  return wait > 0 ? { ...next, enemyWait: wait } : enemyAttack({ ...next, enemyWait: 0 }, random);
}

// ---------- The end ----------

/**
 * Game over: level 3 starts again from scratch. The campaign, wins, credits, bought and learned cards are gone; only
 * the time played, the losses and the counters of the final summary carry on.
 */
export function retry(state: UtopiaGame, random: () => number = Math.random): UtopiaGame | null {
  if (state.outcome !== 'lost') return null;
  const fresh = newUtopia(state.history, random);
  return {
    ...fresh,
    seconds: state.seconds,
    losses: state.losses,
    stats: { ...state.stats, attempts: state.stats.attempts + 1 }
  };
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
