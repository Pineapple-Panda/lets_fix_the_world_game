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
}

/** A product that a completed world goal releases. Its version can be raised later. */
export interface LaunchedProduct {
  /** World goal that released the product. */
  goal: string;
  major: number;
  minor: number;
  active: boolean;
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
  /** What the platform gains once every epic of the goal is shipped. */
  feature: string;
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
