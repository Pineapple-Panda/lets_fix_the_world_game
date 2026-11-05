import type { Game } from '../models/game.model.ts';
import type { Item } from '../models/item.model.ts';
import { perks } from '../models/perk.model.ts';
import type { Perk } from '../models/perk.model.ts';
import { blueprint, bugTemplates, dependencies, improvements } from './content.ts';
import { nextVersion, versionForDeployments } from '../models/version.model.ts';

export { perks } from '../models/perk.model.ts';
export type { Game } from '../models/game.model.ts';
export type { Item } from '../models/item.model.ts';
export type { Perk, PerkId } from '../models/perk.model.ts';

export function newGame(): Game {
  const game: Game = {
    items: blueprint.map(item => ({ ...item, progress: 0, done: false, inTest: false })),
    selected: null,
    automationTarget: null,
    actions: 0,
    budget: 0,
    lastDeploymentActions: 0,
    appVersion: versionForDeployments(0),
    testCoverage: 0,
    bugCount: 0,
    seconds: 0,
    activatedPerks: [],
    archivedIds: [],
    deployments: 0,
    assistants: 0,
    assistantUpgrades: 0,
    agentTargets: [],
    agentCarry: []
  };
  settle(game);
  return game;
}

export function openBugs(game: Game): Item[] {
  return game.items.filter(item => item.type === 'bug' && !item.done);
}

export function isAvailable(game: Game, item: Item): boolean {
  if (item.type === 'bug') return true;
  if (item.type === 'task') {
    const parent = game.items.find(entry => entry.type === 'story' && entry.id === item.parent);
    return !!parent && isAvailable(game, parent);
  }
  if (item.id === 'S-01') return true;
  const dependencyId = dependencies[item.id];
  if (dependencyId) {
    return game.items.some(entry => entry.type === 'story' && entry.id === dependencyId && entry.done);
  }
  const storyNumber = /^S-(\d+)$/.exec(item.id);
  return !!storyNumber &&
    Number(storyNumber[1]) > 5 &&
    Number(storyNumber[1]) <= 5 + game.deployments * 5 &&
    game.items.some(entry => entry.type === 'story' && entry.id === item.id);
}

export function boardItems(game: Game): Item[] {
  return game.items.filter(item => isAvailable(game, item) && !game.archivedIds.includes(item.id));
}

export function canDeploy(game: Game): boolean {
  return game.items.filter(item => item.type === 'story' && item.done).length >= 5 * (game.deployments + 1) &&
    openBugs(game).length === 0;
}

export function sprintComplete(game: Game): boolean {
  return canDeploy(game);
}

export function deploymentBudgetReward(game: Game): number {
  if (
    !Number.isSafeInteger(game.deployments) || game.deployments < 0 ||
    !Number.isSafeInteger(game.actions) || game.actions < 0 ||
    !Number.isSafeInteger(game.lastDeploymentActions) || game.lastDeploymentActions < 0 ||
    game.lastDeploymentActions > game.actions ||
    !Number.isSafeInteger(game.appVersion.major) || game.appVersion.major < 0 ||
    !Number.isSafeInteger(game.appVersion.minor) || game.appVersion.minor < 0 || game.appVersion.minor > 9 ||
    game.appVersion.patch !== 0
  ) return 0;
  const currentVersion = versionForDeployments(game.deployments);
  if (game.appVersion.major !== currentVersion.major || game.appVersion.minor !== currentVersion.minor) return 0;
  const releaseVersion = nextVersion(game.appVersion);
  if (!Number.isSafeInteger(releaseVersion.major)) return 0;
  const versionMultiplier = releaseVersion.major + releaseVersion.minor / 10;
  const reward = Math.round((game.actions - game.lastDeploymentActions) * versionMultiplier);
  return Number.isSafeInteger(reward) && reward >= 0 ? reward : 0;
}

