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
}

export interface LaunchedPerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  actionsRequired: number;
}

export interface EpicDefinition {
  id: string;
  title: string;
  detail: string;
  /** Budget needed to start the epic. */
  cost: number;
  /** Seconds of server time the epic needs. */
  duration: number;
}
