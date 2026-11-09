import type { Battle, BattleMove, Corporation, UtopiaCard, UtopiaGame, UtopiaMetric, UtopiaPerk, UtopiaPerkEffect } from '../models/utopia.model.ts';
import {
  attackRules, battleRules, corporations, initiatives, integrityRules, metrics, playerMoves, utopiaPerks, utopiaStart
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
    corpPower: Object.fromEntries(corporations.map(corp => [corp.id, 100])),
    cooldowns: Object.fromEntries(initiatives.map(initiative => [initiative.id, 0])),
    nextAttack: attackRules.interval,
    attackLog: [],
    battle: null
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

/** The combined value of all activated perks of one kind (sums for damage, products for multipliers). */
export function perkValue(state: UtopiaGame, kind: ValueEffect['kind']): number {
  const values = utopiaPerks
    .filter(perk => state.perks.includes(perk.id) && perk.effect.kind === kind)
    .map(perk => (perk.effect as ValueEffect).value);
  return kind === 'battleDamage' ? values.reduce((total, value) => total + value, 0) : values.reduce((total, value) => total * value, 1);
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
 * One second of level 3: bars drift, initiatives cool down, and every few seconds MegaCorp attacks with a lawsuit
 * or a defamation campaign. Attacks pause while a battle is running.
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
    cooldowns: Object.fromEntries(Object.entries(state.cooldowns).map(([id, seconds]) => [id, Math.max(0, seconds - 1)]))
  };
  // MegaCorp only attacks once you know about it, and not during a battle.
  if (!cardUnlocked(state, 'megacorp') || (next.battle && !next.battle.result)) return next;
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

/** Points an initiative raises its bar by, with perks. */
export function initiativeGain(state: UtopiaGame, id: string): number {
  return (initiatives.find(entry => entry.id === id)?.gain ?? 0) * perkValue(state, 'initiativeGain');
}

/** Seconds an initiative needs to cool down, with perks. */
export function initiativeCooldown(state: UtopiaGame, id: string): number {
  return Math.ceil((initiatives.find(entry => entry.id === id)?.cooldown ?? 0) * perkValue(state, 'cooldown'));
}

export function canRunInitiative(state: UtopiaGame, id: string): boolean {
  const initiative = initiatives.find(entry => entry.id === id);
  return !!initiative && cardUnlocked(state, 'utopia') && (state.cooldowns[id] ?? 0) <= 0 && state.budget >= initiative.cost;
}

/** Uses an AI initiative: costs budget, raises its bar, then it needs to cool down. */
export function runInitiative(state: UtopiaGame, id: string): UtopiaGame | null {
  const initiative = initiatives.find(entry => entry.id === id);
  if (!initiative || !canRunInitiative(state, id)) return null;
  return {
    ...state,
    budget: state.budget - initiative.cost,
    metrics: shiftMetrics(state, { [initiative.metric]: initiativeGain(state, id) }, 1),
    cooldowns: { ...state.cooldowns, [id]: initiativeCooldown(state, id) }
  };
}

// ---------- Battle ----------

/** Whether you can challenge a corporation right now. */
export function canFight(state: UtopiaGame, corpId: string): boolean {
  return !!corporation(corpId) && cardUnlocked(state, 'megacorp') && (state.corpPower[corpId] ?? 0) > 0 && !(state.battle && !state.battle.result);
}

/** Opens a battle against a corporation in the arena. */
export function startBattle(state: UtopiaGame, corpId: string): UtopiaGame | null {
  if (!canFight(state, corpId)) return null;
  const corp = corporation(corpId)!;
  return {
    ...state,
    battle: {
      corpId,
      round: 1,
      playerHp: battleRules.playerHp,
      corpHp: battleRules.corpHp,
      log: [`${corp.name} accepts the challenge.`],
      result: null
    }
  };
}

/** How hard a corporation hits: weaker corporations hit softer. */
export function corpStrength(state: UtopiaGame, corpId: string): number {
  return battleRules.minimumStrength + (1 - battleRules.minimumStrength) * (state.corpPower[corpId] ?? 0) / 100;
}

/** Resolves one move: damage to the other side (if it hits) or healing. Returns the change and a log line. */
function resolveMove(move: BattleMove, actor: string, random: () => number, strength = 1, bonus = 0): { damage: number; heal: number; line: string } {
  if (move.heal) return { damage: 0, heal: move.heal, line: `${actor} uses ${move.name}: +${move.heal} HP.` };
  if (random() >= (move.accuracy ?? 1)) return { damage: 0, heal: 0, line: `${actor} tries ${move.name}, but it misses.` };
  const [low, high] = move.damage ?? [0, 0];
  const damage = Math.round((low + Math.floor(random() * (high - low + 1))) * strength) + bonus;
  return { damage, heal: 0, line: `${actor} uses ${move.name}: −${damage} HP.` };
}

/**
 * One round: your move, then (if it still stands) the corporation's answer. The battle ends when one side drops to
 * 0 HP. Winning costs the corporation 25% power; losing costs you 25 points on every bar (see `battleRules`).
 */
export function battleRound(state: UtopiaGame, moveId: string, random: () => number = Math.random): UtopiaGame | null {
  const battle = state.battle;
  const move = playerMoves.find(entry => entry.id === moveId);
  const corp = battle && corporation(battle.corpId);
  if (!battle || battle.result || !move || !corp) return null;
  const lines: string[] = [];
  const mine = resolveMove(move, 'Your AI', random, 1, perkValue(state, 'battleDamage'));
  let corpHp = Math.max(0, battle.corpHp - mine.damage);
  let playerHp = Math.min(battleRules.playerHp, battle.playerHp + mine.heal);
  lines.push(mine.line);
  if (corpHp > 0) {
    const answer = corp.moves[Math.min(corp.moves.length - 1, Math.floor(random() * corp.moves.length))]!;
    const theirs = resolveMove(answer, corp.name, random, corpStrength(state, corp.id));
    playerHp = Math.max(0, playerHp - theirs.damage);
    corpHp = Math.min(battleRules.corpHp, corpHp + theirs.heal);
    lines.push(theirs.line);
  }
  const result: Battle['result'] = corpHp <= 0 ? 'won' : playerHp <= 0 ? 'lost' : null;
  if (result) lines.push(result === 'won' ? `${corp.name} retreats. Its power drops by ${battleRules.winPowerLoss}%.` : `You lose. The utopia takes the hit.`);
  const next: UtopiaGame = {
    ...state,
    battle: { ...battle, round: battle.round + 1, playerHp, corpHp, result, log: [...lines.reverse(), ...battle.log].slice(0, battleRules.logLength) }
  };
  if (result === 'won') {
    next.corpPower = { ...state.corpPower, [corp.id]: Math.max(0, (state.corpPower[corp.id] ?? 0) - battleRules.winPowerLoss) };
    next.integrity = percent(state.integrity + integrityRules.battleWon);
  }
  if (result === 'lost') {
    next.metrics = shiftMetrics(state, battleRules.lossPenalty, -1);
    next.integrity = percent(state.integrity + integrityRules.battleLost);
  }
  return next;
}

/** Closes a decided battle and clears the arena. */
export function closeBattle(state: UtopiaGame): UtopiaGame | null {
  return state.battle?.result ? { ...state, battle: null } : null;
}
