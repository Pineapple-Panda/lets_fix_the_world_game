import type { Game } from '../models/game.model.ts';
import type {
  EpicDefinition, LaunchedGame, LaunchedPerk, LaunchedProduct, ProductDefinition, ProgramDefinition, ProgramState,
  RentalClient, WorldProblem
} from '../models/launched.model.ts';
import { epics, launchedPerks, products, programs, rentalClients, worldGoals } from './launched-content.ts';

/** Coverage units (1/1000 percentage point) required before the application can launch: 100%. */
export const launchCoverage = 100000;
export const minActionsPerSecond = 50;
export const maxActionsPerSecond = 300;
/** Every this many seconds the budget grows by the new actions times `budgetPerAction`. */
export const budgetInterval = 5;
export const budgetPerAction = 1;
/** Perk that brings the server (and with it the epics) into play. */
export const serverPerk = 'workflow-abstraction';

/** True once Earl reports full test coverage. */
export function canLaunch(game: Game): boolean {
  return game.activatedPerks.includes('earl') && game.testCoverage >= launchCoverage;
}

/** Reduces the level 1 game to the level 2 state: only actions and budget survive, level 1 perks are gone. */
export function launch(game: Game): LaunchedGame | null {
  if (!canLaunch(game)) return null;
  return {
    actions: game.actions,
    budget: game.budget,
    seconds: 0,
    budgetActions: game.actions,
    perks: [],
    serverSlots: 1,
    epics: [],
    products: [],
    focus: 0,
    rentals: [],
    worldProgress: noProgress(),
    integrity: startIntegrity,
    programs: []
  };
}

/** Starting values when level 1 is skipped with the dev button. */
export const skipLevelActions = 34000;
export const skipLevelBudget = 3000;

/** Dev shortcut: a fresh level 2 state without playing level 1. */
export function skippedLevelTwo(): LaunchedGame {
  return {
    actions: skipLevelActions,
    budget: skipLevelBudget,
    seconds: 0,
    budgetActions: skipLevelActions,
    perks: [],
    serverSlots: 1,
    epics: [],
    products: [],
    focus: 0,
    rentals: [],
    worldProgress: noProgress(),
    integrity: startIntegrity,
    programs: []
  };
}

/** Every problem at 0%. */
export function noProgress(): Record<WorldProblem, number> {
  return { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 };
}

/** Solution progress (percentage points) each finished epic adds to its problems. */
export const epicProgress = 1.5;
/** Integrity at the start of level 2. */
export const startIntegrity = 50;

const percent = (value: number) => Math.max(0, Math.min(100, value));

const cap = (value: number) => Math.min(Number.MAX_SAFE_INTEGER, value);

/*
 * Focus slider: a trade-off between shipping features (left) and monetising (right).
 *   fully left:  actions +50% × focus power, budget per new action drops to 0
 *   centre:      no effect
 *   fully right: budget per new action +100% × focus power, actions -50%
 * In between the effects change linearly. Only the bonuses grow with focus power (Add Server);
 * the penalties stay at their fixed limits.
 */
export const focusLimit = 100;
export const maxActionBoost = 0.5;
export const maxBudgetBoost = 1;
/** Actions lost with the slider fully on "monetise". */
export const maxActionPenalty = 0.5;
/** Budget lost with the slider fully on "ship features" (all of it). */
export const maxBudgetPenalty = 1;

const clampFocus = (focus: number) => Math.max(-focusLimit, Math.min(focusLimit, Math.round(focus)));

/** How strong the slider's bonuses are: every server added with Add Server adds one step (×2, ×3, ×4, …). */
export function focusPower(state: LaunchedGame): number {
  return 1 + addedServers(state);
}

/** Multiplier for actions per second: ×1.5 fully left (more with Add Server), ×0.5 fully right. */
export function actionBoost(state: LaunchedGame): number {
  const focus = clampFocus(state.focus) / focusLimit;
  return focus <= 0
    ? 1 + maxActionBoost * focusPower(state) * -focus
    : 1 - maxActionPenalty * focus;
}

