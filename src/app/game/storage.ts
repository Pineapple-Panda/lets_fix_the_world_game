import type { Game } from '../models/game.model.ts';
import type { Item } from '../models/item.model.ts';
import type { LaunchedGame } from '../models/launched.model.ts';
import { perks } from '../models/perk.model.ts';

/**
 * The save is a plain JSON snapshot without format versions: `{ level: 1, game }` or `{ level: 2, game }`.
 * A save that does not match the current shape is simply ignored and the player starts over.
 */
export const saveKey = 'sprint-game';

type Snapshot = Record<string, unknown>;

const isObject = (value: unknown): value is Snapshot =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Reads the stored snapshot for the given level, or null when it is missing, corrupt or for another level. */
function readSnapshot(storage: Pick<Storage, 'getItem'>, level: 1 | 2): Snapshot | null {
  const saved = storage.getItem(saveKey);
  if (saved === null) return null;
  try {
    const envelope: unknown = JSON.parse(saved);
    return isObject(envelope) && envelope.level === level && isObject(envelope.game) ? envelope.game : null;
  } catch {
    return null;
  }
}

const isItem = (value: unknown): value is Item =>
  isObject(value) &&
  typeof value.id === 'string' &&
  (value.type === 'task' || value.type === 'bug') &&
  typeof value.title === 'string' &&
  typeof value.detail === 'string' &&
  isCount(value.required) && value.required > 0 &&
  isCount(value.progress) && value.progress <= value.required &&
  (value.unlockAt === undefined || isCount(value.unlockAt)) &&
  typeof value.done === 'boolean' &&
  typeof value.inTest === 'boolean';

/** Basic shape check: enough to run the game safely, not a full consistency audit. */
function isGame(game: Snapshot): boolean {
  const version = game.appVersion;
  return (
    Array.isArray(game.items) && game.items.every(isItem) &&
    (game.selected === null || typeof game.selected === 'string') &&
    (game.automationTarget === null || typeof game.automationTarget === 'string') &&
    ['actions', 'budget', 'lastDeploymentActions', 'testCoverage', 'manualCoverageUpgrades', 'autoCoverageUpgrades',
      'bugCount', 'taskCount', 'roadmapIndex', 'seconds', 'deployments', 'assistants', 'assistantUpgrades'].every(key => isCount(game[key])) &&
    isObject(version) && isCount(version.major) && isCount(version.minor) && isCount(version.patch) &&
    Array.isArray(game.activatedPerks) &&
    game.activatedPerks.every(id => perks.some(perk => perk.id === id)) &&
    Array.isArray(game.agentTargets) && game.agentTargets.every(id => id === null || typeof id === 'string') &&
    Array.isArray(game.agentCarry) && game.agentCarry.every(isCount) &&
    game.agentTargets.length === game.assistants && game.agentCarry.length === game.assistants
  );
}

export function saveGame(storage: Pick<Storage, 'setItem'>, game: Game): string {
  const value = JSON.stringify({ level: 1, game });
  storage.setItem(saveKey, value);
  return value;
}

/** The level 1 game, or null when there is no compatible level 1 save. */
export function loadGame(storage: Pick<Storage, 'getItem'>): Game | null {
  const game = readSnapshot(storage, 1);
  return game && isGame(game) ? game as unknown as Game : null;
}

export function saveLaunched(storage: Pick<Storage, 'setItem'>, state: LaunchedGame): string {
  const value = JSON.stringify({ level: 2, game: state });
  storage.setItem(saveKey, value);
  return value;
}

const isEpic = (value: unknown): boolean =>
  isObject(value) && typeof value.id === 'string' && isCount(value.progress) && typeof value.done === 'boolean';

/** The level 2 state, or null when there is no compatible level 2 save. */
export function loadLaunched(storage: Pick<Storage, 'getItem'>): LaunchedGame | null {
  const game = readSnapshot(storage, 2);
  if (
    !game ||
    !['actions', 'budget', 'seconds', 'budgetActions', 'serverSlots'].every(key => isCount(game[key])) ||
    !Array.isArray(game.perks) || !game.perks.every(id => typeof id === 'string') ||
    !Array.isArray(game.epics) || !game.epics.every(isEpic)
  ) return null;
  return game as unknown as LaunchedGame;
}