export function deploy(game: Game): boolean {
  if (
    !canDeploy(game) ||
    !Number.isSafeInteger(game.actions) || game.actions < 0 ||
    !Number.isSafeInteger(game.lastDeploymentActions) || game.lastDeploymentActions < 0 ||
    game.lastDeploymentActions > game.actions ||
    !Number.isSafeInteger(game.budget) || game.budget < 0
  ) return false;
  const reward = deploymentBudgetReward(game);
  const currentVersion = versionForDeployments(game.deployments);
  const releaseVersion = nextVersion(game.appVersion);
  if (
    game.appVersion.major !== currentVersion.major ||
    game.appVersion.minor !== currentVersion.minor ||
    game.appVersion.patch !== currentVersion.patch ||
    !Number.isSafeInteger(releaseVersion.major) ||
    !Number.isSafeInteger(game.budget + reward)
  ) return false;
  game.appVersion = releaseVersion;
  game.budget += reward;
  game.lastDeploymentActions = game.actions;
  game.archivedIds = game.items.filter(item => item.done).map(item => item.id);
  game.deployments++;
  for (const [index, story] of improvements.entries()) {
    const id = `S-${String(5 * game.deployments + index + 1).padStart(2, '0')}`;
    const suffix = game.deployments > 1 ? ` (iteration ${game.deployments})` : '';
    for (const [taskIndex, task] of story.tasks.entries()) {
      game.items.push({
        ...task,
        id: `T-${String(15 + (game.deployments - 1) * 10 + index * 2 + taskIndex + 1).padStart(2, '0')}`,
        type: 'task',
        parent: id,
        required: 30,
        progress: 0,
        done: false,
        inTest: false
      });
    }
    game.items.push({
      id,
      type: 'story',
      title: story.title + suffix,
      detail: story.detail,
      required: 0,
      progress: 0,
      done: false,
      inTest: false
    });
  }
  settle(game);
  return true;
}

export function settle(game: Game): void {
  let changed;
  do {
    changed = false;
    for (const item of game.items) {
      if (item.type === 'story') {
        const children = game.items.filter(child => child.parent === item.id);
        const progress = children.reduce((sum, child) => sum + child.progress, 0);
        const required = children.reduce((sum, child) => sum + child.required, 0);
        if (item.progress !== progress || item.required !== required) changed = true;
        item.progress = progress;
        item.required = required;
        if (
          item.done ||
          !isAvailable(game, item) ||
          !children.length ||
          children.some(child => !child.done) ||
          openBugs(game).length
        ) continue;
      } else if (item.done || item.inTest || item.progress < item.required) continue;
      if (item.type !== 'story' && game.activatedPerks.includes('earl')) item.inTest = true;
      else item.done = true;
      if (item.type === 'task') {
        const agent = game.agentTargets.indexOf(item.id);
        if (agent !== -1) game.agentTargets[agent] = null;
      }
      changed = true;
    }
  } while (changed);
}

export function selectItem(game: Game, id: string): boolean {
  const item = game.items.find(entry => entry.id === id);
  if (
    !item ||
    item.done ||
    (item.type !== 'task' && item.type !== 'bug') ||
    !isAvailable(game, item)
  ) return false;
  if (openBugs(game).length && item.type !== 'bug') return false;
  game.selected = id;
  if (item.type === 'task') game.automationTarget = id;
  return true;
}

export function work(game: Game, id: string | null, amount: number, automatic = false): boolean {
  const item = game.items.find(entry => entry.id === id);
  if (
    !item ||
    (item.type !== 'task' && item.type !== 'bug') ||
    item.done ||
    item.progress >= item.required ||
    !isAvailable(game, item)
  ) return false;
  if (automatic && item.type === 'bug') return false;
  if (!automatic && openBugs(game).length && item.type !== 'bug') return false;
  applyWork(game, item, amount);
  return true;
}

function applyWork(game: Game, item: Item, amount: number): void {
  const applied = Math.min(amount, item.required - item.progress);
  item.progress += applied;
  game.actions += applied;
  settle(game);
}

export function perkUnlocked(game: Game, perk: Perk): boolean {
  return game.actions >= perk.actionsRequired;
}

export function openPerks(game: Game): Perk[] {
  const priorityIds = ['earl', 'testing-skills', 'auto-testing'];
  const available = perks.filter(perk => !game.activatedPerks.includes(perk.id) &&
    (perk.id !== 'earl' || perkUnlocked(game, perk)));
  const promoted = available.filter(perk => priorityIds.includes(perk.id) && perkUnlocked(game, perk));
  const result = available.filter(perk => !priorityIds.includes(perk.id)).slice(0, 3 - promoted.length);
  return [...result, ...promoted];
}

export function coveragePercent(game: Game): number {
  return game.testCoverage / 1000;
}

export const coverageCost = 1;

export function coverageStep(game: Game): number {
  return game.activatedPerks.includes('testing-skills') ? 5 : 1;
}

export function improveCoverage(game: Game): boolean {
  if (!game.activatedPerks.includes('earl') || game.testCoverage >= 100000 ||
    !Number.isSafeInteger(game.budget) || game.budget < coverageCost) return false;
  game.budget -= coverageCost;
  game.testCoverage = Math.min(100000, game.testCoverage + coverageStep(game));
  return true;
}

export function activePerks(game: Game): Perk[] {
  return perks.filter(perk => game.activatedPerks.includes(perk.id));
}