/** Multiplier for the budget payout: ×2 fully right (more with Add Server), ×0 fully left. */
export function budgetBoost(state: LaunchedGame): number {
  const focus = clampFocus(state.focus) / focusLimit;
  return focus >= 0
    ? 1 + maxBudgetBoost * focusPower(state) * focus
    : 1 - maxBudgetPenalty * -focus;
}

/** Moves the focus slider; values are clamped to -100…100. */
export function setFocus(state: LaunchedGame, focus: number): LaunchedGame | null {
  if (!Number.isFinite(focus)) return null;
  const next = clampFocus(focus);
  return next === state.focus ? null : { ...state, focus: next };
}

/**
 * One second in level 2: actions grow by 50–300 (scaled by the focus slider), running epics advance by one second of server time,
 * and every 5 seconds the budget grows by the actions gained since the last payout (times `budgetPerAction` and the slider).
 */
/** Dev mode: epics take at most this many seconds. */
export const devEpicDuration = 5;
export const devBoostActions = 1000000;
export const devBoostBudget = 1000000;

/** Seconds an epic needs; capped at 5 in dev mode. */
/** Perk that halves every epic's server time. */
export const dataCentersPerk = 'data-centers';

/** Seconds an epic needs: halved (rounded up) after migrating to data centres, capped at 5 in dev mode. */
export function epicDuration(epic: EpicDefinition, fastEpics = false, dataCenters = false): number {
  const duration = dataCenters ? Math.ceil(epic.duration / 2) : epic.duration;
  return fastEpics ? Math.min(devEpicDuration, duration) : duration;
}

/**
 * Dev shortcut: +1,000,000 actions and +1,000,000 budget. The extra actions are not paid out as budget again.
 */
export function devBoost(state: LaunchedGame): LaunchedGame {
  return {
    ...state,
    actions: cap(state.actions + devBoostActions),
    budgetActions: cap(state.budgetActions + devBoostActions),
    budget: cap(state.budget + devBoostBudget)
  };
}

export function tickLaunched(
  state: LaunchedGame,
  random: () => number = Math.random,
  fastEpics = false
): LaunchedGame {
  const base = minActionsPerSecond + Math.floor(random() * (maxActionsPerSecond - minActionsPerSecond + 1));
  const gained = Math.round(base * actionBoost(state));
  const next: LaunchedGame = {
    ...state,
    actions: cap(state.actions + gained),
    seconds: state.seconds + 1,
    epics: state.epics.map(epic => {
      if (epic.done) return epic;
      const progress = epic.progress + 1;
      const definition = epicDefinition(epic.id);
      return { ...epic, progress, done: progress >= (definition ? epicDuration(definition, fastEpics, state.perks.includes(dataCentersPerk)) : 0) };
    })
  };
  if (next.seconds % budgetInterval === 0) {
    next.budget = cap(next.budget + Math.round((next.actions - next.budgetActions) * budgetPerAction * budgetBoost(next)));
    next.budgetActions = next.actions;
  }
  // Rented slots pay every second, nudge the solution progress a tiny bit and move integrity.
  next.budget = cap(next.budget + rentalIncome(next));
  const progress = { ...next.worldProgress };
  for (const id of next.rentals) {
    const client = rentalClient(id);
    if (!client) continue;
    for (const [problem, delta] of Object.entries(client.progress) as [WorldProblem, number][]) {
      progress[problem] = percent(progress[problem] + delta);
    }
    next.integrity = percent(next.integrity + client.integrity);
  }
  // Epics that just finished add a fixed amount of solution progress to each of their problems.
  const finished = next.epics.filter(epic => epic.done && !state.epics.find(before => before.id === epic.id)?.done);
  for (const entry of finished) {
    const epic = epicDefinition(entry.id);
    const goal = epic && worldGoals.find(candidate => candidate.id === epic.goal);
    if (!epic || !goal) continue;
    const share = epicProgress;
    for (const problem of goal.problems) progress[problem] = percent(progress[problem] + share);
  }
  next.worldProgress = progress;
  runPrograms(next, random);
  // A product is released (at version 1.0) once all of its world goals are reached.
  const released = products
    .filter(definition => definition.goals.every(goal => goalComplete(next, goal)) && !product(next, definition.id))
    .map((definition): LaunchedProduct => ({ id: definition.id, major: 1, minor: 0, active: false }));
  if (released.length) next.products = [...next.products, ...released];
  return next;
}

