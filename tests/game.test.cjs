// Gameplay checks. Run with `npm test`. Every check runs even if an earlier one fails.
const assert = require('node:assert/strict');
const game = require('../src/app/game/game.ts');
const content = require('../src/app/game/content.ts');
const storage = require('../src/app/game/storage.ts');
const launched = require('../src/app/game/launched.ts');
const version = require('../src/app/models/version.model.ts');

const {
  newGame, perks, perkUnlocked, openPerks, activePerks, activatePerk, isAvailable, boardItems, boardColumns,
  selectItem, selectedWorkItem, work, canDeploy, deploy, autoDeploy, deploymentBudgetReward,
  releaseTasksDone, releaseTasksOf, openBugs, addBug, canGenerateBugs, bugChance, bugActionsThreshold,
  automationRegressions, automate, automationRate, currentAutomationRate, assistantCount, assistantOutput,
  addAssistant, nextAssistantCount, assistantLimit, assignAgent, upgradeAssistants, nextAssistantUpgrade,
  assistantsFixBugs, coveragePercent, coverageCost, coverageStep, improveCoverage, autoCoverageRate,
  upgradeManualCoverage, upgradeAutoCoverage, manualCoverageUpgradeCost, autoCoverageUpgradeCost,
  coverageUpgradeStep, testPassChance
} = game;

// ---------- tiny test runner ----------

const failures = [];
let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (error) {
    failures.push({ name, error });
  }
}

// ---------- helpers ----------

function withRandom(value, callback) {
  const original = Math.random;
  Math.random = typeof value === 'function' ? value : () => value;
  try {
    return callback();
  } finally {
    Math.random = original;
  }
}

const item = (state, id) => state.items.find(entry => entry.id === id);

/** Activates perks regardless of their unlock threshold (keeps the action count unchanged). */
function grant(state, ...ids) {
  const actions = state.actions;
  state.actions = Math.max(actions, 1e6);
  for (const id of ids) assert.equal(activatePerk(state, id), true, id);
  state.actions = actions;
}

/** Works through every available task (and bug) manually until nothing is left or the release is done. */
function finishRelease(state) {
  for (let guard = 0; guard < 1000 && !canDeploy(state); guard++) {
    const next = openBugs(state).find(bug => !bug.inTest && bug.progress < bug.required) ??
      boardItems(state).find(entry => entry.type === 'task' && !entry.done && !entry.inTest && entry.progress < entry.required);
    if (next) {
      assert.equal(work(state, next.id, next.required - next.progress), true, next.id);
    } else {
      withRandom(0, () => automate(state)); // resolve anything waiting in IN TEST
    }
  }
  assert.equal(canDeploy(state), true, 'release could not be finished');
}

/** A game where bugs can appear: the first planning tasks are done and 100 actions are reached. */
function bugReadyGame() {
  const state = newGame();
  for (let number = 1; number <= 5; number++) {
    const task = item(state, content.taskId(number));
    work(state, task.id, task.required);
  }
  state.actions = bugActionsThreshold;
  return state;
}

const makeBug = state => withRandom(0, () => addBug(state));

function memoryStorage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

// ---------- content and a new game ----------

test('a new game starts with the 15 tasks of the first release', () => {
  const state = newGame();
  assert.equal(state.items.length, 15);
  assert.deepEqual(state.items.map(entry => entry.id), Array.from({ length: 15 }, (_, index) => content.taskId(index + 1)));
  assert.ok(state.items.every(entry => entry.type === 'task' && entry.progress === 0 && !entry.done && !entry.inTest));
  assert.deepEqual(state.items.map(entry => entry.required), [10, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20, 25, 25, 30, 30]);
  assert.deepEqual(state.items.map(entry => entry.unlockAt), [0, 0, 0, 0, 0, 50, 50, 50, 50, 110, 110, 150, 150, 150, 150]);
  assert.equal(state.actions, 0);
  assert.equal(state.budget, 0);
  assert.equal(state.deployments, 0);
  assert.deepEqual(state.appVersion, { major: 0, minor: 0, patch: 0 });
  assert.ok(!('archivedIds' in state));
});

