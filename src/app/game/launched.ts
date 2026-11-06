import type { Game } from '../models/game.model.ts';
import type { EpicDefinition, LaunchedGame, LaunchedPerk, LaunchedProduct } from '../models/launched.model.ts';
import { epics, launchedPerks, worldGoals } from './launched-content.ts';

/** Coverage units (1/1000 percentage point) required before the application can launch: 100%. */
export const launchCoverage = 100000;
export const minActionsPerSecond = 50;
export const maxActionsPerSecond = 300;
/** Every this many seconds the budget grows by the new actions times `budgetPerAction`. */
export const budgetInterval = 5;
export const budgetPerAction = 20;
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
    products: []
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
    products: []
  };
}

const cap = (value: number) => Math.min(Number.MAX_SAFE_INTEGER, value);

/**
 * One second in level 2: actions grow by 50–300, running epics advance by one second of server time,
 * and every 5 seconds the budget grows by the actions gained since the last payout times 20.
 */
export function tickLaunched(state: LaunchedGame, random: () => number = Math.random): LaunchedGame {
  const gained = minActionsPerSecond + Math.floor(random() * (maxActionsPerSecond - minActionsPerSecond + 1));
  const next: LaunchedGame = {
    ...state,
    actions: cap(state.actions + gained),
    seconds: state.seconds + 1,
    epics: state.epics.map(epic => {
      if (epic.done) return epic;
      const progress = epic.progress + 1;
      return { ...epic, progress, done: progress >= (epicDefinition(epic.id)?.duration ?? 0) };
    })
  };
  if (next.seconds % budgetInterval === 0) {
    next.budget = cap(next.budget + (next.actions - next.budgetActions) * budgetPerAction);
    next.budgetActions = next.actions;
  }
  // A completed world goal releases its product, starting at version 1.0.
  const released = worldGoals
    .filter(goal => goalComplete(next, goal.id) && !next.products.some(product => product.goal === goal.id))
    .map((goal): LaunchedProduct => ({ goal: goal.id, major: 1, minor: 0, active: false }));
  if (released.length) next.products = [...next.products, ...released];
  return next;
}

export function product(state: LaunchedGame, goal: string): LaunchedProduct | undefined {
  return state.products.find(entry => entry.goal === goal);
}

/** Display name of a released product, e.g. "Green World v1.0". */
export function productTitle(released: LaunchedProduct): string {
  const name = worldGoals.find(goal => goal.id === released.goal)?.feature ?? released.goal;
  return `${name} v${released.major}.${released.minor}`;
}

/** Switches a released product on. It has no effect yet; what it does is still to be defined. */
export function activateProduct(state: LaunchedGame, goal: string): LaunchedGame | null {
  const released = product(state, goal);
  if (!released || released.active) return null;
  return { ...state, products: state.products.map(entry => entry.goal === goal ? { ...entry, active: true } : entry) };
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
  return [...launchedPerks.filter(perk => !state.perks.includes(perk.id)), addServerPerk(state)];
}

export function activateLaunchedPerk(state: LaunchedGame, id: string): LaunchedGame | null {
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

/** Share of server slots in use, 0–1. */
export function serverLoad(state: LaunchedGame): number {
  return state.serverSlots > 0 ? Math.min(1, runningEpics(state) / state.serverSlots) : 1;
}

/** The epics of a world goal, in the order they build on each other. */
export function goalEpics(goal: string): EpicDefinition[] {
  return epics.filter(epic => epic.goal === goal);
}

export function epicDone(state: LaunchedGame, id: string): boolean {
  return state.epics.some(entry => entry.id === id && entry.done);
}

/** An epic becomes available once the previous epic of its goal is done (the first one right away). */
export function epicUnlocked(state: LaunchedGame, id: string): boolean {
  const epic = epicDefinition(id);
  if (!epic) return false;
  const chain = goalEpics(epic.goal);
  const previous = chain[chain.indexOf(epic) - 1];
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
    runningEpics(state) < state.serverSlots &&
    state.budget >= epic.cost;
}

/** Pays for an epic and puts it on the server. */
export function startEpic(state: LaunchedGame, id: string): LaunchedGame | null {
  const epic = epicDefinition(id);
  if (!epic || !canStartEpic(state, id)) return null;
  return { ...state, budget: state.budget - epic.cost, epics: [...state.epics, { id, progress: 0, done: false }] };
}