export function product(state: LaunchedGame, id: string): LaunchedProduct | undefined {
  return state.products.find(entry => entry.id === id);
}

export function productDefinition(id: string): ProductDefinition | undefined {
  return products.find(definition => definition.id === id);
}

/** The product a world goal contributes to. */
export function productForGoal(goal: string): ProductDefinition | undefined {
  return products.find(definition => definition.goals.includes(goal));
}

/** Display name of a released product, e.g. "Green World v1.0". */
export function productTitle(released: LaunchedProduct): string {
  return `${productDefinition(released.id)?.name ?? released.id} v${released.major}.${released.minor}`;
}

/** Switches a released product on. It has no effect yet; what it does is still to be defined. */
export function activateProduct(state: LaunchedGame, id: string): LaunchedGame | null {
  const released = product(state, id);
  if (!released || released.active) return null;
  return { ...state, products: state.products.map(entry => entry.id === id ? { ...entry, active: true } : entry) };
}

export function launchedPerkUnlocked(state: LaunchedGame, perk: LaunchedPerk): boolean {
  return state.actions >= perk.actionsRequired;
}

/** The repeatable "Add Server" perk: bought with budget, 100,000 for the first server, 10% more for each further one. */
export const addServerPerkId = 'add-server';
export const addServerBasePrice = 100000;
export const addServerPriceStep = 1.1;

/** Budget price of the next server: 100,000 × 1.1 per server already added (rounded). */
export function addServerPrice(state: LaunchedGame): number {
  return Math.round(addServerBasePrice * addServerPriceStep ** addedServers(state));
}

/** Servers bought with the Add Server perk (the first slot comes with the workflow perk). */
export function addedServers(state: LaunchedGame): number {
  return Math.max(0, state.serverSlots - 1);
}

/** The next Add Server perk, priced by how many servers were already added. */
export function addServerPerk(state: LaunchedGame): LaunchedPerk {
  return {
    id: addServerPerkId,
    name: 'Add Server',
    description: 'Rack another server: +1 slot, so one more epic can run at the same time. Each server costs 10% more than the last.',
    icon: 'SV',
    actionsRequired: 0,
    cost: addServerPrice(state)
  };
}

/** Level 2 perks that are not activated yet, in unlock order. Add Server is always offered again. */
export function openLaunchedPerks(state: LaunchedGame): LaunchedPerk[] {
  return [
    ...launchedPerks.filter(perk => !state.perks.includes(perk.id)),
    addServerPerk(state),
    // The Tegridy deal is offered once Network & Financing is open.
    ...(networkOnline(state) && !tegridyActive(state) ? [tegridyPerk] : []),
    // The robots are only offered while EdisonX is a client.
    ...(state.rentals.includes(robotClient) && !state.perks.includes(robotPerk.id) ? [robotPerk] : [])
  ].sort((a, b) => a.actionsRequired - b.actionsRequired);
}

/**
 * One-time deal with a small family farm in Colorado (1,000,000 budget). Afterwards integrity can be bought
 * by the bag in Network & Financing: +1 integrity for 100,000 budget, as often as you like.
 */
export const tegridyPerk: LaunchedPerk = {
  id: 'tegridy-farms',
  name: 'Tegridy Farms Supply Deal',
  description: 'Sign an exclusive deal with a small family farm in Colorado. Nobody asks how their integrity is grown.',
  icon: 'TF',
  actionsRequired: 0,
  cost: 1000000
};
export const tegridyBagCost = 100000;
export const tegridyBagIntegrity = 1;

export function tegridyActive(state: LaunchedGame): boolean {
  return state.perks.includes(tegridyPerk.id);
}

