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
  assert.ok(content.maintenanceTasks.length >= 2 * content.maxReleaseTasks, 'pool is large enough to vary between releases');
  assert.equal(game.nextReleaseTasks(content.roadmap.length, () => 0.999999).tasks.length, 25);
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
  assert.deepEqual(openPerks(state), [byId('earl'), byId('testing-skills'), byId('auto-testing')], 'locked testing perks are previewed like any other perk');
  state.activatedPerks = perks.slice(0, 6).map(perk => perk.id);
  state.actions = 7000;
  assert.deepEqual(openPerks(state), [byId('auto-assigner'), byId('bug-fix-agent'), byId('earl')], 'Earl shows up as soon as it is among the next three');
  state.activatedPerks = perks.slice(0, 8).map(perk => perk.id);
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
  assert.equal(game.clicksPerPress(state), 1);
  assert.equal(upgradeAssistants(state), true);
  assert.equal(game.clicksPerPress(state), 2, 'each performance upgrade adds one extra click per press');
  assert.equal(assistantOutput(state), 1, 'performance upgrades no longer boost assistants');
  assert.equal(nextAssistantUpgrade(state), 625);
  assert.equal(upgradeAssistants(state), true);
  assert.equal(game.clicksPerPress(state), 3);
  grant(state, 'ai-subscription');
  assert.equal(assistantOutput(state), 2);
});

