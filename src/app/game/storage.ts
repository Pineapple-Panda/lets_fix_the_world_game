import type { Game } from '../models/game.model.ts';
import type { Item } from '../models/item.model.ts';
import { perks } from '../models/perk.model.ts';
import type { PerkId } from '../models/perk.model.ts';
import { blueprint, improvements } from './content.ts';
import { versionForDeployments } from '../models/version.model.ts';
import { isAvailable, openBugs } from './game.ts';

export const saveKey = 'sprint-game';

export function loadGame(storage: Pick<Storage, 'getItem'>): Game | null {
  const saved = storage.getItem(saveKey);
  if (saved === null) return null;
  const envelope: unknown = JSON.parse(saved);
  const invalid = (): never => { throw new Error('Invalid or unsupported saved game'); };
  const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = (value: unknown): value is unknown[] => Array.isArray(value);
  const isCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const isPerkId = (value: unknown): value is PerkId =>
    typeof value === 'string' && perks.some(perk => perk.id === value);
  const isItem = (value: unknown): value is Item => {
    if (
      !isObject(value) ||
      typeof value.id !== 'string' ||
      (value.type !== 'task' && value.type !== 'story' && value.type !== 'bug') ||
      typeof value.title !== 'string' ||
      typeof value.detail !== 'string' ||
      !isCount(value.required) ||
      !isCount(value.progress) ||
      value.progress > value.required ||
      typeof value.done !== 'boolean' ||
      (value.inTest !== undefined && typeof value.inTest !== 'boolean')
    ) return false;
    if (value.type === 'story' && value.inTest === true) return false;
    if (value.type !== 'story' && (
      value.required === 0 ||
      (value.inTest === true ? value.done || value.progress !== value.required : value.done !== (value.progress === value.required))
    )) return false;
    return value.type === 'task' ? typeof value.parent === 'string' : value.parent === undefined;
  };

  if (!isObject(envelope) || typeof envelope.version !== 'number' || ![1, 2, 3, 4, 5].includes(envelope.version) || !isObject(envelope.game)) return invalid();
  const game = envelope.game;
  if (
    !isCount(game.actions) ||
    (envelope.version >= 2 && (!isCount(game.budget) || !isCount(game.lastDeploymentActions))) ||
    (envelope.version >= 4 && !isObject(game.appVersion)) ||
    (game.budget !== undefined && !isCount(game.budget)) ||
    (game.lastDeploymentActions !== undefined && (!isCount(game.lastDeploymentActions) || game.lastDeploymentActions > game.actions)) ||
    (game.testCoverage !== undefined && (!isCount(game.testCoverage) || game.testCoverage > 100000)) ||
    (game.manualCoverageUpgrades !== undefined && !isCount(game.manualCoverageUpgrades)) ||
    (game.autoCoverageUpgrades !== undefined && !isCount(game.autoCoverageUpgrades)) ||
    (envelope.version >= 4 && (!isObject(game.appVersion) || !isCount(game.appVersion.major) || !isCount(game.appVersion.minor) || !isCount(game.appVersion.patch) || game.appVersion.minor > 9 || game.appVersion.patch !== 0)) ||
    !isCount(game.bugCount) ||
    !isCount(game.seconds) ||
    !isCount(game.deployments) ||
    !isCount(game.assistants) ||
    !isCount(game.assistantUpgrades) ||
    !isArray(game.items) ||
    !isArray(game.activatedPerks) ||
    !isArray(game.archivedIds) ||
    !isArray(game.agentTargets) ||
    !isArray(game.agentCarry)
  ) return invalid();
  if (game.deployments === 0 && ((game.lastDeploymentActions ?? 0) !== 0 || (game.budget ?? 0) !== 0)) return invalid();
  const expectedVersion = versionForDeployments(game.deployments);
  if (envelope.version >= 4 && isObject(game.appVersion) &&
    (game.appVersion.major !== expectedVersion.major || game.appVersion.minor !== expectedVersion.minor || game.appVersion.patch !== expectedVersion.patch)) return invalid();
  if (
    game.items.length !== blueprint.length + game.deployments * 15 + game.bugCount ||
    game.agentTargets.length !== game.assistants ||
    game.agentCarry.length !== game.assistants ||
    !game.agentCarry.every(carry => isCount(carry) && carry < 10)
  ) return invalid();
  if (
    new Set(game.activatedPerks).size !== game.activatedPerks.length ||
    !game.activatedPerks.every(isPerkId) ||
    (game.testCoverage !== undefined && game.testCoverage > 0 && !game.activatedPerks.includes('earl')) ||
    (((game.manualCoverageUpgrades ?? 0) as number) > 0 &&
      (!game.activatedPerks.includes('earl') || !game.activatedPerks.includes('testing-skills'))) ||
    (((game.autoCoverageUpgrades ?? 0) as number) > 0 &&
      (!game.activatedPerks.includes('earl') || !game.activatedPerks.includes('auto-testing'))) ||
    (game.assistants > 0) !== game.activatedPerks.includes('code-assistant') ||
    (game.assistantUpgrades > 0 &&
      (!game.activatedPerks.includes('multi-agent') || !game.activatedPerks.includes('code-assistant')))
  ) return invalid();

  const itemsById = new Map<string, Item>();
  const validatedItems: Item[] = [];
  for (const item of game.items) {
    if (!isItem(item) || itemsById.has(item.id) ||
      (item.inTest && !game.activatedPerks.includes('earl'))) return invalid();
    const restoredItem = { ...item, inTest: item.inTest ?? false };
    itemsById.set(item.id, restoredItem);
    validatedItems.push(restoredItem);
  }
  for (const expected of blueprint) {
    const item = itemsById.get(expected.id);
    if (
      !item ||
      item.type !== expected.type ||
      item.parent !== expected.parent ||
      (item.type === 'task' && item.required !== expected.required)
    ) return invalid();
  }
  for (let deployment = 1; deployment <= game.deployments; deployment++) {
    for (let index = 0; index < 5; index++) {
      const storyId = `S-${String(5 * deployment + index + 1).padStart(2, '0')}`;
      if (itemsById.get(storyId)?.type !== 'story') return invalid();
      for (let taskIndex = 0; taskIndex < 2; taskIndex++) {
        const taskId = `T-${String(15 + (deployment - 1) * 10 + index * 2 + taskIndex + 1).padStart(2, '0')}`;
        const task = itemsById.get(taskId);
        if (!task || task.type !== 'task' || task.parent !== storyId || task.required !== 30) return invalid();
      }
    }
  }
  for (let number = 1; number <= game.bugCount; number++) {
    const bug = itemsById.get(`B-${String(number).padStart(2, '0')}`);
    if (!bug || bug.type !== 'bug' || bug.required !== 6 + Math.min(number * 2, 10)) return invalid();
  }
  const archivedIds = game.archivedIds;
  for (const item of itemsById.values()) {
    if (item.type !== 'story') continue;
    const children = validatedItems.filter(child => child.parent === item.id);
    if (
      !children.length ||
      item.required !== children.reduce((sum, child) => sum + child.required, 0) ||
      item.progress !== children.reduce((sum, child) => sum + child.progress, 0) ||
      (item.done && children.some(child => !child.done))
    ) return invalid();
    const archived = Number(item.id.slice(2)) <= 5 * game.deployments;
    if ([item, ...children].some(child =>
      archivedIds.includes(child.id) !== archived || (archived && !child.done)
    )) return invalid();
  }
  if (game.deployments === 0 && game.archivedIds.length) return invalid();
  const isReference = (id: unknown, types: Item['type'][]) => {
    if (id === null) return true;
    if (typeof id !== 'string') return false;
    const item = itemsById.get(id);
    return item !== undefined && types.includes(item.type);
  };
  if (
    !isReference(game.selected, ['task', 'bug']) ||
    !isReference(game.automationTarget, ['task']) ||
    !game.agentTargets.every(id =>
      isReference(id, ['task']) && (id === null || (typeof id === 'string' && !itemsById.get(id)?.done && !itemsById.get(id)?.inTest))
    ) ||
    new Set(game.agentTargets.filter(id => id !== null)).size !== game.agentTargets.filter(id => id !== null).length ||
    (!game.activatedPerks.includes('multi-agent') && game.agentTargets.some(id => id !== null)) ||
    new Set(game.archivedIds).size !== game.archivedIds.length ||
    !game.archivedIds.every(id => typeof id === 'string' && itemsById.get(id)?.done)
  ) return invalid();
  const restored = {
    ...game,
    items: validatedItems,
    testCoverage: game.testCoverage ?? 0,
    manualCoverageUpgrades: game.manualCoverageUpgrades ?? 0,
    autoCoverageUpgrades: game.autoCoverageUpgrades ?? 0,
    budget: game.budget ?? 0,
    lastDeploymentActions: game.lastDeploymentActions ?? (game.deployments > 0 ? game.actions : 0),
    appVersion: envelope.version >= 4 && isObject(game.appVersion)
      ? { major: game.appVersion.major as number, minor: game.appVersion.minor as number, patch: game.appVersion.patch as number }
      : versionForDeployments(game.deployments)
  } as unknown as Game;
  const selected = restored.selected === null ? undefined : itemsById.get(restored.selected);
  if (selected?.type === 'task' && (!isAvailable(restored, selected) || openBugs(restored).length > 0)) {
    return invalid();
  }
  if (openBugs(restored).length === 0 && [...itemsById.values()].some(item =>
    item.type === 'story' &&
    !item.done &&
    isAvailable(restored, item) &&
    validatedItems.filter(child => child.parent === item.id).every(child => child.done)
  )) return invalid();
  for (const expected of blueprint) {
    const item = itemsById.get(expected.id)!;
    item.title = expected.title;
    item.detail = expected.detail;
  }
  for (let deployment = 1; deployment <= game.deployments; deployment++) {
    for (const [index, story] of improvements.entries()) {
      const storyId = `S-${String(5 * deployment + index + 1).padStart(2, '0')}`;
      const item = itemsById.get(storyId)!;
      item.title = story.title + (deployment > 1 ? ` (iteration ${deployment})` : '');
      item.detail = story.detail;
      for (const [taskIndex, task] of story.tasks.entries()) {
        const taskId = `T-${String(15 + (deployment - 1) * 10 + index * 2 + taskIndex + 1).padStart(2, '0')}`;
        const item = itemsById.get(taskId)!;
        item.title = task.title;
        item.detail = task.detail;
      }
    }
  }
  return restored;
}

export function saveGame(storage: Pick<Storage, 'setItem'>, game: Game): string {
  const value = JSON.stringify({ version: 5, game });
  storage.setItem(saveKey, value);
  return value;
}
