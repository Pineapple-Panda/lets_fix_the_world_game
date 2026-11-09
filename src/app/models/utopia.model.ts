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
  /** TCA when level 3 started; perk thresholds count the actions gained since. */
  startActions: number;
  /** Current value of every bar in percent. */
  metrics: Record<UtopiaMetric, number>;
  /** Power of every corporation in percent; 0 means defeated. */
  corpPower: Record<string, number>;
  /** Initiatives that are built and can be started. */
  built: string[];
  /** Initiatives being built: seconds of building done so far. */
  building: Record<string, number>;
  /** Initiatives that are running. */
  running: string[];
  /** Seconds since MegaCorp showed itself; its counter initiatives launch one after another. */
  megacorpSeconds: number;
  /** Seconds until MegaCorp attacks again. */
  nextAttack: number;
  /** Latest MegaCorp attacks, newest first. */
  attackLog: string[];
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

/** A MegaCorp attack: lawsuits and defamation that lower your bars. */
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
  attacks: CorpAttack[];
}

/** A program of your AI system: started once, then it raises a bar every second while it runs and pays its upkeep. */
export interface Initiative {
  id: string;
  name: string;
  description: string;
  metric: UtopiaMetric;
  /** Budget to initialize (build) it. */
  cost: number;
  /** Seconds it takes to build before it can be started. */
  buildTime: number;
  /** Budget per second while it runs. */
  upkeep: number;
  /** Percentage points per second while it runs. */
  rate: number;
}

/** A MegaCorp program against the utopia: it pushes a bar down every second while its corporation has power. */
export interface CounterInitiative {
  id: string;
  corpId: string;
  name: string;
  description: string;
  metric: UtopiaMetric;
  /** Percentage points per second it takes at full corporation power. */
  rate: number;
  /** Seconds after MegaCorp shows itself before it starts. */
  launchAfter: number;
}

/** What a level 3 perk changes. Add a kind here and handle it in `utopia.ts` to create new effects. */
export type UtopiaPerkEffect =
  | { kind: 'initiativeGain'; value: number }
  | { kind: 'attackShield'; value: number }
  | { kind: 'driftShield'; value: number }
  | { kind: 'upkeep'; value: number }
  | { kind: 'unlock'; card: UtopiaCard };

/** Cards of level 3 that start hidden. */
export type UtopiaCard = 'utopia' | 'megacorp';

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