test('multi agent assignments and auto assigner', () => {
  const state = newGame();
  grant(state, 'code-assistant', 'multi-agent');
  assert.equal(assignAgent(state, 'T-02'), true);
  assert.deepEqual(state.agentTargets, ['T-02']);
  assert.equal(assignAgent(state, 'T-02'), true, 'assigning again removes the agent');
  assert.deepEqual(state.agentTargets, [null]);
  assignAgent(state, 'T-02');
  automate(state);
  automate(state);
  assert.equal(item(state, 'T-02').progress, 2);
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

const liveState = overrides => ({
  actions: 40000, budget: 0, seconds: 0, budgetActions: 40000, perks: [], serverSlots: 1, epics: [], products: [], focus: 0, rentals: [],
  worldProgress: { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 }, ...overrides
});

test('level 2 saves are small and separate from level 1', () => {
  const store = memoryStorage();
  const state = liveState({ budget: 42, perks: ['workflow-abstraction'], epics: [{ id: 'climate-algorithm', progress: 3, done: false }] });
  const raw = storage.saveLaunched(store, state);
  assert.deepEqual(JSON.parse(raw), { level: 2, game: state });
  assert.ok(raw.length < 500);
  assert.deepEqual(storage.loadLaunched(store), state);
  assert.equal(storage.loadGame(store), null);
  store.data.set(storage.saveKey, JSON.stringify({ level: 2, game: { actions: 5000, budget: 42 } }));
  assert.equal(storage.loadLaunched(store), null, 'the old two-field level 2 save is incompatible');
  store.data.set(storage.saveKey, JSON.stringify({ level: 2, game: liveState({ actions: -1 }) }));
  assert.equal(storage.loadLaunched(store), null);
});

// ---------- launch and level 2 ----------

test('the application can launch at 100% coverage and keeps only actions and budget', () => {
  const state = newGame();
  state.actions = 17000;
  assert.equal(launched.canLaunch(state), false);
  grant(state, 'earl', 'code-assistant', 'auto-deploy');
  state.testCoverage = 99999;
  assert.equal(launched.launch(state), null);
  state.testCoverage = 100000;
  state.budget = 1234;
  assert.deepEqual(launched.launch(state), {
    actions: 17000, budget: 1234, seconds: 0, budgetActions: 17000, perks: [], serverSlots: 1, epics: [], products: [], focus: 0,
    rentals: [], worldProgress: { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 }
  }, 'level 1 perks do not carry over');
});

test('skipping level 1 starts level 2 with 34,000 actions and 3,000 budget', () => {
  assert.deepEqual(launched.skippedLevelTwo(), {
    actions: 34000, budget: 3000, seconds: 0, budgetActions: 34000, perks: [], serverSlots: 1, epics: [], products: [], focus: 0,
    rentals: [], worldProgress: { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 }
  });
  assert.notEqual(launched.skippedLevelTwo(), launched.skippedLevelTwo(), 'a fresh object every time');
});

test('level 2 adds 50 to 300 actions per second', () => {
  const live = liveState({ actions: 100, budgetActions: 100 });
  assert.equal(launched.tickLaunched(live, () => 0).actions, 150);
  assert.equal(launched.tickLaunched(live, () => 0.999999).actions, 400);
  assert.equal(live.actions, 100, 'ticks do not mutate');
  for (let index = 0; index < 200; index++) {
    const gained = launched.tickLaunched(live).actions - live.actions;
    assert.ok(Number.isInteger(gained) && gained >= 50 && gained <= 300);
  }
});

test('every 5 seconds the budget grows by the new actions (1 budget per action)', () => {
  let live = liveState({ budget: 7 });
  for (let second = 1; second <= 4; second++) {
    live = launched.tickLaunched(live, () => 0);
    assert.equal(live.budget, 7, 'no payout before 5 seconds');
  }
  live = launched.tickLaunched(live, () => 0);
  assert.equal(live.seconds, 5);
  assert.equal(launched.budgetPerAction, 1);
  assert.equal(live.budget, 7 + 5 * 50);
  assert.equal(live.budgetActions, live.actions);
  for (let second = 1; second <= 5; second++) live = launched.tickLaunched(live, () => 0.999999);
  assert.equal(live.budget, 7 + 5 * 50 + 5 * 300);
});

test('the focus slider trades actions against budget', () => {
  const neutral = liveState();
  assert.equal(launched.actionBoost(neutral), 1);
  assert.equal(launched.budgetBoost(neutral), 1);
  const features = launched.setFocus(neutral, -100);
  assert.equal(launched.actionBoost(features), 1.5, 'full "ship features": +50% actions');
  assert.equal(launched.budgetBoost(features), 0, 'fully left: no budget from new actions');
  assert.equal(launched.tickLaunched(features, () => 0).actions, neutral.actions + 75);
  const money = launched.setFocus(neutral, 100);
  assert.equal(launched.actionBoost(money), 0.5, 'fully right: -50% actions');
  assert.equal(launched.budgetBoost(money), 2, 'full "monetise": double budget per new action');
  let live = money;
  for (let second = 0; second < 5; second++) live = launched.tickLaunched(live, () => 0);
  assert.equal(live.actions, money.actions + 5 * 25);
  assert.equal(live.budget, 5 * 25 * 2);
  let starved = features;
  for (let second = 0; second < 5; second++) starved = launched.tickLaunched(starved, () => 0);
  assert.equal(starved.budget, 0, 'shipping features only earns no budget');
  const half = launched.setFocus(neutral, -50);
  assert.equal(launched.actionBoost(half), 1.25);
  assert.equal(launched.budgetBoost(half), 0.5, 'half left: half the budget');
  assert.equal(launched.actionBoost(launched.setFocus(neutral, 50)), 0.75);
  assert.equal(launched.setFocus(neutral, 500).focus, 100, 'clamped');
  assert.equal(launched.setFocus(neutral, -37.4).focus, -37);
  assert.equal(launched.setFocus(neutral, 0), null, 'no change');
  assert.equal(launched.setFocus(neutral, Number.NaN), null);
  const store = memoryStorage();
  storage.saveLaunched(store, half);
  assert.deepEqual(storage.loadLaunched(store), half);
  store.data.set(storage.saveKey, JSON.stringify({ level: 2, game: { ...half, focus: 150 } }));
  assert.equal(storage.loadLaunched(store), null, 'focus out of range');
});

test('every Add Server adds one step to the focus effect (x2, x3, x4, ...)', () => {
  assert.equal(launched.focusPower(liveState()), 1);
  const oneServer = liveState({ serverSlots: 2, focus: -100 });
  assert.equal(launched.focusPower(oneServer), 2);
  assert.equal(launched.actionBoost(oneServer), 2, '+100% actions with one extra server');
  const twoServers = liveState({ serverSlots: 3, focus: 100 });
  assert.equal(launched.focusPower(twoServers), 3);
  assert.equal(launched.budgetBoost(twoServers), 4, '+300% budget with two extra servers');
  assert.equal(launched.focusPower(liveState({ serverSlots: 11 })), 11, 'ten extra servers: x11, not x1024');
  assert.equal(launched.actionBoost(twoServers), 0.5, 'the penalty does not grow with servers');
  assert.equal(launched.budgetBoost(liveState({ serverSlots: 3, focus: -100 })), 0, 'budget never goes below 0');
  const half = liveState({ serverSlots: 2, focus: 50 });
  assert.equal(launched.budgetBoost(half), 2);
  let live = launched.activateLaunchedPerk(liveState({ actions: 100000, perks: ['workflow-abstraction'], focus: -100 }), 'add-server');
  assert.equal(launched.actionBoost(live), 2, 'activating Add Server doubles it right away');
});

test('the first level 2 perk unlocks at 35,000 actions and brings the server online', () => {
  const live = liveState({ actions: 34999 });
  assert.deepEqual(launched.openLaunchedPerks(live).map(perk => perk.id), ['workflow-abstraction', 'add-server', 'network-financing']);
  assert.equal(launched.activateLaunchedPerk(live, 'workflow-abstraction'), null);
  assert.equal(launched.serverOnline(live), false);
  const ready = liveState({ actions: 35000 });
  const active = launched.activateLaunchedPerk(ready, 'workflow-abstraction');
  assert.deepEqual(active.perks, ['workflow-abstraction']);
  assert.equal(launched.serverOnline(active), true);
  assert.equal(launched.activateLaunchedPerk(active, 'workflow-abstraction'), null, 'only once');
  assert.deepEqual(launched.openLaunchedPerks(active).map(perk => perk.id), ['add-server', 'network-financing']);
  assert.equal(launched.activateLaunchedPerk(ready, 'earl'), null, 'level 1 perks are not available any more');
});

test('Add Server comes back every 50,000 actions from 100,000 on and adds one slot', () => {
  const offline = liveState({ actions: 100000 });
  assert.equal(launched.activateLaunchedPerk(offline, 'add-server'), null, 'needs the server first');
  let live = liveState({ actions: 99999, perks: ['workflow-abstraction'] });
  assert.equal(launched.addServerPerk(live).actionsRequired, 100000);
  assert.equal(launched.activateLaunchedPerk(live, 'add-server'), null);
  live.actions = 100000;
  live = launched.activateLaunchedPerk(live, 'add-server');
  assert.equal(live.serverSlots, 2);
  assert.equal(launched.addedServers(live), 1);
  assert.equal(launched.addServerPerk(live).actionsRequired, 150000);
  assert.equal(launched.activateLaunchedPerk(live, 'add-server'), null, 'not again before 150,000');
  live.actions = 260000;
  live = launched.activateLaunchedPerk(live, 'add-server');
  live = launched.activateLaunchedPerk(live, 'add-server');
  assert.equal(live.serverSlots, 4);
  assert.equal(launched.addServerPerk(live).actionsRequired, 250000);
  live = launched.activateLaunchedPerk(live, 'add-server');
  assert.equal(launched.addServerPerk(live).actionsRequired, 300000);
  assert.equal(launched.activateLaunchedPerk(live, 'add-server'), null);
  assert.deepEqual(live.perks, ['workflow-abstraction'], 'Add Server is not stored as a one-time perk');
});

test('"Who Pays for All This?" unlocks at 250,000 actions and opens Network & Financing', () => {
  const early = liveState({ actions: 249999 });
  assert.equal(launched.activateLaunchedPerk(early, 'network-financing'), null);
  assert.equal(launched.networkOnline(early), false);
  const ready = launched.activateLaunchedPerk(liveState({ actions: 250000 }), 'network-financing');
  assert.equal(launched.networkOnline(ready), true);
  assert.equal(launched.serverOnline(ready), false, 'independent of the server perk');
  assert.equal(launched.activateLaunchedPerk(ready, 'network-financing'), null, 'only once');
  const later = liveState({ perks: ['workflow-abstraction'], serverSlots: 5 });
  assert.deepEqual(launched.openLaunchedPerks(later).map(perk => perk.id), ['network-financing', 'add-server'],
    'perks are listed by unlock threshold (Add Server now at 300,000)');
});

test('epics cost budget, take server time and need a free server slot', () => {
  const offline = liveState({ budget: 10000 });
  assert.equal(launched.startEpic(offline, 'climate-algorithm'), null, 'needs the server');
  const poor = liveState({ budget: 4999, perks: ['workflow-abstraction'] });
  assert.equal(launched.canStartEpic(poor, 'climate-algorithm'), false);
  assert.equal(launched.serverLoad(poor), 0);

  let live = launched.startEpic(liveState({ budget: 6000, perks: ['workflow-abstraction'] }), 'climate-algorithm');
  assert.equal(live.budget, 1000);
  assert.equal(launched.serverLoad(live), 1, 'one epic fills the single slot');
  assert.equal(launched.startEpic(live, 'climate-algorithm'), null, 'an epic runs only once');
  assert.equal(launched.epicDefinition('climate-algorithm').duration, 20);
  for (let second = 1; second < 20; second++) live = launched.tickLaunched(live, () => 0);
  assert.equal(live.epics[0].progress, 19);
  assert.equal(live.epics[0].done, false);
  live = launched.tickLaunched(live, () => 0);
  assert.equal(live.epics[0].done, true);
  assert.equal(launched.serverLoad(live), 0, 'a finished epic frees its slot');
  live = launched.tickLaunched(live, () => 0);
  assert.equal(live.epics[0].progress, 20, 'finished epics stop counting');
});

test('climate epics build on each other and unlock the feature at the end', () => {
  const chain = launched.goalEpics('climate');
  assert.deepEqual(chain.map(epic => [epic.id, epic.cost, epic.duration]), [
    ['climate-algorithm', 5000, 20],
    ['climate-collect-measurements', 10000, 120],
    ['climate-aggregate-measurements', 15000, 60],
    ['climate-clean-data', 20000, 60],
    ['climate-feed-algorithm', 25000, 180],
    ['climate-standalone-api', 700000, 300]
  ]);
  let live = liveState({ budget: 2000000, perks: ['workflow-abstraction'], serverSlots: 5 });
  assert.equal(launched.epicUnlocked(live, 'climate-algorithm'), true);
  assert.equal(launched.epicUnlocked(live, 'climate-collect-measurements'), false);
  assert.equal(launched.startEpic(live, 'climate-collect-measurements'), null, 'needs the previous epic first');
  for (const [index, epic] of chain.entries()) {
    assert.equal(launched.goalComplete(live, 'climate'), false);
    if (index + 1 < chain.length) assert.equal(launched.canStartEpic(live, chain[index + 1].id), false, 'one step at a time');
    const budget = live.budget;
    live = launched.startEpic(live, epic.id);
    assert.ok(live, epic.id);
    assert.equal(live.budget, budget - epic.cost);
    assert.equal(launched.canStartEpic(live, chain[index + 1]?.id ?? 'none'), false, 'a running epic does not unlock the next one');
    for (let second = 0; second < epic.duration; second++) live = launched.tickLaunched(live, () => 0);
    assert.equal(launched.epicDone(live, epic.id), true, epic.id);
  }
  assert.equal(launched.goalComplete(live, 'climate'), true);
  assert.deepEqual(live.products, [{ id: 'green-world', major: 1, minor: 0, active: false }], 'the goal releases its product');
  assert.equal(launched.productTitle(live.products[0]), 'Green World v1.0');
  const ticked = launched.tickLaunched(live, () => 0);
  assert.equal(ticked.products.length, 1, 'a product is released only once');
  assert.equal(launched.goalComplete(live, 'war'), false, 'other goals are untouched');
  assert.equal(launched.goalComplete(live, 'unknown'), false, 'goals without epics are never complete');
});

test('Green World can be activated once and its version can change', () => {
  const live = liveState({ products: [{ id: 'green-world', major: 1, minor: 0, active: false }] });
  assert.equal(launched.activateProduct(liveState(), 'green-world'), null, 'nothing to activate before release');
  const active = launched.activateProduct(live, 'green-world');
  assert.equal(active.products[0].active, true);
  assert.equal(launched.activateProduct(active, 'green-world'), null, 'already active');
  assert.equal(launched.productTitle({ id: 'green-world', major: 2, minor: 3, active: true }), 'Green World v2.3');
  const store = memoryStorage();
  storage.saveLaunched(store, active);
  assert.deepEqual(storage.loadLaunched(store), active);
});

/** Ships every epic of a goal, one after another, on a big server. */
function shipGoal(live, goal) {
  for (const epic of launched.goalEpics(goal)) {
    live = launched.startEpic({ ...live, budget: live.budget + epic.cost }, epic.id);
    assert.ok(live, epic.id);
    for (let second = 0; second < epic.duration; second++) live = launched.tickLaunched(live, () => 0);
  }
  return live;
}

test('every world goal has a chain of epics ending in a big API epic', () => {
  const content = require('../src/app/game/launched-content.ts');
  assert.deepEqual(content.worldGoals.map(goal => goal.id), ['climate', 'war', 'corruption', 'hunger-poverty']);
  assert.deepEqual(content.worldGoals.map(goal => launched.goalEpics(goal.id).length), [6, 6, 6, 7]);
  for (const goal of content.worldGoals) {
    const chain = launched.goalEpics(goal.id);
    const last = chain[chain.length - 1];
    assert.ok(last.cost >= 700000, goal.id + ' ends with an expensive epic');
    assert.ok(chain.slice(0, -1).every(epic => epic.cost < last.cost && epic.duration > 0), goal.id);
  }
  const ids = content.epics.map(epic => epic.id);
  assert.equal(new Set(ids).size, ids.length, 'epic ids are unique');
  assert.deepEqual(content.products.map(entry => [entry.id, entry.goals]), [
    ['peace-integrity', ['war', 'corruption']],
    ['fair-share', ['hunger-poverty']],
    ['green-world', ['climate']]
  ]);
});

test('Peace & Integrity needs both war and corruption, Fair Share needs hunger & poverty', () => {
  let live = liveState({ perks: ['workflow-abstraction'], serverSlots: 3 });
  live = shipGoal(live, 'war');
  assert.equal(launched.goalComplete(live, 'war'), true);
  assert.equal(launched.product(live, 'peace-integrity'), undefined, 'war alone is not enough');
  live = shipGoal(live, 'corruption');
  assert.deepEqual(launched.product(live, 'peace-integrity'), { id: 'peace-integrity', major: 1, minor: 0, active: false });
  assert.equal(launched.productTitle(launched.product(live, 'peace-integrity')), 'Peace & Integrity v1.0');
  assert.equal(launched.product(live, 'fair-share'), undefined);
  live = shipGoal(live, 'hunger-poverty');
  assert.equal(launched.productTitle(launched.product(live, 'fair-share')), 'Fair Share v1.0');
  assert.equal(launched.product(live, 'green-world'), undefined, 'climate was not touched');
  assert.equal(launched.productForGoal('corruption').id, 'peace-integrity');
});

test('systems run in parallel, but within a system epics follow one order', () => {
  const live = liveState({ budget: 1000000, perks: ['workflow-abstraction'], serverSlots: 3 });
  assert.equal(launched.canStartEpic(live, 'corruption-procurement-data'), false, 'corruption waits for the war chain');
  assert.equal(launched.previousEpic('corruption-procurement-data').id, 'war-ceasefire-api');
  assert.equal(launched.previousEpic('war-early-warning'), undefined);
  assert.equal(launched.systemEpics('corruption-bid-rigging').length, 12, 'Peace & Integrity is one system of 12 epics');
  let running = launched.startEpic(live, 'climate-algorithm');
  running = launched.startEpic(running, 'war-early-warning');
  running = launched.startEpic(running, 'hunger-poverty-hotspots');
  assert.ok(running, 'one epic per system at the same time');
  assert.equal(launched.runningEpics(running), 3);
  assert.equal(launched.serverLoad(running), 1);
});

test('rented slots pay every second and take a server slot', () => {
  const offline = liveState({ budget: 0 });
  assert.equal(launched.rentSlot(offline, 'edisonx'), null, 'needs Network & Financing');
  let live = liveState({ budget: 0, perks: ['workflow-abstraction', 'network-financing'], serverSlots: 2 });
  live = launched.rentSlot(live, 'edisonx');
  assert.deepEqual(live.rentals, ['edisonx']);
  assert.equal(launched.rentSlot(live, 'edisonx'), null, 'one slot per client');
  assert.equal(launched.usedSlots(live), 1);
  assert.equal(launched.serverLoad(live), 0.5);
  live = launched.rentSlot(live, 'green-left-union');
  assert.equal(launched.serverLoad(live), 1);
  assert.equal(launched.rentSlot(live, 'blue-helmets'), null, 'no free slot left');
  assert.equal(launched.canStartEpic({ ...live, budget: 100000 }, 'climate-algorithm'), false, 'rented slots block epics too');
  assert.equal(launched.rentalIncome(live), 440);
  assert.equal(launched.tickLaunched(live, () => 0).budget, 440);
  live = launched.endRental(live, 'edisonx');
  assert.deepEqual(live.rentals, ['green-left-union']);
  assert.equal(launched.endRental(live, 'edisonx'), null);
  assert.equal(launched.canStartEpic({ ...live, budget: 100000 }, 'climate-algorithm'), true);
});

test('finished epics fill the world progress bars, scaled by the clients', () => {
  const ship = (state, id) => {
    let live = launched.startEpic({ ...state, budget: state.budget + 10000000, serverSlots: state.serverSlots + 1 }, id);
    for (let second = 0; second < launched.epicDefinition(id).duration; second++) live = launched.tickLaunched(live, () => 0);
    return live;
  };
  const base = liveState({ perks: ['workflow-abstraction', 'network-financing'] });
  const plain = ship(base, 'climate-algorithm');
  assert.ok(Math.abs(plain.worldProgress.climate - 50 / 6) < 1e-9, 'one of six climate epics: 1/6 of 50%');
  assert.equal(plain.worldProgress.war, 0);

  const green = ship(launched.rentSlot({ ...base, serverSlots: 1 }, 'green-left-union'), 'climate-algorithm');
  assert.ok(Math.abs(green.worldProgress.climate - 50 / 6 * 1.5) < 1e-9, 'the Green-Left Federation boosts climate');

  const edison = launched.rentSlot({ ...base, serverSlots: 1 }, 'edisonx');
  assert.equal(launched.progressMultiplier(edison, 'climate'), 0.5);
  assert.equal(launched.progressMultiplier(edison, 'corruption'), 0.5);
  assert.equal(launched.progressMultiplier(edison, 'war'), 1);
  const slowed = ship(edison, 'climate-algorithm');
  assert.ok(Math.abs(slowed.worldProgress.climate - 50 / 6 * 0.5) < 1e-9, 'EdisonX slows climate progress');

  const both = launched.rentSlot(launched.rentSlot({ ...base, serverSlots: 2 }, 'edisonx'), 'green-left-union');
  assert.equal(launched.progressMultiplier(both, 'climate'), 0.75, 'effects multiply');

  const hunger = ship(base, 'hunger-poverty-hotspots');
  assert.ok(Math.abs(hunger.worldProgress.hunger - 50 / 7) < 1e-9);
  assert.equal(hunger.worldProgress.hunger, hunger.worldProgress.poverty, 'hunger & poverty epics help both');

  let full = liveState({ perks: ['workflow-abstraction'], serverSlots: 1 });
  for (const epic of launched.goalEpics('climate')) full = ship(full, epic.id);
  assert.ok(Math.abs(full.worldProgress.climate - 50) < 1e-9, 'a complete chain fills half the bar');
  const capped = launched.tickLaunched(liveState({ worldProgress: { ...liveState().worldProgress, climate: 100 } }), () => 0);
  assert.equal(capped.worldProgress.climate, 100);
});

test('rental clients and world problems are defined', () => {
  const content = require('../src/app/game/launched-content.ts');
  assert.deepEqual(content.worldProblems.map(problem => problem.id), ['climate', 'war', 'hunger', 'poverty', 'corruption']);
  assert.deepEqual(content.rentalClients.map(client => client.id), ['green-left-union', 'blue-helmets', 'ministry-digital', 'edisonx']);
  const green = content.rentalClients[0];
  const edison = content.rentalClients[3];
  assert.ok(green.income < edison.income, 'the green union pays less than EdisonX');
  assert.ok(green.effects.climate > 1);
  assert.ok(edison.effects.climate < 1 && edison.effects.corruption < 1);
});

test('level 2 dev mode: 5-second epics and a boost of 100,000 actions and 30,000 budget', () => {
  const boosted = launched.devBoost(liveState({ actions: 40000, budget: 10, budgetActions: 40000 }));
  assert.equal(boosted.actions, 140000);
  assert.equal(boosted.budget, 30010);
  let paid = boosted;
  for (let second = 0; second < 5; second++) paid = launched.tickLaunched(paid, () => 0);
  assert.equal(paid.budget, 30010 + 5 * 50, 'the boosted actions are not paid out as budget again');

  const epic = launched.epicDefinition('climate-collect-measurements');
  assert.equal(launched.epicDuration(epic), 120);
  assert.equal(launched.epicDuration(epic, true), 5);
  assert.equal(launched.epicDuration(launched.epicDefinition('climate-algorithm'), true), 5);
  let live = liveState({ epics: [{ id: 'climate-collect-measurements', progress: 0, done: false }] });
  for (let second = 0; second < 5; second++) live = launched.tickLaunched(live, () => 0, true);
  assert.equal(live.epics[0].done, true, 'done after 5 seconds in dev mode');
  let normal = liveState({ epics: [{ id: 'climate-collect-measurements', progress: 0, done: false }] });
  for (let second = 0; second < 5; second++) normal = launched.tickLaunched(normal, () => 0);
  assert.equal(normal.epics[0].done, false);
});

test('more server slots allow more epics at the same time', () => {
  const twoSlots = liveState({ budget: 100000, perks: ['workflow-abstraction'], serverSlots: 2,
    epics: [{ id: 'other-epic', progress: 0, done: false }] });
  assert.equal(launched.serverLoad(twoSlots), 0.5);
  assert.equal(launched.canStartEpic(twoSlots, 'climate-algorithm'), true);
  const full = liveState({ budget: 100000, perks: ['workflow-abstraction'],
    epics: [{ id: 'other-epic', progress: 0, done: false }] });
  assert.equal(launched.canStartEpic(full, 'climate-algorithm'), false);
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