export function canBuyTegridy(state: LaunchedGame): boolean {
  return tegridyActive(state) && state.budget >= tegridyBagCost && state.integrity < 100;
}

/** "Buy some Tegridy": +1 integrity for 100,000 budget. */
export function buyTegridy(state: LaunchedGame): LaunchedGame | null {
  if (!canBuyTegridy(state)) return null;
  return {
    ...state,
    budget: state.budget - tegridyBagCost,
    integrity: Math.min(100, state.integrity + tegridyBagIntegrity)
  };
}

/** Whether a perk can be taken right now: enough actions, enough budget for bought perks, and its prerequisites. */
export function launchedPerkAvailable(state: LaunchedGame, perk: LaunchedPerk): boolean {
  if (perk.id === addServerPerkId) return serverOnline(state) && state.budget >= (perk.cost ?? 0);
  if (perk.id === robotPerk.id) {
    return state.rentals.includes(robotClient) && !state.perks.includes(robotPerk.id) &&
      launchedPerkUnlocked(state, perk) && state.budget >= (perk.cost ?? 0);
  }
  if (perk.id === tegridyPerk.id) return networkOnline(state) && !tegridyActive(state) && state.budget >= (perk.cost ?? 0);
  // Regular perks unlock by actions; some also have a budget price.
  return launchedPerkUnlocked(state, perk) && state.budget >= (perk.cost ?? 0);
}

/** Perk that opens the Network & Financing card. */
export const networkPerk = 'network-financing';

/** The Network & Financing desk (bottom left of the grid) opens with the "Who Pays for All This?" perk. */
export function networkOnline(state: LaunchedGame): boolean {
  return state.perks.includes(networkPerk);
}

export function activateLaunchedPerk(state: LaunchedGame, id: string): LaunchedGame | null {
  if (id === robotPerk.id) {
    if (!launchedPerkAvailable(state, robotPerk)) return null;
    return { ...state, budget: state.budget - (robotPerk.cost ?? 0), perks: [...state.perks, id] };
  }
  if (id === tegridyPerk.id) {
    if (!launchedPerkAvailable(state, tegridyPerk)) return null;
    return { ...state, budget: state.budget - (tegridyPerk.cost ?? 0), perks: [...state.perks, id] };
  }
  if (id === addServerPerkId) {
    // Adding a server only makes sense once there is a server to extend.
    const perk = addServerPerk(state);
    if (!launchedPerkAvailable(state, perk)) return null;
    return { ...state, budget: state.budget - (perk.cost ?? 0), serverSlots: state.serverSlots + 1 };
  }
  const perk = launchedPerks.find(entry => entry.id === id);
  if (!perk || state.perks.includes(id) || !launchedPerkAvailable(state, perk)) return null;
  return { ...state, budget: state.budget - (perk.cost ?? 0), perks: [...state.perks, id] };
}

/** The server and its epics appear once the workflow is abstracted. */
export function serverOnline(state: LaunchedGame): boolean {
  return state.perks.includes(serverPerk);
}

export function epicDefinition(id: string): EpicDefinition | undefined {
  return epics.find(epic => epic.id === id);
}

export function runningEpics(state: LaunchedGame): number {
  return state.epics.filter(epic => !epic.done).length;
}

/** Server slots taken by running epics and rented clients. */
export function usedSlots(state: LaunchedGame): number {
  return runningEpics(state) + rentedSlots(state) + programSlots(state);
}

// ---------- Problem solving cards: programs, integrity and protests ----------

/** Below this integrity the population distrusts the programs and protests can break out. */
export const protestIntegrity = 50;
/** Chance per program and second of a protest at 0% integrity (it falls linearly to 0 at 50%). */
export const maxProtestChance = 0.02;
/** Each product upgrade (v1.0 → v1.1 → …) makes its programs this much stronger. */
export const upgradeBonus = 0.25;
/** Budget for the next product upgrade: 500,000 × the next minor version. */
export const upgradeCostStep = 500000;

