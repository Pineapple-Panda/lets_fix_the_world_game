import type { BoardColumn } from '../models/board.model.ts';
import type { Game } from '../models/game.model.ts';
import type { Item } from '../models/item.model.ts';
import { perks } from '../models/perk.model.ts';
import type { Perk } from '../models/perk.model.ts';
import {
  blueprint, bugTemplates, maintenanceTasks, maxReleaseTasks, minReleaseTasks, roadmap, taskId
} from './content.ts';
import type { RoadmapTask } from './content.ts';
import { nextVersion, versionForDeployments } from '../models/version.model.ts';

export { perks } from '../models/perk.model.ts';
export type { Game } from '../models/game.model.ts';
export type { Item } from '../models/item.model.ts';
export type { Perk, PerkId } from '../models/perk.model.ts';

/** Bugs can start to appear once this many total coding actions have been made. */
export const bugActionsThreshold = 100;

/** True for a non-negative safe integer (counts, budgets, action totals). */
function isCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/** True for a count that can still be incremented without leaving the safe integer range. */
function isIncrementable(value: number): boolean {
  return isCount(value) && value < Number.MAX_SAFE_INTEGER;
}

/** True when the action counters are valid and the last deployment does not lie in the future. */
function hasValidActionHistory(game: Game): boolean {
  return isCount(game.actions) && isCount(game.lastDeploymentActions) && game.lastDeploymentActions <= game.actions;
}

/** True when `cost` is a positive safe integer and the budget is valid and large enough to pay it. */
function canAfford(game: Game, cost: number): boolean {
  return Number.isSafeInteger(cost) && cost > 0 && isCount(game.budget) && game.budget >= cost;
}

export function newGame(): Game {
  return {
    items: blueprint.map(item => ({ ...item, progress: 0, done: false, inTest: false })),
    selected: null,
    automationTarget: null,
    actions: 0,
    budget: 0,
    lastDeploymentActions: 0,
    appVersion: versionForDeployments(0),
    testCoverage: 0,
    manualCoverageUpgrades: 0,
    autoCoverageUpgrades: 0,
    bugCount: 0,
    taskCount: blueprint.length,
    roadmapIndex: 0,
    seconds: 0,
    activatedPerks: [],
    deployments: 0,
    assistants: 0,
    assistantUpgrades: 0,
    agentTargets: [],
    agentCarry: []
  };
}

export function openBugs(game: Game): Item[] {
  return game.items.filter(item => item.type === 'bug' && !item.done);
}

/** Bugs are always available; tasks once total coding actions reach their unlock threshold. */
export function isAvailable(game: Game, item: Item): boolean {
  return item.type === 'bug' || game.actions >= (item.unlockAt ?? 0);
}

export function boardItems(game: Game): Item[] {
  return game.items.filter(item => isAvailable(game, item));
}

/** Tasks of the current release (the item list only ever holds the current release plus its bugs). */
export function releaseTasksOf(game: Game): Item[] {
  return game.items.filter(item => item.type === 'task');
}

/** A release can ship once every task and bug is done; nothing may be open or still in test. */
export function canDeploy(game: Game): boolean {
  return releaseTasksOf(game).length > 0 && game.items.every(item => item.done);
}

/** Tasks of the current release that are done. */
export function releaseTasksDone(game: Game): number {
  return releaseTasksOf(game).filter(item => item.done).length;
}

/** The selected task or bug, if it can still be worked on. */
export function selectedWorkItem(game: Game): Item | undefined {
  return game.items.find(item => item.id === game.selected && !item.done);
}

/** Board columns for the visible items; the IN TEST column only exists while Earl is active. */
export function boardColumns(game: Game): BoardColumn[] {
  const todo: Item[] = [];
  const inProgress: Item[] = [];
  const inTest: Item[] = [];
  const done: Item[] = [];
  for (const item of boardItems(game)) {
    if (item.done) done.push(item);
    else if (item.inTest) inTest.push(item);
    else if (item.progress > 0 || item.id === game.selected) inProgress.push(item);
    else todo.push(item);
  }
  return [
    { name: 'TO DO', items: todo },
    { name: 'IN PROGRESS', items: inProgress },
    ...(game.activatedPerks.includes('earl') ? [{ name: 'IN TEST', items: inTest }] : []),
    { name: 'DONE', items: done }
  ];
}

export function deploymentBudgetReward(game: Game): number {
  if (
    !isCount(game.deployments) ||
    !hasValidActionHistory(game) ||
    !isCount(game.appVersion.major) ||
    !isCount(game.appVersion.minor) || game.appVersion.minor > 9 ||
    game.appVersion.patch !== 0
  ) return 0;
  const currentVersion = versionForDeployments(game.deployments);
  if (game.appVersion.major !== currentVersion.major || game.appVersion.minor !== currentVersion.minor) return 0;
  const releaseVersion = nextVersion(game.appVersion);
  if (!Number.isSafeInteger(releaseVersion.major)) return 0;
  const versionMultiplier = releaseVersion.major + releaseVersion.minor / 10;
  const reward = Math.round((game.actions - game.lastDeploymentActions) * versionMultiplier);
  return isCount(reward) ? reward : 0;
}