export function activatePerk(game: Game, id: string): boolean {
  const perk = perks.find(entry => entry.id === id);
  if (!perk || game.activatedPerks.includes(perk.id) || !perkUnlocked(game, perk)) return false;
  game.activatedPerks.push(perk.id);
  if (id === 'code-assistant') {
    game.assistants = 1;
    game.agentTargets.push(
      game.activatedPerks.includes('multi-agent')
        ? automationTask(game, game.automationTarget)?.id ?? null
        : null
    );
    game.agentCarry.push(0);
  } else if (id === 'multi-agent' && game.assistants > 0) {
    const target = automationTask(game, game.automationTarget);
    game.agentTargets[0] = target?.id ?? null;
  }
  return true;
}

export function assistantCount(game: Game): number {
  return game.assistants;
}

function upgradeThreshold(level: number): number {
  return Math.ceil(500 * 1.25 ** level);
}

export function nextAssistantCount(game: Game): number {
  return game.assistants === 0 ? 0 : upgradeThreshold(game.assistants - 1);
}

export function assistantLimit(game: Game): number {
  let limit = Math.max(1, game.assistants);
  let budget = game.budget;
  while (Number.isSafeInteger(budget) && budget >= 0 && Number.isSafeInteger(limit)) {
    const cost = upgradeThreshold(limit - 1);
    if (!Number.isSafeInteger(cost) || budget < cost || limit === Number.MAX_SAFE_INTEGER) break;
    budget -= cost;
    limit++;
  }
  return limit;
}

export function addAssistant(game: Game): boolean {
  const cost = nextAssistantCount(game);
  if (
    !game.activatedPerks.includes('code-assistant') ||
    !game.activatedPerks.includes('multi-agent') ||
    !Number.isSafeInteger(game.assistants) || game.assistants < 1 || game.assistants === Number.MAX_SAFE_INTEGER ||
    !Number.isSafeInteger(cost) || cost <= 0 ||
    !Number.isSafeInteger(game.budget) || game.budget < cost
  ) return false;
  game.budget -= cost;
  game.assistants++;
  game.agentTargets.push(null);
  game.agentCarry.push(0);
  return true;
}

export function assignAgent(game: Game, id: string): boolean {
  if (!game.activatedPerks.includes('multi-agent') || openBugs(game).length) return false;
  const item = game.items.find(entry => entry.id === id);
  if (
    !item ||
    item.type !== 'task' ||
    item.done ||
    item.progress >= item.required ||
    !isAvailable(game, item)
  ) return false;
  const assignedAgent = game.agentTargets.indexOf(id);
  if (assignedAgent !== -1) {
    game.agentTargets[assignedAgent] = null;
    return true;
  }
  const freeAgent = game.agentTargets.indexOf(null);
  if (freeAgent === -1) return false;
  game.agentTargets[freeAgent] = id;
  return true;
}

export function nextAssistantUpgrade(game: Game): number {
  return upgradeThreshold(game.assistantUpgrades);
}

export function upgradeAssistants(game: Game): boolean {
  const cost = nextAssistantUpgrade(game);
  if (
    !game.activatedPerks.includes('code-assistant') ||
    !game.activatedPerks.includes('multi-agent') ||
    !Number.isSafeInteger(game.assistantUpgrades) || game.assistantUpgrades < 0 || game.assistantUpgrades === Number.MAX_SAFE_INTEGER ||
    !Number.isSafeInteger(cost) || cost <= 0 ||
    !Number.isSafeInteger(game.budget) || game.budget < cost
  ) return false;
  game.budget -= cost;
  game.assistantUpgrades++;
  return true;
}

function baseAutomationRate(game: Game): number {
  return perks.reduce(
    (total, perk) => total + (game.activatedPerks.includes(perk.id) ? perk.rate ?? 0 : 0),
    0
  );
}

function assistantOutputTenths(game: Game): number {
  return (10 + game.assistantUpgrades) * (game.activatedPerks.includes('ai-subscription') ? 2 : 1);
}

export function assistantOutput(game: Game): number {
  return assistantOutputTenths(game) / 10;
}

export function automationRate(game: Game): number {
  return baseAutomationRate(game) +
    assistantCount(game) * assistantOutputTenths(game) / 10 +
    (game.activatedPerks.includes('bug-fix-agent') ? 1 : 0);
}

function oldestOpenBug(game: Game): Item | undefined {
  return openBugs(game)
    .filter(bug => bug.progress < bug.required)
    .reduce<Item | undefined>(
      (oldest, bug) => !oldest || Number(bug.id.slice(2)) < Number(oldest.id.slice(2)) ? bug : oldest,
      undefined
    );
}