export function programDefinition(id: string): ProgramDefinition | undefined {
  return programs.find(program => program.id === id);
}

export function programSlots(state: LaunchedGame): number {
  return state.programs.reduce((total, entry) => total + (programDefinition(entry.id)?.slots ?? 0), 0);
}

/** A product's card works only once the product is active. */
export function productActive(state: LaunchedGame, id: string): boolean {
  return !!product(state, id)?.active;
}

/** At 0% integrity nobody cooperates: nothing can be started and nothing runs. */
export function integrityBlocked(state: LaunchedGame): boolean {
  return state.integrity <= 0;
}

/** A new protest needs this many clicks to resolve. */
export const protestResistance = 20;
/** Distrust can push a protest's resistance up to this many clicks, but not further. */
export const maxResistance = 100;
/** At 0% integrity a protest's resistance grows by this much per second (linearly less up to 50%). */
export const maxResistanceGrowth = 2;
/** Client whose riot-control robots resolve protests automatically. */
export const robotClient = 'edisonx';
/** Resistance the robots remove from every protest per second. */
export const robotPower = 5;

/** How much a protest's resistance grows per second: the lower the integrity, the faster. */
export function resistanceGrowth(state: LaunchedGame): number {
  if (state.integrity >= protestIntegrity) return 0;
  return maxResistanceGrowth * (protestIntegrity - state.integrity) / protestIntegrity;
}

/** Riot-control robots on site: available while EdisonX rents a slot. */
export function robotsOnSite(state: LaunchedGame): boolean {
  return state.perks.includes(robotPerk.id) && state.rentals.includes(robotClient);
}

/**
 * EdisonX's riot-control robots: offered only while EdisonX rents a slot (5,000,000 TCA, 2,000,000 budget),
 * and they only operate while EdisonX is still a client.
 */
export const robotPerk: LaunchedPerk = {
  id: 'edisonx-robots',
  name: 'EdisonX Riot-Control Robots',
  description: 'Polite, tireless and very large. They clear protests automatically, as long as EdisonX is your client.',
  icon: 'RB',
  actionsRequired: 5000000,
  cost: 2000000
};

export function inProtest(entry: ProgramState): boolean {
  return entry.resistance > 0;
}

/** Chance per second that a running program is hit by a protest. */
export function protestChance(state: LaunchedGame): number {
  if (state.integrity >= protestIntegrity) return 0;
  return maxProtestChance * (protestIntegrity - state.integrity) / protestIntegrity;
}

/** Multiplier on program output from product upgrades: v1.0 ×1, v1.1 ×1.25, v1.2 ×1.5 … */
export function programBoost(state: LaunchedGame, productId: string): number {
  const released = product(state, productId);
  return released ? 1 + upgradeBonus * (released.minor + (released.major - 1) * 10) : 1;
}

/** Why a program cannot start right now, or null when it can. */
export function programBlocker(state: LaunchedGame, id: string): string | null {
  const program = programDefinition(id);
  if (!program) return 'Unknown program';
  if (!productActive(state, program.product)) return 'Activate the product first';
  if (state.programs.some(entry => entry.id === id)) return 'Already running';
  if (integrityBlocked(state)) return 'Integrity is 0%: nobody cooperates';
  if (program.minIntegrity !== undefined && state.integrity < program.minIntegrity) {
    return `Needs ${program.minIntegrity}% integrity`;
  }
  const released = product(state, program.product);
  if (program.minMinor !== undefined && (released?.minor ?? 0) < program.minMinor) {
    return `Needs v${released?.major ?? 1}.${program.minMinor}`;
  }
  if ((program.slots ?? 0) > 0 && usedSlots(state) + (program.slots ?? 0) > state.serverSlots) {
    return `Needs ${program.slots} free server ${program.slots === 1 ? 'slot' : 'slots'}`;
  }
  if (state.budget < program.cost) return 'Not enough budget';
  return null;
}

export function startProgram(state: LaunchedGame, id: string): LaunchedGame | null {
  const program = programDefinition(id);
  if (!program || programBlocker(state, id)) return null;
  return { ...state, budget: state.budget - program.cost, programs: [...state.programs, { id, resistance: 0 }] };
}