/**
 * Ships the release: pays the reward, drops every finished item and starts the next release.
 * Nothing of past releases is kept, so the game state stays small no matter how often you deploy.
 */
export function deploy(game: Game, random: () => number = Math.random): boolean {
  if (
    !canDeploy(game) ||
    !hasValidActionHistory(game) ||
    !isCount(game.budget)
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
  game.deployments++;
  const next = nextReleaseTasks(game.roadmapIndex, random);
  game.roadmapIndex = next.roadmapIndex;
  game.items = next.tasks.map(task => ({
    id: taskId(++game.taskCount),
    type: 'task' as const,
    title: task.title,
    detail: task.detail,
    required: task.required,
    progress: 0,
    done: false,
    inTest: false
  }));
  game.selected = null;
  game.automationTarget = null;
  game.agentTargets = game.agentTargets.map(() => null);
  return true;
}

/**
 * The tasks of the next release: a random number (3–25) of the next roadmap entries, in roadmap order.
 * Once the roadmap runs out, the release is topped up with random, distinct maintenance tasks.
 */
export function nextReleaseTasks(
  roadmapIndex: number,
  random: () => number = Math.random
): { tasks: RoadmapTask[]; roadmapIndex: number } {
  const count = minReleaseTasks + Math.floor(random() * (maxReleaseTasks - minReleaseTasks + 1));
  const planned = roadmap.slice(roadmapIndex, roadmapIndex + count);
  const pool = [...maintenanceTasks];
  for (let index = pool.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap]!, pool[index]!];
  }
  const filler = pool.slice(0, Math.max(0, count - planned.length));
  return { tasks: [...planned, ...filler], roadmapIndex: roadmapIndex + planned.length };
}

/** Deploys automatically when Continuous Deployment is active and a release is ready. */
export function autoDeploy(game: Game): boolean {
  return game.activatedPerks.includes('auto-deploy') && deploy(game);
}

/** Moves finished work forward: to IN TEST while Earl is active, otherwise straight to DONE. */
export function settle(game: Game): void {
  for (const item of game.items) {
    if (item.done || item.inTest || item.progress < item.required) continue;
    if (game.activatedPerks.includes('earl')) item.inTest = true;
    else item.done = true;
    const agent = game.agentTargets.indexOf(item.id);
    if (agent !== -1) game.agentTargets[agent] = null;
  }
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
  // Up to three perks: the next ones in unlock order. Unlocked testing perks are always kept in the list.
  const priorityIds = ['earl', 'testing-skills', 'auto-testing'];
  const available = perks.filter(perk => !game.activatedPerks.includes(perk.id));
  const promoted = available.filter(perk => priorityIds.includes(perk.id) && perkUnlocked(game, perk));
  const result = available.filter(perk => !promoted.includes(perk)).slice(0, 3 - promoted.length);
  return [...result, ...promoted];
}

export function coveragePercent(game: Game): number {
  return game.testCoverage / 1000;
}

export const coverageCost = 1;

/** Coverage units (1/1000 percentage point) added by each manual or automatic coverage upgrade: 0.005 pp. */
export const coverageUpgradeStep = 5;
/** Budget cost of one manual coverage upgrade (requires Level Up Testing Skills). */
export const manualCoverageUpgradeCost = 2000;
/** Budget cost of one automatic coverage upgrade (requires Automate Testing). */
export const autoCoverageUpgradeCost = 5000;

/** Coverage units added by one manual "Improve coverage" click. */
export function coverageStep(game: Game): number {
  return (game.activatedPerks.includes('testing-skills') ? 5 : 1) + coverageUpgradeStep * game.manualCoverageUpgrades;
}

/** Coverage units Earl adds automatically each second (0 without Automate Testing). */
export function autoCoverageRate(game: Game): number {
  if (!game.activatedPerks.includes('earl') || !game.activatedPerks.includes('auto-testing')) return 0;
  return 1 + coverageUpgradeStep * game.autoCoverageUpgrades;
}

export function upgradeManualCoverage(game: Game): boolean {
  if (
    !game.activatedPerks.includes('earl') ||
    !game.activatedPerks.includes('testing-skills') ||
    !isIncrementable(game.manualCoverageUpgrades) ||
    !canAfford(game, manualCoverageUpgradeCost)
  ) return false;
  game.budget -= manualCoverageUpgradeCost;
  game.manualCoverageUpgrades++;
  return true;
}