test('every bug template belongs to a task of the first release', () => {
  const ids = new Set(content.blueprint.map(entry => entry.id));
  assert.ok(content.bugTemplates.length > 0);
  for (const template of content.bugTemplates) assert.ok(ids.has(template.task), template.task);
});

// ---------- availability by total coding actions ----------

test('tasks unlock as total coding actions grow', () => {
  const state = newGame();
  const available = () => boardItems(state).map(entry => entry.id);
  assert.deepEqual(available(), ['T-01', 'T-02', 'T-03', 'T-04', 'T-05']);
  assert.equal(selectItem(state, 'T-06'), false);
  assert.equal(work(state, 'T-06', 1), false);
  state.actions = 49;
  assert.equal(isAvailable(state, item(state, 'T-06')), false);
  state.actions = 50;
  assert.deepEqual(available().slice(5), ['T-06', 'T-07', 'T-08', 'T-09']);
  state.actions = 110;
  assert.equal(available().length, 11);
  state.actions = 150;
  assert.equal(available().length, 15);
});

test('working through the first release manually never gets stuck', () => {
  const state = newGame();
  finishRelease(state);
  assert.equal(state.actions, 260);
  assert.equal(releaseTasksDone(state), 15);
});

// ---------- selecting and working ----------

test('manual work adds progress and actions, capped at the required amount', () => {
  const state = newGame();
  assert.equal(selectItem(state, 'T-01'), true);
  assert.equal(state.selected, 'T-01');
  assert.equal(state.automationTarget, 'T-01');
  assert.equal(selectedWorkItem(state).id, 'T-01');
  assert.equal(work(state, 'T-01', 4), true);
  assert.equal(item(state, 'T-01').progress, 4);
  assert.equal(state.actions, 4);
  assert.equal(work(state, 'T-01', 100), true);
  assert.equal(item(state, 'T-01').progress, 10);
  assert.equal(item(state, 'T-01').done, true);
  assert.equal(state.actions, 10, 'only the remaining work counts');
  assert.equal(work(state, 'T-01', 1), false, 'done tasks take no more work');
  assert.equal(selectItem(state, 'T-01'), false);
  assert.equal(selectedWorkItem(state), undefined);
  assert.equal(work(state, 'missing', 1), false);
});

test('board columns sort items by state', () => {
  const state = newGame();
  const names = () => boardColumns(state).map(column => column.name);
  const ids = name => boardColumns(state).find(column => column.name === name).items.map(entry => entry.id);
  assert.deepEqual(names(), ['TO DO', 'IN PROGRESS', 'DONE']);
  selectItem(state, 'T-02');
  work(state, 'T-01', 10);
  work(state, 'T-03', 3);
  assert.deepEqual(ids('IN PROGRESS'), ['T-02', 'T-03']);
  assert.deepEqual(ids('DONE'), ['T-01']);
  assert.deepEqual(ids('TO DO'), ['T-04', 'T-05']);
  grant(state, 'earl');
  assert.deepEqual(names(), ['TO DO', 'IN PROGRESS', 'IN TEST', 'DONE']);
});

// ---------- deploying ----------

test('a release can only be deployed once every task is done', () => {
  const state = newGame();
  assert.equal(canDeploy(state), false);
  assert.equal(deploy(state), false);
  for (const entry of state.items.slice(0, 14)) {
    state.actions = Math.max(state.actions, entry.unlockAt);
    work(state, entry.id, entry.required);
  }
  assert.equal(canDeploy(state), false, 'one task still open');
  state.actions = 150;
  work(state, 'T-15', 30);
  assert.equal(canDeploy(state), true);
});