export function stopProgram(state: LaunchedGame, id: string): LaunchedGame | null {
  if (!state.programs.some(entry => entry.id === id)) return null;
  return { ...state, programs: state.programs.filter(entry => entry.id !== id) };
}

/** One click on "Talk to the protesters": resistance -1. At 0 the protest is over and the program continues. */
export function resolveProtest(state: LaunchedGame, id: string): LaunchedGame | null {
  if (!state.programs.some(entry => entry.id === id && inProtest(entry))) return null;
  return {
    ...state,
    programs: state.programs.map(entry => entry.id === id ? { ...entry, resistance: lowerResistance(entry.resistance, 1) } : entry)
  };
}

/** Lowers resistance; anything below one click counts as resolved. */
function lowerResistance(resistance: number, by: number): number {
  const rest = resistance - by;
  return rest < 1e-9 ? 0 : rest;
}

/** Whether a running program can pay this second's upkeep (income programs always can). */
export function programFunded(state: LaunchedGame, id: string): boolean {
  const program = programDefinition(id);
  return !!program && (program.upkeep <= 0 || state.budget >= program.upkeep);
}

/**
 * One second of all running programs (mutates `next`): at 0% integrity everything is frozen. Below 50%
 * protests can break out; a protested program makes no progress until the protest is resolved. A program
 * that cannot pay its upkeep pauses for that second.
 */
function runPrograms(next: LaunchedGame, random: () => number): void {
  if (!next.programs.length || integrityBlocked(next)) return;
  const chance = protestChance(next);
  const growth = resistanceGrowth(next);
  const robots = robotsOnSite(next) ? robotPower : 0;
  const progress = { ...next.worldProgress };
  next.programs = next.programs.map(entry => {
    const program = programDefinition(entry.id);
    if (!program) return entry;
    // A protest grows with distrust and shrinks while robots are on site; the program waits meanwhile.
    if (inProtest(entry)) {
      return { ...entry, resistance: lowerResistance(Math.min(maxResistance, entry.resistance + growth), robots) };
    }
    if (chance > 0 && random() < chance) return { ...entry, resistance: protestResistance };
    if (!programFunded(next, entry.id)) return entry;
    next.budget = cap(Math.max(0, next.budget - program.upkeep));
    progress[program.problem] = percent(progress[program.problem] + program.rate * programBoost(next, program.product));
    if (program.integrity) next.integrity = percent(next.integrity + program.integrity);
    return entry;
  });
  next.worldProgress = progress;
}

/** Budget for the next product version (v1.0 → v1.1 costs 500,000, v1.1 → v1.2 1,000,000, …). */
export function upgradeCost(state: LaunchedGame, productId: string): number {
  return upgradeCostStep * ((product(state, productId)?.minor ?? 0) + 1);
}

/** Raises an active product's version by 0.1; at v1.9 the next step is v2.0. */
export function upgradeProduct(state: LaunchedGame, productId: string): LaunchedGame | null {
  const released = product(state, productId);
  const cost = upgradeCost(state, productId);
  if (!released?.active || integrityBlocked(state) || state.budget < cost) return null;
  const minor = released.minor === 9 ? 0 : released.minor + 1;
  const major = released.minor === 9 ? released.major + 1 : released.major;
  return {
    ...state,
    budget: state.budget - cost,
    products: state.products.map(entry => entry.id === productId ? { ...entry, major, minor } : entry)
  };
}

/** Server slots taken by rental contracts (some clients rent several at once). */
export function rentedSlots(state: LaunchedGame): number {
  return state.rentals.reduce((total, id) => total + (rentalClient(id)?.slots ?? 1), 0);
}

/** Share of server slots in use, 0–1. */
export function serverLoad(state: LaunchedGame): number {
  return state.serverSlots > 0 ? Math.min(1, usedSlots(state) / state.serverSlots) : 1;
}

