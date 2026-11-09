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
  /** Seconds until MegaCorp plays its next card. */
  nextAttack: number;
  /** Latest cards MegaCorp played, newest first. */
  attackLog: PlayedCard[];
  /** Timed cards that are still running. */
  effects: ActiveEffect[];
  /** Seconds until each of your cards can be played again. */
  cardCooldowns: Record<string, number>;
  /** The duel shown in its dialog, or null. */
  duel: Duel | null;
  /** Seconds until the next duel can start. */
  duelCooldown: number;
  /** How level 3 ended: every bar at 100% (won) or one at 0% (lost); null while it runs. The game stops then. */
  outcome: 'won' | 'lost' | null;
  /** True once the player closed the "utopia achieved" dialog. */
  outcomeSeen: boolean;
}

/** A direct duel: a tug-of-war bar in a dialog. */
export interface Duel {
  startedBy: CardActor;
  /** Set once the bar reached 100% (won) or 0% (lost); its effects are already applied. */
  result: 'won' | 'lost' | null;
}

/** Who plays a card. */
export type CardActor = 'player' | 'megacorp';
/** Damage hurts the other side, a powerup helps the one who plays it. */
export type CardCategory = 'damage' | 'powerup';

/**
 * What a card does. Without a duration the amounts apply once; with a duration they apply every second
 * (powerShield and firewall simply hold for the duration).
 */
export type CardEffect =
  /** Change a utopia bar by this many percentage points. */
  | { kind: 'metric'; metric: UtopiaMetric; amount: number }
  /** Change your credibility. */
  | { kind: 'credibility'; amount: number }
  /** Change corporation power: the one that plays the card, the strongest one, or all of them. */
  | { kind: 'corpPower'; target: 'self' | 'strongest' | 'all'; amount: number }
  /** MegaCorp loses no power while it holds. */
  | { kind: 'powerShield' }
  /** Only this share of MegaCorp's card effects reaches you while it holds. */
  | { kind: 'firewall'; factor: number };

/** An action card for you or MegaCorp. */
export interface ActionCard {
  id: string;
  actor: CardActor;
  category: CardCategory;
  name: string;
  description: string;
  effects: CardEffect[];
  /** Seconds the card keeps working; one-time hit without it. */
  duration?: number;
  /** Your cards: seconds before it can be played again (until cards get a price). */
  cooldown?: number;
  /** MegaCorp cards: only this corporation plays it (any of them without). */
  corpId?: string;
  /** Your cards: needs a perk before it can be played (available from the start without). */
  locked?: boolean;
}

/** A card MegaCorp played, for the list of its latest moves. */
export interface PlayedCard {
  cardId: string;
  corpId: string;
}

/** A timed card that is still running. */
export interface ActiveEffect {
  cardId: string;
  /** The corporation that played it (MegaCorp cards). */
  corpId?: string;
  remaining: number;
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

export interface Corporation {
  id: string;
  name: string;
  description: string;
  icon: string;
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
  /** Multiplies the TCA and budget gained per second. */
  | { kind: 'rateBoost'; value: number }
  | { kind: 'unlock'; card: UtopiaCard }
  /** Makes one of your locked action cards playable. */
  | { kind: 'unlockAction'; action: string };

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