function automationTask(game: Game, target: string | null | undefined): Item | undefined {
  return game.items.find(entry =>
    entry.id === target &&
    entry.type === 'task' &&
    !entry.done &&
    entry.progress < entry.required &&
    isAvailable(game, entry)
  );
}

export function currentAutomationRate(game: Game): number {
  if (canDeploy(game)) return 0;
  const rates = new Map<Item, number>();
  const addTargetRate = (target: string | null | undefined, rate: number) => {
    const item = automationTask(game, target);
    if (item) rates.set(item, (rates.get(item) ?? 0) + rate);
  };
  addTargetRate(game.automationTarget, baseAutomationRate(game));
  for (let i = 0; i < assistantCount(game); i++) {
    const target = game.activatedPerks.includes('multi-agent') ? game.agentTargets[i] : game.automationTarget;
    addTargetRate(target, assistantOutput(game));
  }
  const bug = game.activatedPerks.includes('bug-fix-agent') ? oldestOpenBug(game) : undefined;
  return Array.from(rates, ([item, rate]) => Math.min(rate, item.required - item.progress))
    .reduce((total, rate) => total + rate, 0) +
    (bug ? Math.min(1, bug.required - bug.progress) : 0);
}

export function automate(game: Game): void {
  const tests = game.items.filter(item => item.inTest);
  if (game.activatedPerks.includes('earl') && game.activatedPerks.includes('auto-testing')) {
    game.testCoverage = Math.min(100000, game.testCoverage + 1);
  }
  const base = baseAutomationRate(game);
  if (base) work(game, game.automationTarget, base, true);
  if (game.activatedPerks.includes('auto-assigner') && game.activatedPerks.includes('multi-agent')) {
    for (let i = 0; i < assistantCount(game); i++) {
      if (game.agentTargets[i] !== null) continue;
      const task = game.items.find(item =>
        item.type === 'task' &&
        !item.done &&
        item.progress < item.required &&
        isAvailable(game, item) &&
        !game.agentTargets.includes(item.id)
      );
      if (task) game.agentTargets[i] = task.id;
    }
  }
  for (let i = 0; i < assistantCount(game); i++) {
    const target = game.activatedPerks.includes('multi-agent') ? game.agentTargets[i] : game.automationTarget;
    const item = automationTask(game, target);
    if (!item) continue;
    const carry = game.agentCarry[i];
    if (carry === undefined) continue;
    const tenths = carry + assistantOutputTenths(game);
    game.agentCarry[i] = tenths % 10;
    work(game, item.id, Math.floor(tenths / 10), true);
  }
  const bug = game.activatedPerks.includes('bug-fix-agent') ? oldestOpenBug(game) : undefined;
  if (bug) applyWork(game, bug, 1);
  for (const item of tests) {
    item.inTest = false;
    if (Math.random() < 0.5) item.done = true;
    else item.progress = item.required - 1;
    settle(game);
  }
}

export function canGenerateBugs(game: Game): boolean {
  return game.items.some(item => item.type === 'story' && item.id === 'S-02' && item.done);
}

export function bugChance(game: Game): number {
  const chance = game.actions >= 15000 ? 0.60 :
    game.actions >= 11000 ? 0.30 :
    game.actions >= 8500 ? 0.16 :
    game.actions >= 7500 ? 0.12 :
    game.actions >= 4000 ? 0.08 : 0.04;
  return game.activatedPerks.includes('earl') ? chance * (1 - game.testCoverage / 100000) : chance;
}

export function automationRegressions(game: Game): boolean {
  return game.actions >= 15000;
}

export function addBug(game: Game): Item | null {
  if (!canGenerateBugs(game)) return null;
  const eligibleTemplates = bugTemplates.filter(template =>
    game.items.some(item => item.type === 'story' && item.id === template.story && item.done)
  );
  const availableTemplates = eligibleTemplates.filter(template =>
    !openBugs(game).some(bug =>
      bug.title === template.title || bug.title === `Automation regression: ${template.title}`
    )
  );
  const choices = availableTemplates.length ? availableTemplates : eligibleTemplates;
  const template = choices[Math.floor(Math.random() * choices.length)];
  if (!template) return null;
  game.bugCount++;
  const bug: Item = {
    id: `B-${String(game.bugCount).padStart(2, '0')}`,
    type: 'bug',
    title: automationRegressions(game) ? `Automation regression: ${template.title}` : template.title,
    detail: automationRegressions(game)
      ? `Fully automated code introduced this regression. ${template.detail}`
      : template.detail,
    required: 6 + Math.min(game.bugCount * 2, 10),
    progress: 0,
    done: false,
    inTest: false
  };
  game.items.unshift(bug);
  game.selected = bug.id;
  return bug;
}
