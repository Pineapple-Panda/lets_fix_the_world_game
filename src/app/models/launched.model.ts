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
  /** Programs running in the problem solving cards (e.g. Green World). */
  programs: ProgramState[];
  /** Programs that reached their milestone; they ended by themselves and cannot be started again. */
  completedPrograms: string[];
  /** A lawsuit against the platform, or null. While it runs, the Green World programs are frozen. */
  lawsuit: Lawsuit | null;
  /** Lawsuits filed so far; every new one costs and takes 20% more. */
  lawsuitsFiled: number;
  /** Outcome of the last court case, shown on the product card until the next lawsuit; null if there is none. */
  verdict: Verdict | null;
  /** Counters for the end-of-level summary. */
  stats: LaunchedStats;
  /** True once the player has seen the "world fixed" dialog. */
  victorySeen: boolean;
  /** Special events already shown (each one appears once). */
  eventsSeen: string[];
  /** The special event waiting for the player's choice, or null. */
  pendingEvent: string | null;
  /** Seconds the NSA has been a client in total. */
  nsaSeconds: number;
  /** Server slots lent to the UN for drought aid, and for how many more seconds. */
  aidSlots: number;
  aidSeconds: number;
}

/** A special event: a dialog with two choices. */
export interface SpecialEvent {
  id: string;
  title: string;
  text: string;
  accept: string;
  /** What accepting does, in a few words. */
  acceptEffect: string;
  decline: string;
  declineEffect: string;
}

/** How the level was played, shown when every problem is solved. */
export interface LaunchedStats {
  lawsuits: number;
  lawsuitsWon: number;
  lawsuitsLost: number;
  lawsuitsSettled: number;
  /** Clicks on "Talk to the protesters". */
  protestClicks: number;
  /** Seconds with a shady deal going on (a client or program that costs integrity or makes things worse). */
  dirtySeconds: number;
  /** Bags of Tegridy bought. */
  tegridyBags: number;
  /** Clicks on "Pitch to investors". */
  pitches: number;
}

/** How a fought lawsuit ended. */
export interface Verdict {
  /** Product that was sued. */
  product: string;
  plaintiff: string;
  won: boolean;
  /** Budget paid as damages (0 when won). */
  damages: number;
}

/** Someone drags you to court with a flimsy accusation. */
export interface Lawsuit {
  /** Index into `lawsuits` (plaintiff and accusation). */
  caseId: number;
  /** Seconds left in court once you decided to fight it; null while undecided. */
  courtSeconds: number | null;
}

/** A running program. While `resistance` is above 0, a protest blocks its progress. */
export interface ProgramState {
  id: string;
  /** Clicks still needed to talk the protesters round (0 = no protest). */
  resistance: number;
  /** Progress of the program's optimisation milestone in percent (0–100); only used by some programs. */
  milestone: number;
}

/** A long-running program in a problem solving card. */
export interface ProgramDefinition {
  id: string;
  /** Product whose card runs the program. */
  product: string;
  /** World problem the program works on. */
  problem: WorldProblem;
  name: string;
  detail: string;
  /** Budget to start the program. */
  cost: number;
  /** Budget per second while running; negative values are income. */
  upkeep: number;
  /** Solution progress (percentage points) per second, before the product version bonus. */
  rate: number;
  /** Integrity change per second while running. */
  integrity?: number;
  /** Server slots the program occupies at v1.x (default 1); multiplied by the product's major version. */
  slots?: number;
  /** Only startable at this integrity or more. */
  minIntegrity?: number;
  /** Only startable from this product version on (e.g. 1.1 or 2.0). */
  minVersion?: number;
  /** Only startable once the program's problem is solved to this percentage. */
  minProgress?: number;
  /** Only startable, and only makes progress, while these programs run (not in protest). */
  requiresPrograms?: string[];
  /** Only startable once total coding actions reach this value. */
  minActions?: number;
  /** Milestone progress in percent per second while the program runs (e.g. 1 = done after 100 s). */
  milestoneRate?: number;
  /** Epic that appears once the milestone reaches 100%. */
  unlocksEpic?: string;
  /** What the milestone bar measures, e.g. "Optimisation" (default "Progress"). */
  milestoneLabel?: string;
  /** Hidden until this epic is done. */
  requiresEpic?: string;
  /** While the program runs, lawsuits are this many times as likely. */
  lawsuitMultiplier?: number;
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
  /** Server slots the client rents at once (default 1). */
  slots?: number;
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
/** A flimsy accusation against one of your products. */
export interface LawsuitCase {
  /** Product whose programs the court freezes. */
  product: string;
  plaintiff: string;
  accusation: string;
  /** Only filed while this program runs, and then regardless of progress and integrity. */
  program?: string;
  /** Freezes these products instead of just `product` (a lawsuit against several applications). */
  products?: string[];
  /** Never drawn at random; only filed by a special event. */
  special?: boolean;
  /** Settlement and damages are this many times as high. */
  costFactor?: number;
}

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
  /** Budget price for perks that are bought rather than unlocked by actions. */
  cost?: number;
  /** Only offered once one of these products is activated. */
  requiresProducts?: string[];
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
  /** Only appears once this program has finished its milestone. */
  requiresProgram?: string;
  /** Can only be started with this perk. */
  requiresPerk?: string;
  /** One-time climate solution boost (percentage points) when the epic is done. */
  climateBoost?: number;
}