test('deploying pays the reward, clears finished work and starts the next release', () => {
  const state = newGame();
  grant(state, 'code-assistant', 'multi-agent');
  finishRelease(state);
  state.agentTargets = ['T-15'];
  const reward = deploymentBudgetReward(state);
  assert.equal(reward, 260, 'v1.0 multiplies the actions since the last deploy by 1');
  assert.equal(deploy(state, () => 0.3), true);
  assert.equal(state.deployments, 1);
  assert.equal(state.budget, 260);
  assert.equal(state.lastDeploymentActions, 260);
  assert.deepEqual(state.appVersion, { major: 1, minor: 0, patch: 0 });
  assert.equal(state.items.length, 9, 'random 0.3 draws 3 + floor(0.3 * 23) = 9 tasks');
  assert.deepEqual(state.items.map(entry => entry.id), Array.from({ length: 9 }, (_, index) => content.taskId(16 + index)));
  assert.equal(state.taskCount, 24);
  assert.equal(state.roadmapIndex, 9);
  assert.deepEqual(state.items.map(entry => [entry.title, entry.required]),
    content.roadmap.slice(0, 9).map(task => [task.title, task.required]), 'the roadmap is worked through in order');
  assert.ok(state.items.every(entry => entry.type === 'task' && entry.unlockAt === undefined && !entry.done));
  assert.ok(state.items.every(entry => isAvailable(state, entry)), 'later releases are fully available');
  assert.equal(state.selected, null);
  assert.equal(state.automationTarget, null);
  assert.deepEqual(state.agentTargets, [null]);
  assert.equal(releaseTasksOf(state).length, 9);
  assert.equal(releaseTasksDone(state), 0);
  assert.equal(deploy(state), false);
});

test('each later release takes the next 3 to 25 roadmap tasks in order', () => {
  const titles = [...content.blueprint, ...content.roadmap, ...content.maintenanceTasks].map(task => task.title);
  assert.equal(new Set(titles).size, titles.length, 'task titles are unique');
  assert.ok([...content.roadmap, ...content.maintenanceTasks].every(task => Number.isInteger(task.required) && task.required > 0));
  assert.deepEqual(game.nextReleaseTasks(0, () => 0).tasks, content.roadmap.slice(0, 3));
  assert.equal(game.nextReleaseTasks(0, () => 0).roadmapIndex, 3);
  assert.equal(game.nextReleaseTasks(0, () => 0.999999).tasks.length, 25);
  const sizes = new Set();
  let index = 0;
  for (let release = 0; release < 100; release++) {
    const next = game.nextReleaseTasks(index);
    assert.ok(next.tasks.length >= 3 && next.tasks.length <= 25, String(next.tasks.length));
    assert.equal(new Set(next.tasks.map(task => task.title)).size, next.tasks.length, 'no duplicates in a release');
    assert.deepEqual(next.tasks.slice(0, next.roadmapIndex - index), content.roadmap.slice(index, next.roadmapIndex));
    sizes.add(next.tasks.length);
    index = next.roadmapIndex;
  }
  assert.equal(index, content.roadmap.length, 'the whole roadmap gets shipped');
  assert.ok(sizes.size > 10, 'release sizes vary');
});

test('after the roadmap, releases are topped up with maintenance work', () => {
  const end = content.roadmap.length - 2;
  const next = game.nextReleaseTasks(end, () => 0.5);
  assert.equal(next.roadmapIndex, content.roadmap.length);
  assert.deepEqual(next.tasks.slice(0, 2), content.roadmap.slice(end));
  const maintenanceTitles = new Set(content.maintenanceTasks.map(task => task.title));
  assert.ok(next.tasks.slice(2).length > 0 && next.tasks.slice(2).every(task => maintenanceTitles.has(task.title)));
  const later = game.nextReleaseTasks(content.roadmap.length, () => 0);
  assert.equal(later.tasks.length, 3);
  assert.ok(later.tasks.every(task => maintenanceTitles.has(task.title)));
  assert.equal(game.nextReleaseTasks(content.roadmap.length, () => 0.999999).tasks.length, content.maintenanceTasks.length,
    'a maintenance-only release is capped by the size of the pool');
});

test('task ids keep counting up across releases', () => {
  const state = newGame();
  finishRelease(state);
  deploy(state, () => 0);
  assert.deepEqual(state.items.map(entry => entry.id), ['T-16', 'T-17', 'T-18']);
  finishRelease(state);
  state.actions += 100;
  assert.equal(deploymentBudgetReward(state), Math.round((state.actions - state.lastDeploymentActions) * 1.1));
  deploy(state, () => 0);
  assert.deepEqual(state.items.map(entry => entry.id), ['T-19', 'T-20', 'T-21']);
  assert.deepEqual(state.appVersion, { major: 1, minor: 1, patch: 0 });
});

