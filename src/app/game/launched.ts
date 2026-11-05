import type { Game } from '../models/game.model.ts';
import type { LaunchedGame } from '../models/launched.model.ts';

/** Coverage units (1/1000 percentage point) required before the application can launch: 100%. */
export const launchCoverage = 100000;
export const minActionsPerSecond = 50;
export const maxActionsPerSecond = 300;

/** True once Earl reports full test coverage. */
export function canLaunch(game: Game): boolean {
  return game.activatedPerks.includes('earl') && game.testCoverage >= launchCoverage;
}

/** Reduces the level 1 game to the level 2 state; everything except actions and budget is dropped. */
export function launch(game: Game): LaunchedGame | null {
  if (!canLaunch(game)) return null;
  return { actions: game.actions, budget: game.budget };
}

/** One second in level 2: actions grow by a random amount between 50 and 300 (inclusive). */
export function tickLaunched(state: LaunchedGame, random: () => number = Math.random): LaunchedGame {
  const gained = minActionsPerSecond + Math.floor(random() * (maxActionsPerSecond - minActionsPerSecond + 1));
  return { ...state, actions: Math.min(Number.MAX_SAFE_INTEGER, state.actions + gained) };
}
