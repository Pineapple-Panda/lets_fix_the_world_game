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
  worldProgress: { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 }, integrity: 50, programs: [], completedPrograms: [], lawsuit: null, lawsuitsFiled: 0, verdict: null, stats: launched.noStats(), victorySeen: false, ...overrides
});

test('level 2 saves are small and separate from level 1', () => {
  const store = memoryStorage();
  const state = liveState({ budget: 42, perks: ['workflow-abstraction'], epics: [{ id: 'climate-algorithm', progress: 3, done: false }] });
  const raw = storage.saveLaunched(store, state);
  assert.deepEqual(JSON.parse(raw), { level: 2, game: state });
  assert.ok(raw.length < 700);
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
    rentals: [], worldProgress: { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 }, integrity: 50, programs: [], completedPrograms: [], lawsuit: null, lawsuitsFiled: 0, verdict: null, stats: launched.noStats(), victorySeen: false
  }, 'level 1 perks do not carry over');
});

test('skipping level 1 starts level 2 with 34,000 actions and 3,000 budget', () => {
  assert.deepEqual(launched.skippedLevelTwo(), {
    actions: 34000, budget: 3000, seconds: 0, budgetActions: 34000, perks: [], serverSlots: 1, epics: [], products: [], focus: 0,
    rentals: [], worldProgress: { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 }, integrity: 50, programs: [], completedPrograms: [], lawsuit: null, lawsuitsFiled: 0, verdict: null, stats: launched.noStats(), victorySeen: false
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

test('every Add Server makes the focus effect stronger, a little faster than linear', () => {
  assert.equal(launched.focusPower(liveState()), 1);
  const oneServer = liveState({ serverSlots: 2, focus: -100 });
  assert.equal(launched.focusPower(oneServer), 2.1);
  assert.equal(launched.actionBoost(oneServer), 2.05, '+105% actions with one extra server');
  const twoServers = liveState({ serverSlots: 3, focus: 100 });
  assert.equal(launched.focusPower(twoServers), 3.31);
  assert.ok(Math.abs(launched.budgetBoost(twoServers) - 4.31) < 1e-9, '+331% budget with two extra servers');
  assert.equal(launched.focusPower(liveState({ serverSlots: 11 })), 17.92, 'ten extra servers: x17.92, not x1024');
  assert.equal(launched.actionBoost(twoServers), 0.5, 'the penalty does not grow with servers');
  assert.equal(launched.budgetBoost(liveState({ serverSlots: 3, focus: -100 })), 0, 'budget never goes below 0');
  const half = liveState({ serverSlots: 2, focus: 50 });
  assert.equal(launched.budgetBoost(half), 2.05, 'half way: +105%');
  let live = launched.activateLaunchedPerk(liveState({ budget: 100000, perks: ['workflow-abstraction'], focus: -100 }), 'add-server');
  assert.equal(launched.actionBoost(live), 2.05, 'activating Add Server boosts it right away');
});

test('the first level 2 perk unlocks at 35,000 actions and brings the server online', () => {
  const live = liveState({ actions: 34999 });
  assert.deepEqual(launched.openLaunchedPerks(live).map(perk => perk.id), ['add-server', 'workflow-abstraction', 'data-centers', 'network-financing', 'pitch-deck', 'mediation-academy', 'grant-proposals', 'decent-lawyer', 'good-lawyer', 'chewbacca-defense', 'citizens-assembly']);
  assert.equal(launched.activateLaunchedPerk(live, 'workflow-abstraction'), null);
  assert.equal(launched.serverOnline(live), false);
  const ready = liveState({ actions: 35000 });
  const active = launched.activateLaunchedPerk(ready, 'workflow-abstraction');
  assert.deepEqual(active.perks, ['workflow-abstraction']);
  assert.equal(launched.serverOnline(active), true);
  assert.equal(launched.activateLaunchedPerk(active, 'workflow-abstraction'), null, 'only once');
  assert.deepEqual(launched.openLaunchedPerks(active).map(perk => perk.id), ['add-server', 'data-centers', 'network-financing', 'pitch-deck', 'mediation-academy', 'grant-proposals', 'decent-lawyer', 'good-lawyer', 'chewbacca-defense', 'citizens-assembly']);
  assert.equal(launched.activateLaunchedPerk(ready, 'earl'), null, 'level 1 perks are not available any more');
});

test('Add Server costs budget: 25,000 for the first, 10% more for every further server', () => {
  const offline = liveState({ budget: 1000000 });
  assert.equal(launched.activateLaunchedPerk(offline, 'add-server'), null, 'needs the server first');
  let live = liveState({ actions: 0, budget: 24999, perks: ['workflow-abstraction'] });
  assert.equal(launched.addServerPrice(live), 25000);
  assert.equal(launched.addServerPerk(live).actionsRequired, 0, 'no action threshold any more');
  assert.equal(launched.activateLaunchedPerk(live, 'add-server'), null, 'not enough budget');
  live = launched.activateLaunchedPerk({ ...live, budget: 1000000 }, 'add-server');
  assert.equal(live.serverSlots, 2);
  assert.equal(live.budget, 975000);
  assert.equal(launched.addServerPrice(live), 27500, '+10%');
  live = launched.activateLaunchedPerk(live, 'add-server');
  assert.equal(live.budget, 947500);
  assert.equal(launched.addServerPrice(live), 30250);
  live = launched.activateLaunchedPerk(live, 'add-server');
  assert.equal(launched.addServerPrice(live), 33275);
  assert.equal(live.serverSlots, 4);
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
  assert.deepEqual(launched.openLaunchedPerks(later).map(perk => perk.id), ['add-server', 'data-centers', 'network-financing', 'pitch-deck', 'mediation-academy', 'grant-proposals', 'decent-lawyer', 'good-lawyer', 'chewbacca-defense', 'citizens-assembly'],
    'perks are listed by unlock threshold; Add Server needs no actions');
});

test('Tegridy Farms: a 1,000,000 deal, then +1 integrity per 100,000 bag', () => {
  const closed = liveState({ budget: 5000000 });
  assert.ok(!launched.openLaunchedPerks(closed).some(perk => perk.id === 'tegridy-farms'), 'only offered once Network & Financing is open');
  assert.equal(launched.activateLaunchedPerk(closed, 'tegridy-farms'), null);
  const poor = liveState({ budget: 999999, perks: ['network-financing'] });
  assert.ok(launched.openLaunchedPerks(poor).some(perk => perk.id === 'tegridy-farms'));
  assert.equal(launched.activateLaunchedPerk(poor, 'tegridy-farms'), null, 'costs 1,000,000');
  assert.equal(launched.buyTegridy({ ...poor, budget: 5000000 }), null, 'no bags before the deal');

  let live = launched.activateLaunchedPerk(liveState({ budget: 1250000, perks: ['network-financing'] }), 'tegridy-farms');
  assert.equal(live.budget, 250000);
  assert.equal(live.integrity, 50, 'the deal itself adds no integrity');
  assert.equal(launched.tegridyActive(live), true);
  assert.ok(!launched.openLaunchedPerks(live).some(perk => perk.id === 'tegridy-farms'), 'a one-time deal');
  assert.equal(launched.activateLaunchedPerk(live, 'tegridy-farms'), null);
  live = launched.buyTegridy(live);
  assert.equal(live.budget, 150000);
  assert.equal(live.integrity, 51);
  live = launched.buyTegridy(live);
  assert.equal(live.integrity, 52);
  assert.equal(launched.buyTegridy(live), null, 'not enough budget for another bag');
  const pure = liveState({ budget: 1000000, perks: ['network-financing', 'tegridy-farms'], integrity: 100 });
  assert.equal(launched.buyTegridy(pure), null, 'nothing to buy at 100%');
  const store = memoryStorage();
  storage.saveLaunched(store, live);
  assert.deepEqual(storage.loadLaunched(store), live);
});

test('"Migrate to Data Centers": 80,000 actions, 350,000 budget, epics take half the time', () => {
  assert.equal(launched.activateLaunchedPerk(liveState({ actions: 79999, budget: 1000000 }), 'data-centers'), null, 'needs 80,000 actions');
  assert.equal(launched.activateLaunchedPerk(liveState({ actions: 80000, budget: 349999 }), 'data-centers'), null, 'costs 350,000 budget');
  const migrated = launched.activateLaunchedPerk(liveState({ actions: 80000, budget: 400000 }), 'data-centers');
  assert.equal(migrated.budget, 50000);
  assert.equal(launched.activateLaunchedPerk(migrated, 'data-centers'), null, 'only once');
  const free = launched.activateLaunchedPerk(liveState({ actions: 35000, budget: 0 }), 'workflow-abstraction');
  assert.equal(free.budget, 0, 'perks without a price stay free');

  const epic = launched.epicDefinition('climate-collect-measurements');
  assert.equal(launched.epicDuration(epic, false, true), 60, '2 minutes become 1');
  assert.equal(launched.epicDuration(launched.epicDefinition('war-verify-footage'), false, true), 45);
  assert.equal(launched.epicDuration(launched.epicDefinition('war-early-warning'), false, true), 15);
  assert.equal(launched.epicDuration(epic, true, true), 5, 'dev mode still caps at 5 seconds');
  let fast = liveState({ perks: ['data-centers'], epics: [{ id: 'climate-collect-measurements', progress: 0, done: false }] });
  for (let second = 0; second < 60; second++) fast = launched.tickLaunched(fast, () => 0);
  assert.equal(fast.epics[0].done, true, 'done after 60 instead of 120 seconds');
  let slow = liveState({ epics: [{ id: 'climate-collect-measurements', progress: 0, done: false }] });
  for (let second = 0; second < 60; second++) slow = launched.tickLaunched(slow, () => 0);
  assert.equal(slow.epics[0].done, false);
});

test('data centres make every client 25% stronger, good and bad', () => {
  const online = { perks: ['workflow-abstraction', 'network-financing'], serverSlots: 8 };
  const plain = launched.rentSlot(launched.rentSlot(liveState({ ...online, integrity: 15 }), 'ministry-digital'), 'edisonx');
  const boosted = { ...plain, perks: [...plain.perks, 'data-centers'] };
  assert.equal(launched.clientFactor(plain), 1);
  assert.equal(launched.clientFactor(boosted), 1.25);
  assert.equal(launched.rentalIncome(boosted), Math.round(launched.rentalIncome(plain) * 1.25));
  assert.ok(Math.abs(launched.rentalProgress(boosted, 'hunger') - 0.003 * 1.25) < 1e-12, 'positive effects grow');
  assert.ok(Math.abs(launched.rentalProgress(boosted, 'climate') + 0.005 * 1.25) < 1e-12, 'negative effects grow too');
  const afterPlain = launched.tickLaunched(plain, () => 0);
  const afterBoosted = launched.tickLaunched(boosted, () => 0);
  assert.ok(Math.abs((15 - afterBoosted.integrity) - (15 - afterPlain.integrity) * 1.25) < 1e-9, 'integrity loss grows by 25%');
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
  assert.equal(launched.rentSlot(offline, 'blue-helmets'), null, 'needs Network & Financing');
  let live = liveState({ budget: 0, perks: ['workflow-abstraction', 'network-financing'], serverSlots: 2 });
  live = launched.rentSlot(live, 'ministry-digital');
  assert.deepEqual(live.rentals, ['ministry-digital']);
  assert.equal(launched.rentSlot(live, 'ministry-digital'), null, 'one slot per client');
  assert.equal(launched.usedSlots(live), 1);
  assert.equal(launched.serverLoad(live), 0.5);
  live = launched.rentSlot(live, 'blue-helmets');
  assert.equal(launched.serverLoad(live), 1);
  assert.equal(launched.canStartEpic({ ...live, budget: 100000 }, 'climate-algorithm'), false, 'rented slots block epics too');
  assert.equal(launched.rentalIncome(live), 1133, '1,100 plus 3% for the added server');
  assert.equal(launched.tickLaunched(live, () => 0).budget, 1133);
  live = launched.endRental(live, 'ministry-digital');
  assert.deepEqual(live.rentals, ['blue-helmets']);
  assert.equal(launched.endRental(live, 'ministry-digital'), null);
  assert.equal(launched.canStartEpic({ ...live, budget: 100000 }, 'climate-algorithm'), true);
});

test('integrity starts at 50% and decides which clients sign', () => {
  const online = { perks: ['workflow-abstraction', 'network-financing'], serverSlots: 4 };
  const middle = liveState(online);
  assert.equal(middle.integrity, 50);
  assert.equal(launched.clientAvailable(middle, 'green-left-union'), false, 'idealists need more than 50%');
  assert.equal(launched.clientAvailable(middle, 'edisonx'), false, 'EdisonX needs less than 20%');
  assert.equal(launched.clientAvailable(middle, 'blue-helmets'), true);
  assert.equal(launched.clientAvailable(middle, 'ministry-digital'), true);
  assert.equal(launched.rentSlot(middle, 'edisonx'), null);

  assert.equal(launched.clientAvailable(liveState({ integrity: 70 }), 'green-left-union'), true, '70% is enough');
  assert.equal(launched.clientAvailable(liveState({ integrity: 69.9 }), 'green-left-union'), false);
  assert.equal(launched.clientAvailable(liveState({ integrity: 20 }), 'edisonx'), true, '20% is low enough');
  assert.equal(launched.clientAvailable(liveState({ integrity: 20.1 }), 'edisonx'), false);

  // Clients move integrity every second; clients walk out when it leaves their range.
  let shady = launched.rentSlot(liveState({ ...online, integrity: 20 }), 'edisonx');
  shady = launched.tickLaunched(shady, () => 0);
  assert.ok(Math.abs(shady.integrity - 19.9) < 1e-9, 'EdisonX costs 0.1 integrity per second');
  let honest = launched.rentSlot(liveState({ ...online, integrity: 19 }), 'blue-helmets');
  for (let second = 0; second < 100; second++) honest = launched.tickLaunched(honest, () => 0);
  assert.ok(Math.abs(honest.integrity - 22) < 1e-9, 'the peacekeepers add 0.03 per second');
  assert.equal(launched.clientAvailable(honest, 'edisonx'), false);
  let ministry = launched.rentSlot(liveState(online), 'ministry-digital');
  ministry = launched.tickLaunched(ministry, () => 0);
  assert.ok(Math.abs(ministry.integrity - 49.95) < 1e-9);
  const floor = launched.tickLaunched(launched.rentSlot(liveState({ ...online, integrity: 0.05 }), 'edisonx'), () => 0);
  assert.equal(floor.integrity, 0, 'integrity never drops below 0');
});

test('the NSA rents five slots at once, always signs and costs integrity', () => {
  const online = { perks: ['workflow-abstraction', 'network-financing'] };
  for (const integrity of [0, 50, 100]) {
    assert.equal(launched.clientAvailable(liveState({ ...online, integrity }), 'nsa'), true, 'available at ' + integrity + '%');
  }
  assert.equal(launched.canRentSlot(liveState({ ...online, serverSlots: 4 }), 'nsa'), false, 'needs five free slots');
  const busy = liveState({ ...online, serverSlots: 5, epics: [{ id: 'climate-algorithm', progress: 0, done: false }] });
  assert.equal(launched.canRentSlot(busy, 'nsa'), false, 'a running epic takes one of the five');
  let live = launched.rentSlot(liveState({ ...online, serverSlots: 6 }), 'nsa');
  assert.equal(launched.rentedSlots(live), 5);
  assert.equal(launched.usedSlots(live), 5);
  assert.equal(launched.rentSlot(live, 'blue-helmets').rentals.length, 2, 'one slot left for a normal client');
  assert.equal(launched.canRentSlot(launched.rentSlot(live, 'blue-helmets'), 'ministry-digital'), false);
  live = launched.tickLaunched(live, () => 0);
  assert.equal(live.budget, 1150, '1,000 plus 3% for each of the five added servers');
  assert.ok(Math.abs(live.integrity - 49.9) < 1e-9, '-0.1 integrity per second');
  assert.deepEqual(live.worldProgress, liveState().worldProgress, 'no solution progress');
  assert.equal(launched.usedSlots(launched.endRental(live, 'nsa')), 0, 'ending the contract frees all five');
});

test('clients add or remove a tiny bit of solution progress every second', () => {
  const online = { perks: ['workflow-abstraction', 'network-financing'], serverSlots: 4 };
  let green = launched.rentSlot(liveState({ ...online, integrity: 80 }), 'green-left-union');
  for (let second = 0; second < 1000; second++) green = launched.tickLaunched(green, () => 0);
  assert.ok(Math.abs(green.worldProgress.climate - 5) < 1e-6, '0.005% per second: 5% after 1000 seconds');
  assert.equal(green.worldProgress.war, 0);
  assert.equal(launched.rentalProgress(green, 'climate'), 0.005);

  let edison = launched.rentSlot(liveState({ ...online, integrity: 10,
    worldProgress: { climate: 1, war: 0, hunger: 0, poverty: 0, corruption: 0.002 } }), 'edisonx');
  edison = launched.tickLaunched(edison, () => 0);
  assert.ok(Math.abs(edison.worldProgress.climate - 0.995) < 1e-9, 'EdisonX slows climate');
  assert.equal(edison.worldProgress.corruption, 0, 'never below 0');

  let ministry = launched.rentSlot(liveState(online), 'ministry-digital');
  ministry = launched.tickLaunched(ministry, () => 0);
  assert.ok(Math.abs(ministry.worldProgress.hunger - 0.003) < 1e-9);
  assert.equal(ministry.worldProgress.hunger, ministry.worldProgress.poverty);
});

test('finished epics fill the solution progress bars', () => {
  const ship = (state, id) => {
    let live = launched.startEpic({ ...state, budget: state.budget + 10000000, serverSlots: state.serverSlots + 1 }, id);
    for (let second = 0; second < launched.epicDefinition(id).duration; second++) live = launched.tickLaunched(live, () => 0);
    return live;
  };
  const base = liveState({ perks: ['workflow-abstraction'] });
  const plain = ship(base, 'climate-algorithm');
  assert.equal(launched.epicProgress, 1.5);
  assert.ok(Math.abs(plain.worldProgress.climate - 1.5) < 1e-9, 'each finished epic adds 1.5%');
  assert.equal(plain.worldProgress.war, 0);
  const hunger = ship(base, 'hunger-poverty-hotspots');
  assert.ok(Math.abs(hunger.worldProgress.hunger - 1.5) < 1e-9);
  assert.equal(hunger.worldProgress.hunger, hunger.worldProgress.poverty, 'hunger & poverty epics help both');
  let full = base;
  for (const epic of launched.goalEpics('climate')) full = ship(full, epic.id);
  assert.ok(Math.abs(full.worldProgress.climate - 9) < 1e-9, 'six climate epics: 9%');
  const capped = launched.tickLaunched(liveState({ worldProgress: { ...liveState().worldProgress, climate: 100 } }), () => 0);
  assert.equal(capped.worldProgress.climate, 100);
});

test('rental clients and world problems are defined', () => {
  const content = require('../src/app/game/launched-content.ts');
  assert.deepEqual(content.worldProblems.map(problem => problem.id), ['climate', 'war', 'hunger', 'poverty', 'corruption']);
  assert.deepEqual(content.rentalClients.map(client => client.id), ['green-left-union', 'blue-helmets', 'ministry-digital', 'nsa', 'edisonx']);
  const green = content.rentalClients[0];
  const edison = content.rentalClients.find(client => client.id === 'edisonx');
  assert.ok(green.income < edison.income, 'the green union pays less than EdisonX');
  assert.ok(content.rentalClients.every(client => client === edison || client.income < edison.income), 'EdisonX pays more than anyone else');
  assert.ok(green.progress.climate > 0 && green.integrity > 0 && green.minIntegrity === 70);
  assert.ok(edison.progress.climate < 0 && edison.progress.corruption < 0 && edison.integrity < 0 && edison.maxIntegrity === 20);
  for (const client of content.rentalClients) {
    assert.ok(Object.values(client.progress).every(delta => Math.abs(delta) <= 0.01), client.id + ' progress is tiny');
  }
});

test('level 2 dev mode: 5-second epics and a boost of 1,000,000 actions and budget', () => {
  const boosted = launched.devBoost(liveState({ actions: 40000, budget: 10, budgetActions: 40000 }));
  assert.equal(boosted.actions, 1040000);
  assert.equal(boosted.budget, 1000010);
  let paid = boosted;
  for (let second = 0; second < 5; second++) paid = launched.tickLaunched(paid, () => 0);
  assert.equal(paid.budget, 1000010 + 5 * 50, 'the boosted actions are not paid out as budget again');

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

const greenWorldActive = overrides => liveState({
  perks: ['workflow-abstraction', 'network-financing'], serverSlots: 2, budget: 10000000,
  products: [{ id: 'green-world', major: 1, minor: 0, active: true }], ...overrides
});
const climateAfter = (state, seconds) => {
  let live = state;
  for (let second = 0; second < seconds; second++) live = launched.tickLaunched(live, () => 0.99);
  return live;
};

test('Green World programs need the active product and follow their start rules', () => {
  assert.match(launched.programBlocker(liveState({ budget: 10000000 }), 'reforestation-network'), /Activate/);
  const live = greenWorldActive();
  assert.equal(launched.programBlocker(live, 'reforestation-network'), null);
  assert.match(launched.programBlocker(live, 'carbon-price-lobbying'), /60% integrity/);
  assert.equal(launched.programBlocker(greenWorldActive({ integrity: 60 }), 'carbon-price-lobbying'), null);
  assert.match(launched.programBlocker(live, 'smart-grid-scheduler'), /v1\.1/);
  assert.match(launched.programBlocker(greenWorldActive({ budget: 100 }), 'reforestation-network'), /budget/);
  assert.match(launched.programBlocker(greenWorldActive({ serverSlots: 1, rentals: ['blue-helmets'] }), 'methane-leak-watch'), /server slot/);
  const started = launched.startProgram(live, 'reforestation-network');
  assert.equal(started.budget, 10000000 - 200000);
  assert.deepEqual(started.programs, [{ id: 'reforestation-network', resistance: 0, milestone: 0 }]);
  assert.equal(launched.startProgram(started, 'reforestation-network'), null, 'runs only once');
  const watch = launched.startProgram(live, 'methane-leak-watch');
  assert.equal(launched.usedSlots(watch), 1, 'Methane Leak Watch takes a server slot');
  assert.deepEqual(launched.stopProgram(started, 'reforestation-network').programs, []);
});

test('the renewables optimisation program needs 1,500,000 TCA and costs 1,000 budget per second', () => {
  const early = greenWorldActive({ actions: 1499999 });
  assert.match(launched.programBlocker(early, 'renewables-optimization'), /1,500,000/);
  const ready = greenWorldActive({ actions: 1500000 });
  assert.equal(launched.programBlocker(ready, 'renewables-optimization'), null);
  const start = launched.startProgram(ready, 'renewables-optimization');
  assert.equal(start.budget, ready.budget, 'no start cost');
  const live = climateAfter(start, 100);
  const without = climateAfter({ ...start, programs: [] }, 100);
  assert.ok(Math.abs(live.worldProgress.climate - 1) < 1e-9, '0.01% per second');
  assert.equal(without.budget - live.budget, 1000 * 100, '1,000 budget per second');
});

test('the solar program finishes its optimisation at 1% per second and reveals the connector epic', () => {
  let live = launched.startProgram(greenWorldActive({ actions: 1500000, perks: ['workflow-abstraction', 'network-financing'] }), 'renewables-optimization');
  assert.equal(live.programs[0].milestone, 0);
  assert.equal(launched.epicRevealed(live, 'data-center-green-connector'), false, 'hidden until the optimisation is done');
  live = climateAfter(live, 50);
  assert.equal(live.programs[0].milestone, 50, '1% per second');
  live = climateAfter(live, 49);
  assert.equal(live.programs[0].milestone, 99);
  live = climateAfter(live, 1);
  assert.deepEqual(live.programs, [], 'the program ends by itself at 100%');
  assert.deepEqual(live.completedPrograms, ['renewables-optimization']);
  assert.equal(launched.programBlocker(live, 'renewables-optimization'), 'Already completed');
  const budgetAfter = climateAfter(live, 10);
  assert.equal(budgetAfter.budget >= live.budget, true, 'no more upkeep once completed');
  assert.equal(launched.epicRevealed(live, 'data-center-green-connector'), true);
  assert.deepEqual(launched.infrastructureEpics(live).map(epic => epic.id), ['data-center-green-connector']);
  const blocked = launched.startProgram(greenWorldActive({ actions: 1500000, integrity: 0 }), 'renewables-optimization');
  assert.equal(blocked, null);
  const frozen = climateAfter(greenWorldActive({ actions: 1500000, integrity: 0,
    programs: [{ id: 'renewables-optimization', resistance: 0, milestone: 10 }] }), 10);
  assert.equal(frozen.programs[0].milestone, 10, 'no milestone progress while the program cannot run');
});

test('the connector epic needs real data centres and adds 20% climate solution once', () => {
  const revealed = overrides => greenWorldActive({ actions: 1500000, budget: 5000000,
    completedPrograms: ['renewables-optimization'], ...overrides });
  assert.equal(launched.epicPerkMissing(revealed(), 'data-center-green-connector'), 'Migrate to Data Centers');
  assert.equal(launched.canStartEpic(revealed(), 'data-center-green-connector'), false, 'needs the data centre perk');
  const withDc = revealed({ perks: ['workflow-abstraction', 'network-financing', 'data-centers'] });
  assert.equal(launched.canStartEpic(withDc, 'data-center-green-connector'), true);
  let live = launched.startEpic({ ...withDc, completedPrograms: [], serverSlots: 2 }, 'data-center-green-connector');
  assert.equal(live, null, 'not revealed without the finished program');
  live = launched.startEpic(withDc, 'data-center-green-connector');
  assert.equal(live.budget, 5000000 - 1500000);
  const climateBefore = live.worldProgress.climate;
  const seconds = launched.epicDuration(launched.epicDefinition('data-center-green-connector'), false, true);
  assert.equal(seconds, 90, '3 minutes, halved by the data centres');
  for (let second = 0; second < seconds; second++) live = launched.tickLaunched({ ...live, programs: [] }, () => 0.99);
  assert.equal(launched.epicDone(live, 'data-center-green-connector'), true);
  assert.ok(Math.abs(live.worldProgress.climate - (climateBefore + 20)) < 1e-9, '+20% climate solution once');
  assert.equal(launched.greenDataCenters(live), true);
  const after = launched.tickLaunched(live, () => 0.99);
  assert.equal(after.worldProgress.climate, live.worldProgress.climate, 'the boost is not repeated');
});

test('running programs cost upkeep and add climate progress every second', () => {
  const start = launched.startProgram(greenWorldActive(), 'reforestation-network');
  const live = climateAfter(start, 100);
  const without = climateAfter({ ...start, programs: [] }, 100);
  assert.ok(Math.abs(live.worldProgress.climate - 0.2) < 1e-9, '0.002% per second');
  assert.equal(without.budget - live.budget, 100 * 100, 'upkeep of 100 per second is paid');
  let broke = launched.startProgram(greenWorldActive({ budget: 200050 }), 'reforestation-network');
  broke = climateAfter(broke, 3);
  assert.equal(broke.worldProgress.climate, 0, 'paused without budget for the upkeep');
  assert.ok(broke.budget >= 0, 'budget never goes negative');
  let wash = launched.startProgram(greenWorldActive({ budget: 0 }), 'greenwashing-campaign');
  wash = climateAfter(wash, 10);
  assert.equal(wash.budget >= 5000, true, 'greenwashing earns 500 per second');
  assert.ok(Math.abs(wash.integrity - 49.5) < 1e-9, 'and costs 0.05 integrity per second');
});

test('at 0% integrity nothing works in the problem solving cards', () => {
  const frozen = greenWorldActive({ integrity: 0 });
  assert.match(launched.programBlocker(frozen, 'reforestation-network'), /0%/);
  assert.equal(launched.upgradeProduct(frozen, 'green-world'), null);
  let running = greenWorldActive({ integrity: 0, programs: [{ id: 'reforestation-network', resistance: 0, milestone: 0 }] });
  const budget = running.budget;
  running = climateAfter(running, 10);
  assert.equal(running.worldProgress.climate, 0, 'no progress');
  assert.ok(running.budget >= budget, 'no upkeep either');
});

test('below 50% integrity protests break out and stop a program until resolved', () => {
  assert.equal(launched.protestChance(greenWorldActive({ integrity: 50 })), 0);
  assert.ok(Math.abs(launched.protestChance(greenWorldActive({ integrity: 25 })) - 0.01) < 1e-12);
  assert.equal(launched.protestChance(greenWorldActive({ integrity: 0 })), 0.02);
  let live = launched.startProgram(greenWorldActive({ integrity: 25 }), 'reforestation-network');
  live = launched.tickLaunched(live, () => 0);
  assert.equal(live.programs[0].resistance, 20, 'a protest needs 20 clicks');
  assert.equal(live.worldProgress.climate, 0);
  assert.equal(launched.resolveProtest(launched.startProgram(greenWorldActive(), 'reforestation-network'), 'reforestation-network'), null,
    'nothing to resolve without a protest');
  let calm = launched.startProgram(greenWorldActive({ integrity: 50 }), 'reforestation-network');
  calm = launched.tickLaunched(calm, () => 0);
  assert.equal(calm.programs[0].resistance, 0, 'no protests at 50% or more');
});

test('a protest takes 20 clicks, and low integrity adds resistance every second', () => {
  assert.equal(launched.resistanceGrowth(greenWorldActive({ integrity: 50 })), 0);
  assert.equal(launched.resistanceGrowth(greenWorldActive({ integrity: 25 })), 1);
  assert.ok(Math.abs(launched.resistanceGrowth(greenWorldActive({ integrity: 1 })) - 1.96) < 1e-12);

  const protest = resistance => greenWorldActive({ integrity: 25, programs: [{ id: 'reforestation-network', resistance }] });
  let live = protest(20);
  for (let click = 0; click < 19; click++) live = launched.resolveProtest(live, 'reforestation-network');
  assert.equal(live.programs[0].resistance, 1, '19 clicks are not enough');
  live = launched.resolveProtest(live, 'reforestation-network');
  assert.equal(live.programs[0].resistance, 0, 'the 20th click ends the protest');
  assert.equal(launched.resolveProtest(live, 'reforestation-network'), null);

  let growing = launched.tickLaunched(protest(20), () => 0.99);
  assert.equal(growing.programs[0].resistance, 21, '+1 per second at 25% integrity');
  growing = launched.tickLaunched(growing, () => 0.99);
  assert.equal(growing.programs[0].resistance, 22);
  assert.equal(growing.worldProgress.climate, 0, 'no progress while protested');
  const steady = launched.tickLaunched(greenWorldActive({ integrity: 60, programs: [{ id: 'reforestation-network', resistance: 20, milestone: 0 }] }), () => 0.99);
  assert.equal(steady.programs[0].resistance, 20, 'an old protest does not grow above 50% integrity');
  assert.equal(launched.maxResistance, 50);
  const capped = launched.tickLaunched(greenWorldActive({ integrity: 1, programs: [{ id: 'reforestation-network', resistance: 49.5, milestone: 0 }] }), () => 0.99);
  assert.equal(capped.programs[0].resistance, 50, "resistance never grows beyond 50 clicks");
});

test('EdisonX robots: a perk only for EdisonX clients that works only while EdisonX rents', () => {
  const buyer = overrides => greenWorldActive({ integrity: 10, serverSlots: 3, actions: 5000000, budget: 2000000, ...overrides });
  const offered = state => launched.openLaunchedPerks(state).some(perk => perk.id === 'edisonx-robots');
  assert.equal(offered(buyer()), false, 'not offered without EdisonX as a client');
  assert.equal(launched.activateLaunchedPerk(buyer(), 'edisonx-robots'), null);
  const client = launched.rentSlot(buyer(), 'edisonx');
  assert.equal(offered(client), true, 'offered while EdisonX rents a slot');
  assert.equal(launched.activateLaunchedPerk({ ...client, actions: 4999999 }, 'edisonx-robots'), null, 'needs 5,000,000 TCA');
  assert.equal(launched.activateLaunchedPerk({ ...client, budget: 1999999 }, 'edisonx-robots'), null, 'costs 2,000,000 budget');
  const owner = launched.activateLaunchedPerk(client, 'edisonx-robots');
  assert.equal(owner.budget, 0);
  assert.equal(launched.robotsOnSite(owner), true);
  assert.equal(offered(owner), false, 'bought once');
  assert.equal(launched.robotsOnSite(launched.endRental(owner, 'edisonx')), false, 'idle once EdisonX leaves');
  assert.equal(launched.robotsOnSite(launched.rentSlot(buyer(), 'edisonx')), false, 'EdisonX alone brings no robots');
});

test('clients walk out when integrity leaves their range', () => {
  const online = { perks: ['workflow-abstraction', 'network-financing'], serverSlots: 4 };
  const green = launched.tickLaunched(liveState({ ...online, integrity: 69.5, rentals: ['green-left-union', 'blue-helmets'] }), () => 0.99);
  assert.deepEqual(green.rentals, ['blue-helmets'], 'Green-Left leaves below 70%');
  const stays = launched.tickLaunched(liveState({ ...online, integrity: 75, rentals: ['green-left-union'] }), () => 0.99);
  assert.deepEqual(stays.rentals, ['green-left-union']);
  const edison = launched.tickLaunched(liveState({ ...online, integrity: 25, rentals: ['edisonx'] }), () => 0.99);
  assert.deepEqual(edison.rentals, [], 'EdisonX leaves above 20%');
});

test('EdisonX robots resolve protests automatically', () => {
  const protest = (perks, rentals) => greenWorldActive({ integrity: 15, rentals, serverSlots: 3,
    perks: ['workflow-abstraction', 'network-financing', ...perks],
    programs: [{ id: 'reforestation-network', resistance: 20, milestone: 0 }] });
  assert.equal(launched.tickLaunched(protest([], ['edisonx']), () => 0.99).programs[0].resistance > 20, true, 'no robots without the perk');
  let live = protest(['edisonx-robots'], ['edisonx']);
  live = launched.tickLaunched(live, () => 0.99);
  assert.ok(Math.abs(live.programs[0].resistance - 16.4) < 0.01, '+1.4 distrust at 15%, -5 robots');
  let seconds = 1;
  while (live.programs[0].resistance > 0 && seconds < 10) { live = launched.tickLaunched(live, () => 0.99); seconds++; }
  assert.equal(live.programs[0].resistance, 0, 'the robots clear the protest');
  assert.ok(seconds <= 6, 'within about five to six seconds (20 resistance, net -3.6 per second)');
  const climate = live.worldProgress.climate;
  live = launched.tickLaunched(live, () => 0.99);
  assert.ok(live.worldProgress.climate > climate, 'the program runs again');
});

test('flimsy lawsuits: only at 30% climate solution and more than 80% integrity', () => {
  const content = require('../src/app/game/launched-content.ts');
  assert.deepEqual([...new Set(content.lawsuits.map(entry => entry.plaintiff))], ['Mississippi Corp', 'Bananas Inc.', 'EdisonX']);
  const climate = value => ({ ...liveState().worldProgress, climate: value });
  assert.equal(launched.lawsuitRisk(greenWorldActive({ integrity: 90, worldProgress: climate(29.9) })), false, 'below 30% climate');
  assert.equal(launched.lawsuitRisk(greenWorldActive({ integrity: 80, worldProgress: climate(30) })), false, '80% is not enough');
  assert.equal(launched.lawsuitRisk(greenWorldActive({ integrity: 80.1, worldProgress: climate(30) })), true);
  const sued = launched.tickLaunched(greenWorldActive({ integrity: 90, worldProgress: climate(30) }), () => 0);
  assert.deepEqual(sued.lawsuit, { caseId: 0, courtSeconds: null }, 'a lawsuit is filed');
  assert.equal(sued.lawsuitsFiled, 1, 'and counted');
  assert.equal(launched.lawsuitCase(sued).plaintiff, 'Mississippi Corp');
  const calm = launched.tickLaunched(greenWorldActive({ integrity: 70, worldProgress: climate(50) }), () => 0);
  assert.equal(calm.lawsuit, null, 'no lawsuits at 70% integrity');
});

test('a lawsuit freezes the programs until it is settled or won in court', () => {
  const climate = { ...liveState().worldProgress, climate: 30 };
  const base = greenWorldActive({ integrity: 70, worldProgress: climate, programs: [{ id: 'reforestation-network', resistance: 0, milestone: 0 }],
    lawsuit: { caseId: 2, courtSeconds: null } });
  let frozen = launched.tickLaunched(base, () => 0.99);
  assert.equal(frozen.worldProgress.climate, 30, 'the injunction freezes the programs');
  assert.deepEqual(frozen.lawsuit, base.lawsuit, 'an undecided case stays open');

  const settled = launched.settleLawsuit(base);
  assert.equal(settled.lawsuit, null);
  assert.equal(settled.budget, base.budget - 500000);
  assert.equal(launched.settleLawsuit({ ...base, budget: 499999 }), null, 'settling costs 500,000');

  let court = launched.fightLawsuit(base);
  assert.equal(court.lawsuit.courtSeconds, 90);
  assert.equal(launched.settleLawsuit(court), null, 'no settling once in court');
  assert.equal(launched.fightLawsuit(court), null);
  for (let second = 0; second < 89; second++) court = launched.tickLaunched(court, () => 0.99);
  assert.equal(court.lawsuit.courtSeconds, 1);
  assert.equal(court.worldProgress.climate, 30, 'still frozen while in court');
  const beforeVerdict = { ...court, seconds: 1 }; // no budget payout in the verdict second
  court = launched.tickLaunched(beforeVerdict, () => 0);
  assert.equal(court.lawsuit, null, 'the verdict comes after 90 seconds');
  assert.deepEqual(court.verdict, { product: 'green-world', plaintiff: 'Bananas Inc.', won: true, damages: 0 }, 'won (65% chance)');
  assert.equal(launched.courtWinChance, 0.65);
  court = launched.tickLaunched(court, () => 0.99);
  assert.ok(court.worldProgress.climate > 30, 'programs run again');

  const lost = launched.tickLaunched(beforeVerdict, () => 0.99);
  assert.equal(lost.lawsuit, null);
  assert.deepEqual(lost.verdict, { product: 'green-world', plaintiff: 'Bananas Inc.', won: false, damages: 1000000 }, 'a loss costs twice the settlement');
  assert.equal(lost.budget, beforeVerdict.budget - 1000000);
  const broke = launched.tickLaunched({ ...beforeVerdict, budget: 300000 }, () => 0.99);
  assert.equal(broke.budget, 0, 'the budget does not drop below 0');
  const next = launched.tickLaunched({ ...lost, integrity: 90 }, () => 0);
  assert.equal(next.verdict, null, 'a new lawsuit clears the old verdict');
});

test('every lawsuit costs and takes 20% more than the one before', () => {
  const nth = n => greenWorldActive({ lawsuit: { caseId: 0, courtSeconds: null }, lawsuitsFiled: n });
  assert.equal(launched.settlementCost(nth(1)), 500000);
  assert.equal(launched.courtDuration(nth(1)), 90);
  assert.equal(launched.settlementCost(nth(2)), 600000);
  assert.equal(launched.courtDuration(nth(2)), 108);
  assert.equal(launched.settlementCost(nth(3)), 720000);
  assert.equal(launched.courtDuration(nth(3)), 130);
  assert.equal(launched.settleLawsuit(nth(3)).budget, 10000000 - 720000);
  assert.equal(launched.fightLawsuit(nth(3)).lawsuit.courtSeconds, 130);
  const climate = { ...liveState().worldProgress, climate: 30 };
  const again = launched.tickLaunched(greenWorldActive({ integrity: 90, worldProgress: climate, lawsuitsFiled: 2 }), () => 0);
  assert.equal(again.lawsuitsFiled, 3);
  assert.equal(launched.settlementCost(again), 720000, 'the third lawsuit is 1.2² as expensive');
});

const fairShareActive = overrides => greenWorldActive({
  products: [{ id: 'green-world', major: 1, minor: 0, active: true }, { id: 'fair-share', major: 1, minor: 0, active: true }], ...overrides
});

test('Fair Share runs the Mealora delivery service and the fair pricing system for hunger', () => {
  let live = launched.startProgram(fairShareActive(), 'mealora-delivery');
  assert.equal(live.budget, 10000000 - 1000000);
  assert.equal(launched.programBlocker(fairShareActive(), 'hunger-relief-pricing'), 'Needs v1.1');
  const hunger = live.worldProgress.hunger;
  live = climateAfter(live, 100);
  assert.ok(Math.abs(live.worldProgress.hunger - hunger - 0.6) < 1e-9, 'Mealora adds 0.006% hunger solution per second');
  const v11 = launched.upgradeProduct(fairShareActive(), 'fair-share');
  assert.equal(launched.programBlocker(v11, 'hunger-relief-pricing'), null);
  assert.equal(launched.programBlocker(greenWorldActive(), 'mealora-delivery'), 'Activate the product first');
});

test('the free meal service needs v2.0, 30% hunger and both other Fair Share programs running', () => {
  const v2 = { id: 'fair-share', major: 2, minor: 0, active: true };
  const both = [{ id: 'mealora-delivery', resistance: 0, milestone: 0 }, { id: 'hunger-relief-pricing', resistance: 0, milestone: 0 }];
  const ready = overrides => fairShareActive({ serverSlots: 4, products: [{ id: 'green-world', major: 1, minor: 0, active: true }, v2],
    worldProgress: { ...liveState().worldProgress, hunger: 30 }, programs: both, ...overrides });
  assert.equal(launched.programBlocker(ready(), 'free-meal-service'), null);
  assert.equal(launched.programBlocker(fairShareActive({ programs: both, worldProgress: { ...liveState().worldProgress, hunger: 30 } }), 'free-meal-service'), 'Needs v2.0');
  assert.equal(launched.programBlocker(ready({ worldProgress: { ...liveState().worldProgress, hunger: 29 } }), 'free-meal-service'), 'Needs 30% Hunger solution');
  assert.equal(launched.programBlocker(ready({ programs: [both[0]] }), 'free-meal-service'),
    'Needs Fair Plate Pricing for Online Food Orders running');
  assert.equal(launched.programBlocker(ready(), 'hunger-relief-pricing'), 'Already running');
  assert.equal(launched.programBlocker(ready({ programs: [] }), 'hunger-relief-pricing'), null, 'v1.1 programs stay available at v2.0');

  let live = launched.startProgram(ready(), 'free-meal-service');
  assert.equal(live.budget, 10000000 - 3000000);
  const running = climateAfter(live, 10);
  const alone = climateAfter(launched.stopProgram(live, 'mealora-delivery'), 10);
  const hungerOnlyPricing = climateAfter(ready({ programs: [both[1]] }), 10);
  assert.ok(Math.abs(alone.worldProgress.hunger - hungerOnlyPricing.worldProgress.hunger) < 1e-9, 'paused without Mealora');
  assert.ok(running.worldProgress.hunger > alone.worldProgress.hunger + 0.5, 'runs with both: +0.02%/s ×1.25^10');
  const protest = launched.tickLaunched({ ...live, programs: [{ ...both[0], resistance: 20 }, both[1], { id: 'free-meal-service', resistance: 0, milestone: 0 }] }, () => 0.99);
  assert.deepEqual(launched.missingPrograms(protest, 'free-meal-service'), ['Mealora Worldwide Food Delivery'], 'a protest pauses it too');
});

test('Fair Share fights poverty with fair wages and tax relief on food and rent', () => {
  assert.deepEqual(launched.productProblems('fair-share'), ['hunger', 'poverty']);
  assert.deepEqual(launched.productProblems('green-world'), ['climate']);
  let live = launched.startProgram(fairShareActive({ serverSlots: 3 }), 'fair-wage-optimizer');
  assert.equal(live.budget, 10000000 - 1200000);
  live = climateAfter(live, 100);
  assert.ok(Math.abs(live.worldProgress.poverty - 0.6) < 1e-9, 'fair wages: +0.006% poverty per second');
  assert.equal(launched.programBlocker(fairShareActive({ integrity: 59 }), 'essentials-tax-relief'), 'Needs 60% integrity');
  const relief = climateAfter(launched.startProgram(fairShareActive({ integrity: 60 }), 'essentials-tax-relief'), 100);
  assert.ok(Math.abs(relief.worldProgress.poverty - 0.8) < 1e-6, 'tax relief: +0.008% poverty per second');
  assert.equal(launched.programBlocker(fairShareActive(), 'housing-market-stabilizer'), 'Needs v1.1');
  const housing = launched.startProgram(launched.upgradeProduct(fairShareActive(), 'fair-share'), 'housing-market-stabilizer');
  assert.equal(housing.budget, 10000000 - 500000 - 2500000);
  const stable = climateAfter(housing, 100);
  assert.ok(Math.abs(stable.worldProgress.poverty - 1.5) < 1e-6, 'housing: +0.012% ×1.25 (v1.1) poverty per second');
  const poverty = { ...liveState().worldProgress, poverty: 30 };
  assert.equal(launched.lawsuitRisk(fairShareActive({ integrity: 90, worldProgress: poverty }), 'fair-share'), true, '30% poverty also draws lawsuits');
});

const peaceActive = overrides => greenWorldActive({ serverSlots: 4,
  products: [{ id: 'peace-integrity', major: 1, minor: 0, active: true }], ...overrides });

test('Peace & Integrity: diplomacy chatbot, tax the rich and high-tech weapons', () => {
  assert.deepEqual(launched.productProblems('peace-integrity'), ['war', 'corruption']);
  const peace = climateAfter(launched.startProgram(peaceActive(), 'deescalation-chatbot'), 100);
  assert.ok(Math.abs(peace.worldProgress.war - 0.6) < 1e-9, 'chatbot: +0.006% war solution per second');
  const taxed = climateAfter(launched.startProgram(peaceActive(), 'tax-the-rich'), 100);
  assert.ok(Math.abs(taxed.worldProgress.corruption - 0.8) < 1e-6, 'tax the rich: +0.008% corruption per second');
  const war = { ...liveState().worldProgress, war: 10 };
  const armed = launched.startProgram(peaceActive({ worldProgress: war }), 'high-tech-weapons');
  const later = climateAfter(armed, 100);
  assert.ok(Math.abs(later.worldProgress.war - 9.4) < 1e-6, 'weapons make the war bar worse');
  assert.ok(later.budget > armed.budget + 290000, 'but pay 3,000 budget per second');
});

test('Tax the Rich triples the lawsuit chance and brings billionaire lawsuits', () => {
  const content = require('../src/app/game/launched-content.ts');
  assert.equal(launched.currentLawsuitChance(peaceActive()), 0.003);
  const taxing = launched.startProgram(peaceActive(), 'tax-the-rich');
  assert.ok(Math.abs(launched.currentLawsuitChance(taxing) - 0.009) < 1e-12, '×3 while Tax the Rich runs');
  assert.equal(launched.lawsuitRisk(taxing), false, 'the usual conditions do not hold');
  const sued = launched.tickLaunched({ ...taxing, integrity: 50 }, () => 0.005);
  const lawsuit = launched.lawsuitCase(sued);
  assert.equal(lawsuit.product, 'peace-integrity');
  assert.equal(lawsuit.program, 'tax-the-rich', 'the billionaires sue regardless of progress and integrity');
  assert.equal(launched.tickLaunched({ ...peaceActive(), integrity: 50 }, () => 0.005).lawsuit, null, 'no lawsuit without the program');
  assert.ok(content.lawsuits.filter(entry => entry.program === 'tax-the-rich').length >= 3);
});

test('weapons lobbying reveals the kill switch virus, which reveals Destroy All Weapons', () => {
  assert.equal(launched.programBlocker(peaceActive(), 'weapons-lobbying'), 'Needs Build High-Tech Weapons running');
  assert.equal(launched.programBlocker(peaceActive(), 'destroy-all-weapons'), 'Not available yet');
  let live = launched.startProgram(launched.startProgram(peaceActive(), 'high-tech-weapons'), 'weapons-lobbying');
  live = climateAfter(live, 66);
  assert.equal(live.programs.find(entry => entry.id === 'weapons-lobbying').milestone, 99, '1.5% per second');
  assert.equal(launched.epicRevealed(live, 'weapons-kill-switch'), false);
  live = climateAfter(live, 1);
  assert.deepEqual(live.completedPrograms, ['weapons-lobbying'], 'done after 67 seconds and gone');
  assert.equal(launched.epicRevealed(live, 'weapons-kill-switch'), true);
  assert.equal(launched.canStartEpic(live, 'weapons-kill-switch'), true);
  live = launched.startEpic(live, 'weapons-kill-switch');
  live = climateAfter(live, 240);
  assert.equal(launched.epicDone(live, 'weapons-kill-switch'), true);
  assert.equal(launched.goalComplete(live, 'war'), false, 'the virus is no step of the war goal');
  assert.equal(launched.programRevealed(live, 'destroy-all-weapons'), true);
  assert.equal(launched.programBlocker(live, 'destroy-all-weapons'), null);
  const destroyed = climateAfter(launched.startProgram(launched.stopProgram(live, 'high-tech-weapons'), 'destroy-all-weapons'), 10);
  assert.ok(destroyed.worldProgress.war >= live.worldProgress.war + 0.49, 'destroying all weapons: +0.05% war per second');
});

test('Fair Share gets sued under the same conditions, and only its programs are frozen', () => {
  const hunger = value => ({ ...liveState().worldProgress, hunger: value });
  assert.equal(launched.lawsuitRisk(fairShareActive({ integrity: 90, worldProgress: hunger(29.9) }), 'fair-share'), false);
  assert.equal(launched.lawsuitRisk(fairShareActive({ integrity: 80, worldProgress: hunger(30) }), 'fair-share'), false);
  assert.equal(launched.lawsuitRisk(fairShareActive({ integrity: 90, worldProgress: hunger(30) }), 'fair-share'), true);
  assert.equal(launched.lawsuitRisk(fairShareActive({ integrity: 90, worldProgress: hunger(30) }), 'green-world'), false);
  const sued = launched.tickLaunched(fairShareActive({ integrity: 90, worldProgress: hunger(30) }), () => 0);
  assert.equal(launched.lawsuitCase(sued).product, 'fair-share', 'only Fair Share cases while only Fair Share is at risk');
  const running = [{ id: 'mealora-delivery', resistance: 0, milestone: 0 }, { id: 'reforestation-network', resistance: 0, milestone: 0 }];
  const frozen = launched.tickLaunched({ ...sued, integrity: 70, programs: running }, () => 0.99);
  assert.equal(frozen.worldProgress.hunger, 30, 'Fair Share programs are frozen');
  assert.ok(frozen.worldProgress.climate > 0, 'Green World keeps running');
  const protest = launched.tickLaunched(fairShareActive({ integrity: 25, programs: [running[0]] }), () => 0);
  assert.equal(protest.programs[0].resistance, 20, 'protests hit Fair Share as well');
});

test('upgrade costs keep rising after v2.0', () => {
  const at = (major, minor) => greenWorldActive({ products: [{ id: 'green-world', major, minor, active: true }] });
  assert.equal(launched.upgradeCost(at(1, 9), 'green-world'), 5000000, 'v1.9 → v2.0');
  assert.equal(launched.upgradeCost(at(2, 0), 'green-world'), 5500000, 'v2.0 → v2.1 is not cheap again');
  assert.equal(launched.upgradeCost(at(2, 5), 'green-world'), 8000000);
});

test('the lawsuit counter calms down again during quiet times', () => {
  const quiet = greenWorldActive({ lawsuitsFiled: 3, seconds: launched.lawsuitCooldown - 1 });
  assert.equal(launched.tickLaunched(quiet, () => 0.99).lawsuitsFiled, 2, 'one step less every two minutes');
  assert.equal(launched.tickLaunched({ ...quiet, seconds: 10 }, () => 0.99).lawsuitsFiled, 3);
  const open = launched.tickLaunched({ ...quiet, lawsuit: { caseId: 0, courtSeconds: null } }, () => 0.99);
  assert.equal(open.lawsuitsFiled, 3, 'no calming down while a lawsuit is open');
});

test('programs stop by themselves once their problem is solved, and the summary tells the story', () => {
  const nearly = greenWorldActive({ worldProgress: { ...liveState().worldProgress, climate: 99.999 },
    programs: [{ id: 'reforestation-network', resistance: 0, milestone: 0 }] });
  const solved = launched.tickLaunched(nearly, () => 0.99);
  assert.equal(solved.worldProgress.climate, 100);
  assert.deepEqual(solved.programs, [], 'no upkeep for a solved problem');
  assert.equal(launched.programBlocker(solved, 'reforestation-network'), 'Climate change is solved');
  assert.equal(launched.secondsToSolve(solved, 'climate'), 0);

  const running = greenWorldActive({ worldProgress: { ...liveState().worldProgress, climate: 99 },
    programs: [{ id: 'reforestation-network', resistance: 0, milestone: 0 }] });
  assert.equal(launched.secondsToSolve(running, 'climate'), 500, '1% left at 0.002% per second');
  assert.equal(launched.secondsToSolve(greenWorldActive(), 'climate'), null, 'nothing moves');

  const all = { climate: 100, war: 100, hunger: 100, poverty: 100, corruption: 100 };
  const fixed = liveState({ worldProgress: all, seconds: 7200, integrity: 75,
    stats: { ...launched.noStats(), lawsuits: 4, lawsuitsWon: 2, lawsuitsLost: 1, lawsuitsSettled: 1, dirtySeconds: 3600 } });
  assert.equal(launched.worldFixed(fixed), true);
  assert.equal(launched.worldFixed(liveState({ worldProgress: { ...all, war: 99 } })), false);
  const summary = launched.victorySummary(fixed);
  assert.deepEqual(summary.facts.slice(0, 2), [
    { label: 'Time to fix the world', value: '2 h 0 min' },
    { label: 'Lawsuits', value: '4 (2 won, 1 lost, 1 settled)' }]);
  assert.equal(summary.facts.find(fact => fact.label === 'Time with shady deals').value, '50%');
  assert.equal(summary.verdict, 'You fixed the world, partly with the help of the people who broke it.');
  assert.equal(launched.dismissVictory(fixed).victorySeen, true);
  assert.equal(launched.dismissVictory({ ...fixed, victorySeen: true }), null);
});

test('shady deals are counted every second', () => {
  const clean = launched.tickLaunched(liveState(), () => 0.99);
  assert.equal(clean.stats.dirtySeconds, 0);
  const shady = launched.tickLaunched(liveState({ rentals: ['nsa'] }), () => 0.99);
  assert.equal(shady.stats.dirtySeconds, 1);
});

test('protests take at most 50 clicks, mediators calm them faster and peacefully', () => {
  const protest = overrides => greenWorldActive({ integrity: 25, programs: [{ id: 'reforestation-network', resistance: 20, milestone: 0 }], ...overrides });
  const content = require('../src/app/game/launched-content.ts');
  const perk = content.launchedPerks.find(entry => entry.id === 'mediation-academy');
  assert.equal(perk.actionsRequired, 3000000);
  assert.equal(perk.cost, 1500000);
  const clicked = launched.resolveProtest(protest({ perks: ['mediation-academy'] }), 'reforestation-network');
  assert.equal(clicked.programs[0].resistance, 17, 'one click counts three times');
  assert.equal(clicked.stats.protestClicks, 1);
  const calmer = launched.tickLaunched(protest({ perks: ['mediation-academy'] }), () => 0.99);
  assert.ok(Math.abs(calmer.programs[0].resistance - 19) < 1e-9, '+1 distrust, −2 mediators');
  assert.equal(launched.resolveProtest(protest(), 'reforestation-network').programs[0].resistance, 19, 'one click without mediators');
});

test('the news ticker reacts to the world and breaks lawsuits and protests first', () => {
  const news = require('../src/app/game/news.ts');
  const feed = news.newsFeed(greenWorldActive({ seconds: 600 }));
  assert.equal(feed.length, 3);
  assert.ok(feed.every(line => !line.breaking && line.text.length > 10));
  assert.deepEqual(news.newsFeed(greenWorldActive({ seconds: 600 })), feed, 'stable within a slot');
  const sued = news.newsFeed(greenWorldActive({ seconds: 600, lawsuit: { caseId: 0, courtSeconds: null },
    programs: [{ id: 'reforestation-network', resistance: 20, milestone: 0 }] }));
  assert.deepEqual(sued.slice(0, 2).map(line => line.text), [
    'BREAKING: Mississippi Corp sues Green World.',
    'BREAKING: Protesters block "Community Reforestation Network".']);
  const fixed = { climate: 100, war: 100, hunger: 100, poverty: 100, corruption: 100 };
  const texts = new Set();
  for (let second = 0; second < 2000; second += 12) news.newsFeed(liveState({ seconds: second, worldProgress: fixed })).forEach(line => texts.add(line.text));
  assert.ok(texts.has('Brown envelopes discontinued due to falling demand.'), 'headlines follow the progress');
  assert.ok(!texts.has('Heatwave declared "the new normal". Normal files a complaint.'));
});

test('Peace & Integrity has three corruption programs', () => {
  const content = require('../src/app/game/launched-content.ts');
  assert.deepEqual(content.programs.filter(program => program.problem === 'corruption').map(program => program.id),
    ['tax-the-rich', 'open-budget-ledger', 'whistleblower-harbor']);
  assert.equal(launched.programBlocker(peaceActive(), 'whistleblower-harbor'), 'Needs v1.1');
  const ledger = climateAfter(launched.startProgram(peaceActive(), 'open-budget-ledger'), 100);
  assert.ok(Math.abs(ledger.worldProgress.corruption - 0.6) < 1e-9);
});

test('late perks: grant proposals, lawyers, the Chewbacca defense and a citizens assembly', () => {
  const content = require('../src/app/game/launched-content.ts');
  const perk = id => content.launchedPerks.find(entry => entry.id === id);
  assert.deepEqual(['grant-proposals', 'decent-lawyer', 'good-lawyer', 'chewbacca-defense', 'citizens-assembly'].map(id => perk(id).actionsRequired),
    [25000000, 35000000, 45000000, 60000000, 100000000]);

  // Grant proposals halve the upkeep, not the income.
  const running = { programs: [{ id: 'methane-leak-watch', resistance: 0, milestone: 0 }] };
  const plain = launched.tickLaunched(greenWorldActive({ ...running, seconds: 1 }), () => 0.99);
  const granted = launched.tickLaunched(greenWorldActive({ ...running, seconds: 1, perks: ['workflow-abstraction', 'network-financing', 'grant-proposals'] }), () => 0.99);
  assert.equal(granted.budget - plain.budget, 100, '200 upkeep becomes 100');
  const program = content.programs.find(entry => entry.id === 'greenwashing-campaign');
  assert.equal(launched.programUpkeep(liveState({ perks: ['grant-proposals'] }), program), -500, 'income stays');

  // A decent lawyer goes to court right away.
  const sued = greenWorldActive({ lawsuit: { caseId: 0, courtSeconds: null }, lawsuitsFiled: 1 });
  assert.equal(launched.tickLaunched(sued, () => 0.99).lawsuit.courtSeconds, null, 'without a lawyer you decide');
  const lawyer = launched.tickLaunched({ ...sued, perks: [...sued.perks, 'decent-lawyer'] }, () => 0.99);
  assert.equal(lawyer.lawsuit.courtSeconds, 90, 'the lawyer takes it to court');

  // Win chances.
  assert.equal(launched.winChance(liveState()), 0.65);
  assert.ok(Math.abs(launched.winChance(liveState({ perks: ['good-lawyer'] })) - 0.85) < 1e-12);
  assert.equal(launched.winChance(liveState({ perks: ['good-lawyer', 'chewbacca-defense'] })), 0.95);
  const verdict = launched.tickLaunched({ ...sued, seconds: 1, lawsuit: { caseId: 0, courtSeconds: 1 },
    perks: [...sued.perks, 'chewbacca-defense'] }, () => 0.9);
  assert.equal(verdict.verdict.won, true, '0.9 wins with the Chewbacca defense');

  // The assembly keeps integrity at 40% and stops new protests.
  const assembly = greenWorldActive({ integrity: 40, rentals: ['nsa'], perks: ['workflow-abstraction', 'network-financing', 'citizens-assembly'],
    programs: [{ id: 'reforestation-network', resistance: 0, milestone: 0 }] });
  const calm = launched.tickLaunched(assembly, () => 0);
  assert.equal(calm.integrity, 40, 'never below 40%');
  assert.equal(calm.programs[0].resistance, 0, 'no new protests');
});

test('pitching to investors adds budget per click and grows with the income', () => {
  assert.equal(launched.pitch(liveState()), null, 'needs the Pitch Deck Generator');
  const content = require('../src/app/game/launched-content.ts');
  assert.equal(content.launchedPerks.find(entry => entry.id === 'pitch-deck').actionsRequired, 1000000);
  const start = liveState({ budget: 1000, perks: ['pitch-deck'] });
  assert.equal(launched.pitchValue(start), 100, 'at least 100: 175 actions per second only make 35');
  const pitched = launched.pitch(start);
  assert.equal(pitched.budget, 1100);
  assert.equal(pitched.stats.pitches, 1);
  const rich = liveState({ rentals: ['edisonx', 'nsa'], perks: ['network-financing'] });
  assert.equal(launched.pitchValue(rich), Math.round((175 + 3500) * 0.2), '20% of the income per second');
  assert.equal(launched.pitchValue(liveState({ focus: -100 })), 100, 'no budget payout while shipping features');
  assert.equal(launched.pitchValue(liveState({ serverSlots: 4 })), 463, 'three added servers: ×4.63');
});

test('Green World upgrades raise the version and make programs stronger', () => {
  let live = greenWorldActive();
  assert.equal(launched.upgradeCost(live, 'green-world'), 500000);
  live = launched.upgradeProduct(live, 'green-world');
  assert.deepEqual(launched.product(live, 'green-world'), { id: 'green-world', major: 1, minor: 1, active: true });
  assert.equal(launched.productTitle(launched.product(live, 'green-world')), 'Green World v1.1');
  assert.equal(launched.programBoost(live, 'green-world'), 1.25);
  assert.equal(launched.programBlocker(live, 'smart-grid-scheduler'), null, 'v1.1 unlocks the Smart Grid Scheduler');
  assert.equal(launched.upgradeCost(live, 'green-world'), 1000000);
  live = launched.startProgram(live, 'reforestation-network');
  live = climateAfter(live, 100);
  assert.ok(Math.abs(live.worldProgress.climate - 0.25) < 1e-9, '+25% per upgrade');
  assert.equal(launched.upgradeProduct(greenWorldActive({ budget: 499999 }), 'green-world'), null);
  const nine = greenWorldActive({ products: [{ id: 'green-world', major: 1, minor: 9, active: true }] });
  assert.equal(launched.productTitle(launched.product(launched.upgradeProduct(nine, 'green-world'), 'green-world')), 'Green World v2.0');
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