test('the game state stays small no matter how often you deploy', () => {
  const state = newGame();
  for (let release = 0; release < 60; release++) {
    finishRelease(state);
    assert.equal(deploy(state), true);
  }
  assert.equal(state.deployments, 60);
  assert.ok(state.items.length >= 3 && state.items.length <= 25);
  assert.ok(JSON.stringify(state).length < 10000);
});

test('Continuous Deployment deploys automatically once a release is ready', () => {
  const state = newGame();
  finishRelease(state);
  assert.equal(autoDeploy(state), false, 'no auto deploy without the perk');
  assert.equal(state.deployments, 0);
  grant(state, 'auto-deploy');
  assert.equal(autoDeploy(state), true);
  assert.equal(state.deployments, 1);
  assert.equal(autoDeploy(state), false, 'nothing to deploy until the next release is done');
});

// ---------- bugs ----------

test('bugs start at 100 total coding actions and only for finished tasks', () => {
  const early = newGame();
  work(early, 'T-01', 10);
  early.actions = bugActionsThreshold;
  assert.equal(canGenerateBugs(early), false, 'T-01 has no bug template');
  work(early, 'T-03', 10);
  early.actions = bugActionsThreshold - 1;
  assert.equal(canGenerateBugs(early), false);
  assert.equal(addBug(early), null);
  early.actions = bugActionsThreshold;
  assert.equal(canGenerateBugs(early), true);

  const nothingDone = newGame();
  nothingDone.actions = 500;
  assert.equal(canGenerateBugs(nothingDone), false, 'no finished task, no bug');

  const state = bugReadyGame();
  const seen = new Set();
  for (let index = 0; index < 50; index++) {
    const copy = structuredClone(state);
    const bug = withRandom(index / 50, () => addBug(copy));
    seen.add(bug.title);
  }
  assert.deepEqual([...seen].sort(), ['Reports lose their source', 'Reports stuck in “needs more info”']);
});

test('a new bug gets an id, an effort and is selected', () => {
  const state = bugReadyGame();
  const bug = makeBug(state);
  assert.equal(bug.id, 'B-01');
  assert.equal(bug.type, 'bug');
  assert.equal(bug.required, 8);
  assert.equal(state.items[0], bug);
  assert.equal(state.selected, 'B-01');
  assert.equal(makeBug(state).required, 10);
});

test('open bugs block manual task work and deploying', () => {
  const state = bugReadyGame();
  const bug = makeBug(state);
  assert.equal(work(state, 'T-06', 1), false);
  assert.equal(selectItem(state, 'T-06'), false);
  assert.equal(work(state, bug.id, 1, true), false, 'plain automation never fixes bugs');
  assert.equal(work(state, bug.id, bug.required), true);
  assert.equal(bug.done, true);
  assert.equal(work(state, 'T-06', 1), true);

  const release = newGame();
  finishRelease(release);
  release.actions = 1000;
  makeBug(release);
  assert.equal(canDeploy(release), false);
});

test('there is no cap on bugs, but each open bug makes the next one less likely', () => {
  const state = bugReadyGame();
  state.actions = 15000;
  const base = bugChance(state);
  assert.equal(base, 0.6);
  for (let count = 1; count <= 5; count++) {
    assert.ok(makeBug(state));
    assert.ok(Math.abs(bugChance(state) - base / (1 + count) ** 2) < 1e-12);
  }
});

test('the bug rate rises with total coding actions and falls with coverage', () => {
  const state = bugReadyGame();
  for (const [actions, chance] of [[100, 0.04], [3999, 0.04], [4000, 0.08], [7500, 0.12], [8500, 0.16], [11000, 0.3], [15000, 0.6]]) {
    state.actions = actions;
    assert.equal(bugChance(state), chance, String(actions));
  }
  grant(state, 'earl');
  state.testCoverage = 50000;
  assert.equal(bugChance(state), 0.3);
  assert.equal(automationRegressions(state), true);
  assert.match(makeBug(state).title, /^Automation regression: /);
});

test('after the first release every bug template can appear', () => {
  const state = newGame();
  finishRelease(state);
  deploy(state);
  state.actions = 1000;
  const titles = new Set();
  for (let index = 0; index < 100; index++) titles.add(withRandom(index / 100, () => addBug(structuredClone(state))).title);
  assert.equal(titles.size, content.bugTemplates.length);
});

