import type { Game } from '../models/game.model.ts';
import type {
  EpicDefinition, LaunchedGame, LaunchedPerk, LaunchedProduct, ProductDefinition, RentalClient, WorldProblem
} from '../models/launched.model.ts';
import { epics, launchedPerks, products, rentalClients, worldGoals } from './launched-content.ts';

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
    integrity: startIntegrity
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
    integrity: startIntegrity
  };
}

/** Every problem at 0%. */
export function noProgress(): Record<WorldProblem, number> {
  return { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 };
}

/** A complete epic chain fills this much of its problems' progress bars; the rest is left for later features. */
export const chainProgress = 50;
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
export const devBoostActions = 100000;
export const devBoostBudget = 30000;

/** Seconds an epic needs; capped at 5 in dev mode. */
export function epicDuration(epic: EpicDefinition, fastEpics = false): number {
  return fastEpics ? Math.min(devEpicDuration, epic.duration) : epic.duration;
}

/**
 * Dev shortcut: +100,000 actions and +30,000 budget. The extra actions are not paid out as budget again.
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
      return { ...epic, progress, done: progress >= (definition ? epicDuration(definition, fastEpics) : 0) };
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
  // Epics that just finished add their share of the chain's progress.
  const finished = next.epics.filter(epic => epic.done && !state.epics.find(before => before.id === epic.id)?.done);
  for (const entry of finished) {
    const epic = epicDefinition(entry.id);
    const goal = epic && worldGoals.find(candidate => candidate.id === epic.goal);
    if (!epic || !goal) continue;
    const share = chainProgress / goalEpics(goal.id).length;
    for (const problem of goal.problems) progress[problem] = percent(progress[problem] + share);
  }
  next.worldProgress = progress;
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

/** The repeatable "Add Server" perk: first at 100,000 actions, then again every 50,000 actions. */
export const addServerPerkId = 'add-server';
export const addServerFirstAt = 100000;
export const addServerEvery = 50000;

/** Servers bought with the Add Server perk (the first slot comes with the workflow perk). */
export function addedServers(state: LaunchedGame): number {
  return Math.max(0, state.serverSlots - 1);
}

/** The next Add Server perk, with its threshold based on how many servers were already added. */
export function addServerPerk(state: LaunchedGame): LaunchedPerk {
  return {
    id: addServerPerkId,
    name: 'Add Server',
    description: 'Rack another server: +1 slot, so one more epic can run at the same time. Comes back every 50,000 actions.',
    icon: 'SV',
    actionsRequired: addServerFirstAt + addServerEvery * addedServers(state)
  };
}

/** Level 2 perks that are not activated yet, in unlock order. Add Server is always offered again. */
export function openLaunchedPerks(state: LaunchedGame): LaunchedPerk[] {
  return [
    ...launchedPerks.filter(perk => !state.perks.includes(perk.id)),
    addServerPerk(state),
    // Tegridy is on sale once Network & Financing is open, as often as you can afford it.
    ...(networkOnline(state) ? [tegridyPerk] : [])
  ].sort((a, b) => a.actionsRequired - b.actionsRequired);
}

/** A farm in Colorado sells integrity by the bag: 100,000 budget for +10 integrity, as often as you like. */
export const tegridyPerk: LaunchedPerk = {
  id: 'tegridy',
  name: 'Buy Some Tegridy',
  description: 'A small family farm in Colorado sells integrity by the bag. Nobody asks how it is grown. +10 integrity.',
  icon: 'TF',
  actionsRequired: 0,
  cost: 100000
};
export const tegridyIntegrity = 10;

/** Whether a perk can be taken right now: enough actions, enough budget for bought perks, and its prerequisites. */
export function launchedPerkAvailable(state: LaunchedGame, perk: LaunchedPerk): boolean {
  if (perk.id === addServerPerkId) return serverOnline(state) && launchedPerkUnlocked(state, perk);
  if (perk.id === tegridyPerk.id) return networkOnline(state) && state.budget >= (perk.cost ?? 0);
  return launchedPerkUnlocked(state, perk);
}

/** Perk that opens the Network & Financing card. */
export const networkPerk = 'network-financing';

/** The Network & Financing desk (bottom left of the grid) opens with the "Who Pays for All This?" perk. */
export function networkOnline(state: LaunchedGame): boolean {
  return state.perks.includes(networkPerk);
}

export function activateLaunchedPerk(state: LaunchedGame, id: string): LaunchedGame | null {
  if (id === tegridyPerk.id) {
    if (!launchedPerkAvailable(state, tegridyPerk)) return null;
    return {
      ...state,
      budget: state.budget - (tegridyPerk.cost ?? 0),
      integrity: Math.min(100, state.integrity + tegridyIntegrity)
    };
  }
  if (id === addServerPerkId) {
    // Adding a server only makes sense once there is a server to extend.
    if (!serverOnline(state) || !launchedPerkUnlocked(state, addServerPerk(state))) return null;
    return { ...state, serverSlots: state.serverSlots + 1 };
  }
  const perk = launchedPerks.find(entry => entry.id === id);
  if (!perk || state.perks.includes(id) || !launchedPerkUnlocked(state, perk)) return null;
  return { ...state, perks: [...state.perks, id] };
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
  return runningEpics(state) + state.rentals.length;
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
  return clientAvailable(state, id) && networkOnline(state) && !state.rentals.includes(id) && usedSlots(state) < state.serverSlots;
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
