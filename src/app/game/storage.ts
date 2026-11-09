import type { Game } from '../models/game.model.ts';
import type { Item } from '../models/item.model.ts';
import type { LaunchedGame } from '../models/launched.model.ts';
import type { UtopiaGame } from '../models/utopia.model.ts';
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
function readSnapshot(storage: Pick<Storage, 'getItem'>, level: 1 | 2 | 3): Snapshot | null {
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

export function saveUtopia(storage: Pick<Storage, 'setItem'>, state: UtopiaGame): string {
  const value = JSON.stringify({ level: 3, game: state });
  storage.setItem(saveKey, value);
  return value;
}

const isPercent = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 100;
const isPercentRecord = (value: unknown): boolean => isObject(value) && Object.values(value).every(isPercent);

/** The level 3 state, or null when there is no compatible level 3 save. */
export function loadUtopia(storage: Pick<Storage, 'getItem'>): UtopiaGame | null {
  const game = readSnapshot(storage, 3);
  // Level 3 saves from before TCA, budget, integrity and perks existed get the starting values.
  if (game && game.actions === undefined) Object.assign(game, { actions: 280000000, budget: 20000000, integrity: 50, perks: [] });
  if (game && game.actionRate === undefined) Object.assign(game, { actionRate: 13000, budgetRate: 13000 });
  if (game && game.startActions === undefined) game.startActions = game.actions;
  if (game && game.running === undefined) { game.running = []; delete game.cooldowns; }
  if (game && game.megacorpSeconds === undefined) game.megacorpSeconds = 0;
  if (game && game.effects === undefined) Object.assign(game, { effects: [], cardCooldowns: {} });
  // Battles were removed; older saves may still carry one.
  if (game) delete game.battle;
  // Initiatives that ran before building existed count as built.
  if (game && game.built === undefined) Object.assign(game, { built: Array.isArray(game.running) ? [...game.running] : [], building: {} });
  if (
    !game || !isCount(game.seconds) || !isCount(game.nextAttack) || !isCount(game.actions) || !isCount(game.budget) ||
    !isCount(game.actionRate) || !isCount(game.budgetRate) || !isCount(game.startActions) ||
    !isPercent(game.integrity) || !Array.isArray(game.perks) || !game.perks.every(id => typeof id === 'string') ||
    !isPercentRecord(game.metrics) || !isPercentRecord(game.corpPower) ||
    !Array.isArray(game.running) || !game.running.every(id => typeof id === 'string') || !isCount(game.megacorpSeconds) ||
    !Array.isArray(game.built) || !game.built.every(id => typeof id === 'string') ||
    !isObject(game.building) || !Object.values(game.building).every(isCount) ||
    !Array.isArray(game.attackLog) || !game.attackLog.every(line => typeof line === 'string') ||
    !Array.isArray(game.effects) || !game.effects.every(entry => isObject(entry) && typeof entry.cardId === 'string' && isCount(entry.remaining)) ||
    !isObject(game.cardCooldowns) || !Object.values(game.cardCooldowns).every(isCount)
  ) return null;
  return game as unknown as UtopiaGame;
}

export function saveLaunched(storage: Pick<Storage, 'setItem'>, state: LaunchedGame): string {
  const value = JSON.stringify({ level: 2, game: state });
  storage.setItem(saveKey, value);
  return value;
}

const isProduct = (value: unknown): boolean =>
  isObject(value) && typeof value.id === 'string' && isCount(value.major) && isCount(value.minor) &&
  typeof value.active === 'boolean';

const isEpic = (value: unknown): boolean =>
  isObject(value) && typeof value.id === 'string' && isCount(value.progress) && typeof value.done === 'boolean';

/** The level 2 state, or null when there is no compatible level 2 save. */
export function loadLaunched(storage: Pick<Storage, 'getItem'>): LaunchedGame | null {
  const game = readSnapshot(storage, 2);
  // Saves from before completed programs existed simply have none.
  if (game && game.completedPrograms === undefined) game.completedPrograms = [];
  if (game && game.verdict === undefined) game.verdict = null;
  if (game && game.stats === undefined) game.stats = { lawsuits: game.lawsuitsFiled ?? 0, lawsuitsWon: 0, lawsuitsLost: 0, lawsuitsSettled: 0,
    protestClicks: 0, dirtySeconds: 0, tegridyBags: 0 };
  if (game && game.victorySeen === undefined) game.victorySeen = false;
  if (game && game.eventsSeen === undefined) Object.assign(game, { eventsSeen: [], pendingEvent: null, nsaSeconds: 0, aidSlots: 0, aidSeconds: 0 });
  if (game && isObject(game.stats) && game.stats.pitches === undefined) game.stats = { ...game.stats, pitches: 0 };
  if (
    !game ||
    !['actions', 'budget', 'seconds', 'budgetActions', 'serverSlots'].every(key => isCount(game[key])) ||
    !Array.isArray(game.perks) || !game.perks.every(id => typeof id === 'string') ||
    !Array.isArray(game.epics) || !game.epics.every(isEpic) ||
    !Array.isArray(game.products) || !game.products.every(isProduct) ||
    typeof game.focus !== 'number' || !Number.isInteger(game.focus) || game.focus < -100 || game.focus > 100 ||
    !Array.isArray(game.rentals) || !game.rentals.every(id => typeof id === 'string') ||
    typeof game.integrity !== 'number' || game.integrity < 0 || game.integrity > 100 ||
    !Array.isArray(game.programs) ||
    !Array.isArray(game.completedPrograms) || !game.completedPrograms.every(id => typeof id === 'string') ||
    !isCount(game.lawsuitsFiled) ||
    typeof game.victorySeen !== 'boolean' ||
    !Array.isArray(game.eventsSeen) || !game.eventsSeen.every(id => typeof id === 'string') ||
    !(game.pendingEvent === null || typeof game.pendingEvent === 'string') ||
    !['nsaSeconds', 'aidSlots', 'aidSeconds'].every(key => isCount(game[key])) ||
    !isObject(game.stats) || !['lawsuits', 'lawsuitsWon', 'lawsuitsLost', 'lawsuitsSettled', 'protestClicks', 'dirtySeconds', 'tegridyBags', 'pitches']
      .every(key => isCount((game.stats as Snapshot)[key])) ||
    !(game.verdict === null || (isObject(game.verdict) && typeof game.verdict.product === 'string' &&
      typeof game.verdict.plaintiff === 'string' && typeof game.verdict.won === 'boolean' && isCount(game.verdict.damages))) ||
    !(game.lawsuit === null || (isObject(game.lawsuit) && isCount(game.lawsuit.caseId) &&
      (game.lawsuit.courtSeconds === null || isCount(game.lawsuit.courtSeconds)))) ||
    !game.programs.every(entry => isObject(entry) && typeof entry.id === 'string' && typeof entry.resistance === 'number' && entry.resistance >= 0 &&
      typeof entry.milestone === 'number' && entry.milestone >= 0 && entry.milestone <= 100) ||
    !isObject(game.worldProgress) ||
    !['climate', 'war', 'hunger', 'poverty', 'corruption'].every(problem => {
      const value = (game.worldProgress as Snapshot)[problem];
      return typeof value === 'number' && value >= 0 && value <= 100;
    })
  ) return null;
  return game as unknown as LaunchedGame;
}