export function upgradeAutoCoverage(game: Game): boolean {
  if (
    !game.activatedPerks.includes('earl') ||
    !game.activatedPerks.includes('auto-testing') ||
    !isIncrementable(game.autoCoverageUpgrades) ||
    !canAfford(game, autoCoverageUpgradeCost)
  ) return false;
  game.budget -= autoCoverageUpgradeCost;
  game.autoCoverageUpgrades++;
  return true;
}

export function improveCoverage(game: Game): boolean {
  if (!game.activatedPerks.includes('earl') || game.testCoverage >= 100000 || !canAfford(game, coverageCost)) return false;
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
  while (isCount(budget) && isCount(limit)) {
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
    !isIncrementable(game.assistants) || game.assistants < 1 ||
    !canAfford(game, cost)
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
    !isIncrementable(game.assistantUpgrades) ||
    !canAfford(game, cost)
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
  const assistantsOnBugs = assistantsFixBugs(game) && oldestOpenBug(game) !== undefined;
  if (!assistantsOnBugs) {
    for (let i = 0; i < assistantCount(game); i++) {
      const target = game.activatedPerks.includes('multi-agent') ? game.agentTargets[i] : game.automationTarget;
      addTargetRate(target, assistantOutput(game));
    }
  }
  const bugWork = openBugs(game).reduce((total, bug) => total + Math.max(0, bug.required - bug.progress), 0);
  const bugRate = (game.activatedPerks.includes('bug-fix-agent') && oldestOpenBug(game) ? 1 : 0) +
    (assistantsOnBugs ? assistantCount(game) * assistantOutput(game) : 0);
  return Array.from(rates, ([item, rate]) => Math.min(rate, item.required - item.progress))
    .reduce((total, rate) => total + rate, 0) +
    Math.min(bugRate, bugWork);
}

/** True when assistants fix open bugs before returning to their tasks. */
export function assistantsFixBugs(game: Game): boolean {
  return game.activatedPerks.includes('ai-testing-subscription') && assistantCount(game) > 0;
}

export function automate(game: Game): void {
  const tests = game.items.filter(item => item.inTest);
  const coverageRate = autoCoverageRate(game);
  if (coverageRate) game.testCoverage = Math.min(100000, game.testCoverage + coverageRate);
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
    const bug = assistantsFixBugs(game) ? oldestOpenBug(game) : undefined;
    const target = game.activatedPerks.includes('multi-agent') ? game.agentTargets[i] : game.automationTarget;
    const item = bug ?? automationTask(game, target);
    if (!item) continue;
    const carry = game.agentCarry[i];
    if (carry === undefined) continue;
    const tenths = carry + assistantOutputTenths(game);
    game.agentCarry[i] = tenths % 10;
    const amount = Math.floor(tenths / 10);
    if (bug) {
      if (amount > 0) applyWork(game, bug, amount);
    } else work(game, item.id, amount, true);
  }
  const bug = game.activatedPerks.includes('bug-fix-agent') ? oldestOpenBug(game) : undefined;
  if (bug) applyWork(game, bug, 1);
  const passChance = testPassChance(game);
  for (const item of tests) {
    item.inTest = false;
    if (Math.random() < passChance) item.done = true;
    else item.progress = Math.floor(item.progress / 2);
    settle(game);
  }
}

/** Chance that an item in IN TEST passes: 50% without coverage, rising linearly to 100% at full coverage. */
export function testPassChance(game: Game): number {
  return 0.5 + 0.5 * Math.min(100000, game.testCoverage) / 100000;
}

export function canGenerateBugs(game: Game): boolean {
  return game.actions >= bugActionsThreshold && bugTemplates.some(template => bugTemplateEligible(game, template.task));
}

/** A bug template applies once its task is done; after the first release every first-release task has shipped. */
function bugTemplateEligible(game: Game, task: string): boolean {
  return game.deployments > 0 || game.items.some(item => item.id === task && item.done);
}

export function bugChance(game: Game): number {
  const chance = game.actions >= 15000 ? 0.60 :
    game.actions >= 11000 ? 0.30 :
    game.actions >= 8500 ? 0.16 :
    game.actions >= 7500 ? 0.12 :
    game.actions >= 4000 ? 0.08 : 0.04;
  const covered = game.activatedPerks.includes('earl') ? chance * (1 - game.testCoverage / 100000) : chance;
  // There is no hard cap on simultaneous bugs; instead every open bug makes the next one less likely.
  return covered / (1 + openBugs(game).length) ** 2;
}

export function automationRegressions(game: Game): boolean {
  return game.actions >= 15000;
}

export function addBug(game: Game): Item | null {
  if (!canGenerateBugs(game)) return null;
  const eligibleTemplates = bugTemplates.filter(template => bugTemplateEligible(game, template.task));
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