export function rentalClient(id: string): RentalClient | undefined {
  return rentalClients.find(client => client.id === id);
}

/** Budget per second from all rented slots. */
export function rentalIncome(state: LaunchedGame): number {
  return state.rentals.reduce((total, id) => total + (rentalClient(id)?.income ?? 0), 0);
}

/** Solution progress per second the current clients add to a problem (negative slows it down). */
export function rentalProgress(state: LaunchedGame, problem: WorldProblem): number {
  return state.rentals.reduce((total, id) => total + (rentalClient(id)?.progress[problem] ?? 0), 0);
}

/** Whether a client is willing to sign at the current integrity. Running contracts are not affected. */
export function clientAvailable(state: LaunchedGame, id: string): boolean {
  const client = rentalClient(id);
  return !!client &&
    (client.minIntegrity === undefined || state.integrity >= client.minIntegrity) &&
    (client.maxIntegrity === undefined || state.integrity <= client.maxIntegrity);
}

/** Renting needs Network & Financing, a free server slot and a willing client; each client rents at most one slot. */
export function canRentSlot(state: LaunchedGame, id: string): boolean {
  const slots = rentalClient(id)?.slots ?? 1;
  return clientAvailable(state, id) && networkOnline(state) && !state.rentals.includes(id) &&
    usedSlots(state) + slots <= state.serverSlots;
}

export function rentSlot(state: LaunchedGame, id: string): LaunchedGame | null {
  if (!canRentSlot(state, id)) return null;
  return { ...state, rentals: [...state.rentals, id] };
}

/** Ends a rental contract and frees its slot. */
export function endRental(state: LaunchedGame, id: string): LaunchedGame | null {
  if (!state.rentals.includes(id)) return null;
  return { ...state, rentals: state.rentals.filter(entry => entry !== id) };
}

/** The epics of a world goal, in the order they build on each other. */
export function goalEpics(goal: string): EpicDefinition[] {
  return epics.filter(epic => epic.goal === goal);
}

export function epicDone(state: LaunchedGame, id: string): boolean {
  return state.epics.some(entry => entry.id === id && entry.done);
}

/**
 * All epics of a system (product) in the order they have to be done: goal by goal, e.g. war then corruption
 * for Peace & Integrity. Different systems can run in parallel; within a system it is one epic after another.
 */
export function systemEpics(epicId: string): EpicDefinition[] {
  const epic = epicDefinition(epicId);
  if (!epic) return [];
  const goals = productForGoal(epic.goal)?.goals ?? [epic.goal];
  return goals.flatMap(goal => goalEpics(goal));
}

/** The epic that has to be done before this one (the previous one in its system), if any. */
export function previousEpic(id: string): EpicDefinition | undefined {
  const chain = systemEpics(id);
  return chain[chain.findIndex(epic => epic.id === id) - 1];
}

/** An epic becomes available once the previous epic of its system is done (the first one right away). */
export function epicUnlocked(state: LaunchedGame, id: string): boolean {
  if (!epicDefinition(id)) return false;
  const previous = previousEpic(id);
  return !previous || epicDone(state, previous.id);
}

/** A world goal is reached once all of its epics are done. Goals without epics are never reached. */
export function goalComplete(state: LaunchedGame, goal: string): boolean {
  const chain = goalEpics(goal);
  return chain.length > 0 && chain.every(epic => epicDone(state, epic.id));
}

export function canStartEpic(state: LaunchedGame, id: string): boolean {
  const epic = epicDefinition(id);
  return !!epic &&
    serverOnline(state) &&
    epicUnlocked(state, id) &&
    !state.epics.some(entry => entry.id === id) &&
    usedSlots(state) < state.serverSlots &&
    state.budget >= epic.cost;
}

/** Pays for an epic and puts it on the server. */
export function startEpic(state: LaunchedGame, id: string): LaunchedGame | null {
  const epic = epicDefinition(id);
  if (!epic || !canStartEpic(state, id)) return null;
  return { ...state, budget: state.budget - epic.cost, epics: [...state.epics, { id, progress: 0, done: false }] };
}
