/** Level 3: building a utopia while MegaCorp fights back. */

/** The utopia's bars, each in percent (0–100). */
export type UtopiaMetric = 'employment' | 'housing' | 'food';

export interface UtopiaGame {
  seconds: number;
  /** Total coding actions (TCA), budget and integrity carry over from level 2. */
  actions: number;
  budget: number;
  /** Integrity in percent (0–100). */
  integrity: number;
  /** TCA and budget gained every second: the averages level 2 ended with. */
  actionRate: number;
  budgetRate: number;
  /** Activated level 3 perks. */
  perks: string[];
  /** Current value of every bar in percent. */
  metrics: Record<UtopiaMetric, number>;
  /** Power of every corporation in percent; 0 means defeated. */
  corpPower: Record<string, number>;
  /** Seconds until each AI initiative can be used again. */
  cooldowns: Record<string, number>;
  /** Seconds until MegaCorp attacks again. */
  nextAttack: number;
  /** Latest MegaCorp attacks, newest first. */
  attackLog: string[];
  /** The battle currently shown in the arena, or null. */
  battle: Battle | null;
}

export interface Battle {
  corpId: string;
  round: number;
  /** Hit points of your AI system ("credibility") and of the corporation ("influence"). */
  playerHp: number;
  corpHp: number;
  /** What happened, newest first. */
  log: string[];
  /** Set once the battle is decided; its effects are already applied. */
  result: 'won' | 'lost' | null;
}

/** A bar of the utopia. */
export interface MetricDefinition {
  id: UtopiaMetric;
  name: string;
  /** Short explanation shown under the bar. */
  hint: string;
  start: number;
  /** Change per second without any help (negative: it erodes). */
  drift: number;
}

/** A move in battle: damage to the other side, or healing for yourself. */
export interface BattleMove {
  id: string;
  name: string;
  description: string;
  /** Damage range (inclusive) when it hits. */
  damage?: [number, number];
  /** Hit points restored. */
  heal?: number;
  /** Chance to hit, 0–1 (default 1). */
  accuracy?: number;
}

/** A MegaCorp attack outside of battle: lawsuits and defamation that lower your bars. */
export interface CorpAttack {
  name: string;
  /** Percentage points lost per bar at full corporation power. */
  effects: Partial<Record<UtopiaMetric, number>>;
  /** Integrity lost at full corporation power (defamation). */
  integrity?: number;
}

export interface Corporation {
  id: string;
  name: string;
  description: string;
  icon: string;
  moves: BattleMove[];
  attacks: CorpAttack[];
}

/** An action of your AI system that raises a bar, usable again after a cooldown. */
export interface Initiative {
  id: string;
  name: string;
  description: string;
  metric: UtopiaMetric;
  /** Percentage points gained per use. */
  gain: number;
  cooldown: number;
  /** Budget per use. */
  cost: number;
}

/** What a level 3 perk changes. Add a kind here and handle it in `utopia.ts` to create new effects. */
export type UtopiaPerkEffect =
  | { kind: 'battleDamage'; value: number }
  | { kind: 'initiativeGain'; value: number }
  | { kind: 'attackShield'; value: number }
  | { kind: 'driftShield'; value: number }
  | { kind: 'cooldown'; value: number };

export interface UtopiaPerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Total coding actions needed before it can be taken. */
  actionsRequired: number;
  /** Budget price. */
  cost: number;
  effect: UtopiaPerkEffect;
}
