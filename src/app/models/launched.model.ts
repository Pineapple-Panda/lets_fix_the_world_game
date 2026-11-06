/** An epic in progress or finished. Epics that were never started are not stored. */
export interface LaunchedEpic {
  id: string;
  /** Seconds of server time spent so far. */
  progress: number;
  done: boolean;
}

/** Level 2 state after "Launch Application". */
export interface LaunchedGame {
  actions: number;
  budget: number;
  /** Seconds played in level 2. */
  seconds: number;
  /** Action total at the last budget payout. */
  budgetActions: number;
  /** Activated level 2 perks. Level 1 perks do not carry over. */
  perks: string[];
  /** How many epics the server can process at the same time. */
  serverSlots: number;
  epics: LaunchedEpic[];
  /** Products released by completed world goals (e.g. Green World). */
  products: LaunchedProduct[];
  /**
   * Focus slider from -100 to 100: negative ships features (more actions),
   * positive monetises (more budget per new action), 0 is neutral.
   */
  focus: number;
  /** Clients currently renting a server slot (one slot each). */
  rentals: string[];
  /** Progress per world problem in percent (0–100). */
  worldProgress: Record<WorldProblem, number>;
  /** Integrity of the platform in percent (0–100); starts at 50. Clients push it up or down. */
  integrity: number;
}

/** The five problems the platform sets out to fix. */
export type WorldProblem = 'climate' | 'war' | 'hunger' | 'poverty' | 'corruption';

/** An organisation, government or billionaire that can rent a server slot. */
export interface RentalClient {
  id: string;
  name: string;
  description: string;
  /** Budget per second while the slot is rented. */
  income: number;
  /** Solution progress (percentage points) added to these problems every second while rented; negative slows them. */
  progress: Partial<Record<WorldProblem, number>>;
  /** Integrity points added every second while rented (negative lowers it). */
  integrity: number;
  /** The client only signs a contract while integrity is within these bounds (inclusive). */
  minIntegrity?: number;
  maxIntegrity?: number;
}

/** A released product (e.g. Green World). Its version can be raised later. */
export interface LaunchedProduct {
  /** Id of the product definition. */
  id: string;
  major: number;
  minor: number;
  active: boolean;
}

/** A product the platform releases once all of its world goals are reached. */
export interface ProductDefinition {
  id: string;
  name: string;
  /** World goals that must all be reached. */
  goals: string[];
}

export interface LaunchedPerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  actionsRequired: number;
}

/** A world goal; it is reached once all of its epics are done. */
export interface WorldGoal {
  id: string;
  name: string;
  /** World problems this goal makes progress on. */
  problems: WorldProblem[];
}

export interface EpicDefinition {
  id: string;
  /** World goal this epic belongs to. Epics of a goal build on each other in list order. */
  goal: string;
  title: string;
  detail: string;
  /** Budget needed to start the epic. */
  cost: number;
  /** Seconds of server time the epic needs. */
  duration: number;
}