// ---------- perks ----------

test('the perk list', () => {
  assert.deepEqual(perks.map(perk => [perk.id, perk.actionsRequired]), [
    ['stack-overflow', 50], ['build-pipeline', 200], ['code-assistant', 700], ['multi-agent', 1000],
    ['ram-upgrade', 2000], ['ai-subscription', 4000], ['auto-assigner', 6000], ['bug-fix-agent', 10000],
    ['earl', 17000], ['testing-skills', 20000], ['auto-testing', 25000], ['ai-testing-subscription', 28000],
    ['auto-deploy', 32000]
  ]);
  assert.equal(new Set(perks.map(perk => perk.icon)).size, perks.length, 'icons are unique');
});

test('perks unlock at their action threshold and activate once', () => {
  for (const perk of perks) {
    const state = newGame();
    state.actions = perk.actionsRequired - 1;
    assert.equal(perkUnlocked(state, perk), false, perk.id);
    assert.equal(activatePerk(state, perk.id), false, perk.id);
    state.actions = perk.actionsRequired;
    assert.equal(activatePerk(state, perk.id), true, perk.id);
    assert.equal(activatePerk(state, perk.id), false, perk.id);
    assert.deepEqual(activePerks(state).map(entry => entry.id), [perk.id]);
  }
});

test('the perk list previews the next perks in unlock order', () => {
  const byId = id => perks.find(perk => perk.id === id);
  const state = newGame();
  assert.deepEqual(openPerks(state), perks.slice(0, 3));
  state.activatedPerks = perks.slice(0, 8).map(perk => perk.id);
  state.actions = 16999;
  assert.deepEqual(openPerks(state), [byId('ai-testing-subscription'), byId('auto-deploy')], 'testing perks hidden until Earl unlocks');
  state.actions = 21000;
  assert.deepEqual(openPerks(state), [byId('auto-testing'), byId('earl'), byId('testing-skills')], 'unlocked testing perks are promoted');
  state.activatedPerks.push('earl', 'testing-skills');
  assert.deepEqual(openPerks(state), [byId('auto-testing'), byId('ai-testing-subscription'), byId('auto-deploy')]);
});

// ---------- automation ----------

test('simple perks automate the selected task', () => {
  const state = newGame();
  grant(state, 'stack-overflow', 'build-pipeline', 'ram-upgrade');
  assert.equal(automationRate(state), 4);
  selectItem(state, 'T-01');
  assert.equal(currentAutomationRate(state), 4);
  automate(state);
  assert.equal(item(state, 'T-01').progress, 4);
  assert.equal(state.actions, 4);
});

test('assistants: buying, upgrading and output', () => {
  const state = newGame();
  grant(state, 'code-assistant');
  assert.equal(assistantCount(state), 1);
  assert.equal(assistantOutput(state), 1);
  assert.equal(nextAssistantCount(state), 500);
  state.budget = 10000;
  assert.equal(addAssistant(state), false, 'more assistants need Multi Agent');
  grant(state, 'multi-agent');
  assert.equal(assistantLimit(state), 9, '10000 budget pays for 8 more assistants (500, 625, 782, ... 2385)');
  assert.equal(addAssistant(state), true);
  assert.equal(state.budget, 9500);
  assert.equal(assistantCount(state), 2);
  assert.equal(nextAssistantCount(state), 625);
  assert.equal(nextAssistantUpgrade(state), 500);
  assert.equal(upgradeAssistants(state), true);
  assert.equal(assistantOutput(state), 1.1);
  grant(state, 'ai-subscription');
  assert.equal(assistantOutput(state), 2.2);
});

test('multi agent assignments, auto assigner and carry-over of fractional output', () => {
  const state = newGame();
  grant(state, 'code-assistant', 'multi-agent');
  assert.equal(assignAgent(state, 'T-02'), true);
  assert.deepEqual(state.agentTargets, ['T-02']);
  assert.equal(assignAgent(state, 'T-02'), true, 'assigning again removes the agent');
  assert.deepEqual(state.agentTargets, [null]);
  assignAgent(state, 'T-02');
  state.assistantUpgrades = 5; // 1.5 actions per second
  automate(state);
  automate(state);
  assert.equal(item(state, 'T-02').progress, 3);
  grant(state, 'auto-assigner');
  work(state, 'T-02', 10);
  assert.deepEqual(state.agentTargets, [null], 'finished task frees the agent');
  automate(state);
  assert.equal(state.agentTargets[0], 'T-01', 'auto assigner picks the next free task');
});

