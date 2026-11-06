import type { Game } from '../models/game.model.ts';
import type { EpicDefinition, LaunchedGame, LaunchedPerk } from '../models/launched.model.ts';
import { epics, launchedPerks } from './launched-content.ts';

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
    epics: []
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
  return next;
}

export function launchedPerkUnlocked(state: LaunchedGame, perk: LaunchedPerk): boolean {
  return state.actions >= perk.actionsRequired;
}

/** Level 2 perks that are not activated yet, in unlock order. */
export function openLaunchedPerks(state: LaunchedGame): LaunchedPerk[] {
  return launchedPerks.filter(perk => !state.perks.includes(perk.id));
}

export function activateLaunchedPerk(state: LaunchedGame, id: string): LaunchedGame | null {
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

export function canStartEpic(state: LaunchedGame, id: string): boolean {
  const epic = epicDefinition(id);
  return !!epic &&
    serverOnline(state) &&
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
