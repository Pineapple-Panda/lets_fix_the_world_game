/**
 * Building blocks the models of all three levels share. Level models extend these instead of repeating the same
 * fields: every perk is a `BasePerk`, every program or initiative a `RunningProgram`, and so on.
 */

/** Anything the player sees with a name and a short description. */
export interface Described {
  id: string;
  name: string;
  description: string;
}

/** A perk: unlocked once total coding actions (TCA) reach a threshold, shown with a short icon. */
export interface BasePerk extends Described {
  icon: string;
  /** Total coding actions needed before it can be taken. */
  actionsRequired: number;
}

/** A perk that also costs budget. */
export interface BoughtPerk extends BasePerk {
  cost: number;
}

/** Something that runs continuously: started for a price, then it costs upkeep and moves a bar every second. */
export interface RunningProgram extends Described {
  /** Budget to start (or build) it. */
  cost: number;
  /** Budget per second while it runs; negative values are income. */
  upkeep: number;
  /** Percentage points per second it adds to its bar, before bonuses. */
  rate: number;
}

/** A labelled value, e.g. in a summary. */
export interface Fact {
  label: string;
  value: string;
}

/** What happened in one level, frozen when the player moves on. Shown when level 3 is won. */
export interface LevelSummary {
  level: number;
  title: string;
  facts: Fact[];
}