test('Bug-fix Agent fixes the oldest bug, assistants join with the testing subscription', () => {
  const state = bugReadyGame();
  grant(state, 'code-assistant', 'multi-agent', 'bug-fix-agent');
  state.assistants = 2;
  state.agentTargets = [null, null];
  state.agentCarry = [0, 0];
  assignAgent(state, 'T-06');
  const older = makeBug(state);
  const newer = makeBug(state);
  automate(state);
  assert.equal(older.progress, 1);
  assert.equal(newer.progress, 0);
  assert.equal(item(state, 'T-06').progress, 1, 'without the subscription assistants keep coding');
  assert.equal(assistantsFixBugs(state), false);
  grant(state, 'ai-testing-subscription');
  assert.equal(assistantsFixBugs(state), true);
  automate(state);
  assert.equal(older.progress, 4, 'two assistants and the agent work on the oldest bug');
  assert.equal(item(state, 'T-06').progress, 1, 'tasks wait while bugs are open');
  assert.equal(state.agentTargets[0], 'T-06', 'assignments are kept');
});

// ---------- Earl and test coverage ----------

test('with Earl finished work goes to IN TEST and coverage decides the outcome', () => {
  const state = newGame();
  grant(state, 'earl');
  work(state, 'T-01', 10);
  assert.equal(item(state, 'T-01').inTest, true);
  assert.equal(item(state, 'T-01').done, false);
  assert.equal(work(state, 'T-01', 1), false);
  assert.equal(testPassChance(state), 0.5);
  withRandom(0.5, () => automate(state));
  assert.equal(item(state, 'T-01').inTest, false);
  assert.equal(item(state, 'T-01').progress, 5, 'a failed test halves the progress');
  work(state, 'T-01', 5);
  withRandom(0.49, () => automate(state));
  assert.equal(item(state, 'T-01').done, true);

  state.testCoverage = 100000;
  assert.equal(testPassChance(state), 1);
  work(state, 'T-02', 10);
  withRandom(0.999999, () => automate(state));
  assert.equal(item(state, 'T-02').done, true, 'full coverage always passes');
});

test('nothing deploys while work is still in test', () => {
  const state = newGame();
  grant(state, 'earl');
  for (const entry of state.items) {
    state.actions = Math.max(state.actions, entry.unlockAt);
    work(state, entry.id, entry.required);
  }
  assert.equal(canDeploy(state), false);
  withRandom(0, () => automate(state));
  assert.equal(canDeploy(state), true);
});

test('coverage: manual clicks and both upgrades', () => {
  const state = newGame();
  assert.equal(improveCoverage(state), false, 'needs Earl');
  grant(state, 'earl');
  state.budget = 100000;
  assert.equal(coverageCost, 1);
  assert.equal(coverageStep(state), 1);
  assert.equal(improveCoverage(state), true);
  assert.equal(coveragePercent(state), 0.001);
  assert.equal(upgradeManualCoverage(state), false, 'needs Improve Testing Skills');
  grant(state, 'testing-skills');
  assert.equal(coverageStep(state), 5);
  assert.equal(upgradeManualCoverage(state), true);
  assert.equal(state.budget, 100000 - 1 - manualCoverageUpgradeCost);
  assert.equal(coverageStep(state), 5 + coverageUpgradeStep);
  assert.equal(autoCoverageRate(state), 0);
  assert.equal(upgradeAutoCoverage(state), false, 'needs Automate Testing');
  grant(state, 'auto-testing');
  assert.equal(autoCoverageRate(state), 1);
  assert.equal(upgradeAutoCoverage(state), true);
  assert.equal(autoCoverageRate(state), 1 + coverageUpgradeStep);
  assert.equal(manualCoverageUpgradeCost, 2000);
  assert.equal(autoCoverageUpgradeCost, 5000);
  const before = state.testCoverage;
  automate(state);
  assert.equal(state.testCoverage, before + 6);
  state.testCoverage = 99999;
  automate(state);
  assert.equal(state.testCoverage, 100000, 'coverage is capped at 100%');
  assert.equal(improveCoverage(state), false);
});

// ---------- save and load ----------

test('a level 1 game survives saving and loading', () => {
  const store = memoryStorage();
  const state = bugReadyGame();
  grant(state, 'earl', 'code-assistant');
  makeBug(state);
  storage.saveGame(store, state);
  assert.deepEqual(storage.loadGame(store), state);
  assert.equal(storage.loadLaunched(store), null);
});

test('incompatible or corrupt saves are ignored', () => {
  const store = memoryStorage();
  assert.equal(storage.loadGame(store), null, 'no save');
  const old = newGame();
  store.data.set(storage.saveKey, JSON.stringify({ version: 5, game: old }));
  assert.equal(storage.loadGame(store), null, 'old versioned format');
  const missing = newGame();
  delete missing.agentCarry;
  store.data.set(storage.saveKey, JSON.stringify({ level: 1, game: missing }));
  assert.equal(storage.loadGame(store), null, 'missing field');
  const story = newGame();
  story.items.push({ ...story.items[0], id: 'S-01', type: 'story' });
  store.data.set(storage.saveKey, JSON.stringify({ level: 1, game: story }));
  assert.equal(storage.loadGame(store), null, 'stories are gone');
  store.data.set(storage.saveKey, '{not json');
  assert.equal(storage.loadGame(store), null, 'corrupt JSON');
  assert.equal(storage.loadLaunched(store), null);
});

test('level 2 saves are tiny and separate from level 1', () => {
  const store = memoryStorage();
  const raw = storage.saveLaunched(store, { actions: 5000, budget: 42 });
  assert.deepEqual(JSON.parse(raw), { level: 2, game: { actions: 5000, budget: 42 } });
  assert.deepEqual(storage.loadLaunched(store), { actions: 5000, budget: 42 });
  assert.equal(storage.loadGame(store), null);
  store.data.set(storage.saveKey, JSON.stringify({ level: 2, game: { actions: -1, budget: 0 } }));
  assert.equal(storage.loadLaunched(store), null);
});

// ---------- launch and level 2 ----------

test('the application can launch at 100% coverage and keeps only actions and budget', () => {
  const state = newGame();
  state.actions = 17000;
  assert.equal(launched.canLaunch(state), false);
  grant(state, 'earl');
  state.testCoverage = 99999;
  assert.equal(launched.launch(state), null);
  state.testCoverage = 100000;
  state.budget = 1234;
  assert.deepEqual(launched.launch(state), { actions: 17000, budget: 1234 });
});

test('level 2 adds 50 to 300 actions per second', () => {
  const live = { actions: 100, budget: 7 };
  assert.deepEqual(launched.tickLaunched(live, () => 0), { actions: 150, budget: 7 });
  assert.deepEqual(launched.tickLaunched(live, () => 0.999999), { actions: 400, budget: 7 });
  assert.deepEqual(live, { actions: 100, budget: 7 }, 'ticks do not mutate');
  for (let index = 0; index < 200; index++) {
    const gained = launched.tickLaunched(live).actions - live.actions;
    assert.ok(Number.isInteger(gained) && gained >= 50 && gained <= 300);
  }
});

// ---------- versions ----------

test('application versions', () => {
  assert.equal(version.formatVersion(version.versionForDeployments(0)), '0.0.0');
  assert.equal(version.formatVersion(version.versionForDeployments(1)), '1.0.0');
  assert.equal(version.formatVersion(version.versionForDeployments(10)), '1.9.0');
  assert.equal(version.formatVersion(version.versionForDeployments(11)), '2.0.0');
  assert.deepEqual(version.nextVersion({ major: 1, minor: 9, patch: 0 }), { major: 2, minor: 0, patch: 0 });
});

// ---------- report ----------

for (const { name, error } of failures) {
  console.error(`✗ ${name}\n  ${String(error && error.stack || error).split('\n').slice(0, 4).join('\n  ')}`);
}
if (failures.length) {
  console.error(`\n${failures.length} of ${failures.length + passed} gameplay checks failed.`);
  process.exit(1);
}
console.log(`Gameplay checks passed (${passed}).`);
