const assert = require('node:assert/strict');
const { loadGame, saveGame } = require('../src/app/game/storage.ts');
const { formatVersion, nextVersion, versionForDeployments } = require('../src/app/models/version.model.ts');
const { deploymentBudgetReward, perks, perkUnlocked, openPerks, activePerks, activatePerk, addAssistant, nextAssistantCount, assistantLimit, newGame, openBugs, isAvailable, boardItems, sprintComplete, settle, selectItem, work, assistantCount, assistantOutput, assignAgent, nextAssistantUpgrade, upgradeAssistants, automationRate, currentAutomationRate, automate, canDeploy, deploy, canGenerateBugs, bugChance, automationRegressions, addBug, coveragePercent, coverageCost, coverageStep, improveCoverage } = require('../src/app/game/game.ts');

const withRandom = (value, callback) => {
  const original = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = original;
  }
};
const makeBug = game => withRandom(0, () => addBug(game));

const game = newGame();
const item = id => game.items.find(entry => entry.id === id);
const tasks = id => game.items.filter(entry => entry.type === 'task' && entry.parent === id);
const finish = entry => work(game, entry.id, entry.required);
const checkAvailability = available => {
  for (const story of game.items.filter(entry => entry.type === 'story')) {
    const expected = available.includes(story.id);
    assert.equal(isAvailable(game, story), expected, story.id);
    for (const task of tasks(story.id)) {
      assert.equal(isAvailable(game, task), expected, task.id);
      if (!expected) {
        const selected = game.selected;
        const target = game.automationTarget;
        const actions = game.actions;
        assert.equal(selectItem(game, task.id), false);
        assert.equal(work(game, task.id, 1), false);
        assert.equal(work(game, task.id, 1, true), false);
        assert.equal(game.selected, selected);
        assert.equal(game.automationTarget, target);
        assert.equal(game.actions, actions);
        assert.equal(task.progress, 0);
      }
    }
  }
};

checkAvailability(['S-01']);
assert.equal(bugChance(game), 0.04);
const bugRateThreshold = newGame();
bugRateThreshold.actions = 3999;
assert.equal(bugChance(bugRateThreshold), 0.04);
bugRateThreshold.actions = 4000;
assert.equal(bugChance(bugRateThreshold), 0.08);
bugRateThreshold.actions = 4001;
assert.equal(bugChance(bugRateThreshold), 0.08);
bugRateThreshold.actions = 7499;
assert.equal(bugChance(bugRateThreshold), 0.08);
bugRateThreshold.actions = 7500;
assert.equal(bugChance(bugRateThreshold), 0.12);
bugRateThreshold.actions = 7501;
assert.equal(bugChance(bugRateThreshold), 0.12);
bugRateThreshold.actions = 8499;
assert.equal(bugChance(bugRateThreshold), 0.12);
bugRateThreshold.actions = 8500;
assert.equal(bugChance(bugRateThreshold), 0.16);
bugRateThreshold.actions = 8501;
assert.equal(bugChance(bugRateThreshold), 0.16);
bugRateThreshold.actions = 10999;
assert.equal(bugChance(bugRateThreshold), 0.16);
bugRateThreshold.actions = 11000;
assert.equal(bugChance(bugRateThreshold), 0.30);
bugRateThreshold.actions = 11001;
assert.equal(bugChance(bugRateThreshold), 0.30);
bugRateThreshold.actions = 14999;
assert.equal(bugChance(bugRateThreshold), 0.30);
bugRateThreshold.actions = 15000;
assert.equal(bugChance(bugRateThreshold), 0.60);
bugRateThreshold.actions = 15001;
assert.equal(bugChance(bugRateThreshold), 0.60);
assert.equal(canGenerateBugs(game), false);
const initial = structuredClone(game);
assert.equal(withRandom(0, () => addBug(game)), null);
assert.deepEqual(game, initial);
const premature = newGame();
for (const task of premature.items.filter(entry => entry.parent === 'S-02')) {
  task.progress = task.required;
  task.done = true;
}
settle(premature);
assert.equal(premature.items.find(entry => entry.id === 'S-02').done, false);
assert.equal(isAvailable(premature, premature.items.find(entry => entry.id === 'S-03')), false);
assert.equal(activatePerk(premature, 'build-pipeline'), false);
assert.equal(canGenerateBugs(premature), false);
const beforeSetup = structuredClone(premature);
assert.equal(withRandom(0, () => addBug(premature)), null);
assert.deepEqual(premature, beforeSetup);

const expected = [
  ['Map the work that matters', ['Sketch the evidence model', 'Connect people, evidence and action', 'Chart a path from report to review', 'Plan the evidence and status screens', 'Design forms that ask the right questions']],
  ['Lay the platform foundations', ['Set up the community-facing app', 'Set up the platform server', 'Give evidence a database', 'Protect the server door']],
  ['Welcome people back safely', ['Check credentials and start sessions', 'Create a clear sign-in screen']],
  ['Move evidence toward review', ['Set up the review workflow engine', 'Build the first review pathway']],
  ['Put evidence within reach', ['Show the selected document', 'Navigate the evidence library']]
];
assert.equal(game.items.length, 20);
assert.deepEqual(boardItems(game).map(entry => entry.id), ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'S-01']);
assert.deepEqual(game.archivedIds, []);
assert.equal(game.items.filter(entry => entry.type === 'story').length, 5);
assert.equal(game.items.filter(entry => entry.type === 'task').length, 15);
assert.equal(game.items.some(entry => entry.type === 'epic' || entry.id === 'E-01'), false);
assert.equal(sprintComplete(game), false);
assert.equal(sprintComplete({ ...newGame(), items: [] }), false);
let taskNumber = 0;
for (const [index, [title, titles]] of expected.entries()) {
  const id = `S-${String(index + 1).padStart(2, '0')}`;
  const story = item(id);
  assert.equal(story.title, title);
  assert.equal(story.parent, undefined);
  assert.ok(story.detail);
  assert.deepEqual(tasks(id).map(entry => entry.title), titles);
  assert.equal(story.required, tasks(id).reduce((sum, entry) => sum + entry.required, 0));
  for (const task of tasks(id)) {
    assert.equal(task.id, `T-${String(++taskNumber).padStart(2, '0')}`);
    assert.equal(task.required, 10 + index * 5);
    assert.ok(task.detail && !task.detail.startsWith('Part of '));
  }
}
assert.deepEqual(game.items.map(entry => entry.id), [
  'T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'S-01',
  'T-06', 'T-07', 'T-08', 'T-09', 'S-02',
  'T-10', 'T-11', 'S-03', 'T-12', 'T-13', 'S-04', 'T-14', 'T-15', 'S-05'
]);
assert.ok(game.items.every(entry => !('unlock' in entry) && !('unlockDescription' in entry) && !('repeatable' in entry)));
assert.deepEqual(perks.map(({ id, name, kind }) => [id, name, kind]), [
  ['stack-overflow', 'Stack Overflow', 'simple'],
  ['build-pipeline', 'Build Pipeline', 'simple'],
  ['code-assistant', 'Code Assistant', 'upgradeable'],
  ['multi-agent', 'Multi Agent', 'simple'],
  ['ram-upgrade', 'Sell some of your organs to buy more RAM', 'simple'],
  ['ai-subscription', 'Upgrade AI Subscription', 'simple'],
  ['auto-assigner', 'Auto Assigner', 'simple'],
  ['bug-fix-agent', 'Bug-fix Agent', 'simple'],
  ['earl', 'Install Earl', 'upgradeable'],
  ['testing-skills', 'Improve Testing Skills', 'simple'],
  ['auto-testing', 'Automate Testing', 'simple'],
  ['ai-testing-subscription', 'Upgrade AI Subscription for testing', 'simple']
]);
assert.equal(perks.length, 12);
assert.equal(perks[7].actionsRequired, 10000);
assert.equal(perks[7].rate, undefined);
assert.match(perks[7].description, /1 bug-fixing action\s*\/\s*sec/i);
assert.equal(perks[6].actionsRequired, 6000);
assert.equal(perks[6].rate, undefined);
assert.equal(perks[5].actionsRequired, 4000);
assert.equal(perks[5].rate, undefined);
assert.match(perks[5].description, /double.*assistant/i);
const goals = [50, 200, 700, 1000, 2000, 4000, 6000, 10000, 17000, 20000, 25000, 28000];
assert.deepEqual(perks.map(perk => perk.actionsRequired), goals);
assert.match(perks[9].description, /manual.*coverage.*0\.005 percentage points/i);
assert.match(perks[10].description, /Earl.*coverage.*0\.001 percentage points\/sec.*automatic coverage upgrades/i);
assert.ok(perks.every(perk => !('storyId' in perk) && !('prerequisite' in perk)));
for (const [index, perk] of perks.entries()) {
  const boundary = newGame();
  boundary.actions = goals[index] - 1;
  assert.equal(perkUnlocked(boundary, perk), false, perk.id);
  assert.equal(activatePerk(boundary, perk.id), false, perk.id);
  assert.equal(work(boundary, 'T-01', 1), true);
  assert.equal(perkUnlocked(boundary, perk), true, perk.id);
  assert.equal(activatePerk(boundary, perk.id), true, perk.id);
  assert.equal(boundary.actions, goals[index], perk.id);
  assert.deepEqual(boundary.activatedPerks, [perk.id]);
  assert.ok(boundary.items.filter(entry => entry.type === 'story').every(story => !story.done));
}
assert.equal(new Set(perks.map(perk => perk.icon)).size, perks.length);
assert.equal(perks[4].storyId, undefined);
assert.equal(perks[4].actionsRequired, 2000);
assert.equal(perks[4].rate, 2);
assert.ok(perks.every(perk => perk.description && perk.icon));
assert.deepEqual(openPerks(game), perks.slice(0, 3));
assert.deepEqual(activePerks(game), []);
assert.ok(perks.every(perk => !perkUnlocked(game, perk)));
assert.equal(perkUnlocked(game, { id: 'unknown' }), false);
assert.equal(activatePerk(game, 'unknown'), false);
assert.equal(activatePerk(game, 'multi-agent'), false);
assert.equal(addAssistant(game), false);
assert.equal(nextAssistantCount(game), 0);
assert.equal(activatePerk(game, 'stack-overflow'), false);
assert.equal(work(game, 'S-01', 1), false);
assert.equal(selectItem(game, 'S-01'), false);
assert.equal(work(game, 'T-01', 3), true);
assert.equal(item('S-01').progress, 3);
for (const task of tasks('S-01')) finish(task);
assert.equal(item('S-01').done, true);
checkAvailability(['S-01', 'S-02']);
assert.equal(automationRate(game), 0);
assert.equal(perkUnlocked(game, perks[0]), true);
assert.equal(perkUnlocked(game, perks[1]), false);
assert.equal(activatePerk(game, 'stack-overflow'), true);
assert.equal(activatePerk(game, 'stack-overflow'), false);
assert.deepEqual(openPerks(game), perks.slice(1, 4));
assert.deepEqual(activePerks(game), [perks[0]]);
game.automationTarget = 'T-10';
automate(game);
assert.equal(item('T-10').progress, 0);
game.automationTarget = null;
automate(game);
assert.equal(item('T-06').progress, 0);
assert.equal(selectItem(game, 'T-06'), true);
for (const task of tasks('S-02')) finish(task);
assert.equal(item('S-02').done, true);
assert.equal(canGenerateBugs(game), true);
checkAvailability(['S-01', 'S-02', 'S-03']);
assert.equal(activatePerk(game, 'build-pipeline'), false);
game.activatedPerks.push('build-pipeline');
assert.equal(activatePerk(game, 'build-pipeline'), false);
assert.equal(automationRate(game), 2);
assert.equal(selectItem(game, 'T-10'), true);
const firstBug = makeBug(game);
const secondBug = makeBug(game);
assert.notEqual(firstBug.title, secondBug.title);
assert.equal(isAvailable(game, firstBug), true);
assert.equal(isAvailable(game, secondBug), true);
assert.equal(isAvailable(game, item('T-10')), true);
assert.equal(game.automationTarget, 'T-10');
assert.equal(selectItem(game, firstBug.id), true);
assert.equal(selectItem(game, 'T-11'), false);
assert.equal(work(game, 'T-11', 1), false);
assert.equal(work(game, firstBug.id, 1, true), false);
for (let i = 0; i < 10; i++) automate(game);
assert.equal(item('T-10').done, true);
assert.equal(item('T-11').progress, 0);
assert.equal(game.selected, firstBug.id);
finish(firstBug);
finish(secondBug);
assert.equal(openBugs(game).length, 0);
assert.equal(selectItem(game, 'T-11'), true);
const thirdBug = makeBug(game);
const fourthBug = makeBug(game);
for (let i = 0; i < 10; i++) automate(game);
assert.equal(item('S-03').progress, item('S-03').required);
assert.equal(item('S-03').done, false);
checkAvailability(['S-01', 'S-02', 'S-03']);
assert.equal(activatePerk(game, 'code-assistant'), false);
finish(thirdBug);
assert.equal(item('S-03').done, false);
checkAvailability(['S-01', 'S-02', 'S-03']);
finish(fourthBug);
assert.equal(item('S-03').done, true);
checkAvailability(['S-01', 'S-02', 'S-03', 'S-04', 'S-05']);
assert.equal(item('S-04').done, false);
assert.equal(selectItem(game, 'T-14'), true);
assert.equal(work(game, 'T-14', 1), true);
assert.equal(item('S-04').done, false);
assert.equal(perkUnlocked(game, perks[2]), false);
assert.equal(perkUnlocked(game, perks[3]), false);
assert.equal(activatePerk(game, 'code-assistant'), false);
game.activatedPerks.push('code-assistant');
game.assistants = 1;
game.agentTargets.push(null);
game.agentCarry.push(0);
assert.equal(activatePerk(game, 'code-assistant'), false);
assert.equal(perkUnlocked(game, perks[3]), false);
assert.deepEqual(openPerks(game), [perks[3], perks[4], perks[5]]);
assert.deepEqual(activePerks(game), perks.slice(0, 3));
assert.equal(automationRate(game), 3);
assert.equal(selectItem(game, 'T-12'), true);
automate(game);
assert.equal(item('T-12').progress, 3);
assert.equal(item('T-13').progress, 0);
for (const story of ['S-04', 'S-05']) {
  for (const task of tasks(story)) finish(task);
  assert.equal(item(story).done, true);
}
assert.equal(sprintComplete(game), true);
assert.equal(game.actions, 260 + firstBug.required + secondBug.required + thirdBug.required + fourthBug.required);
const finalBug = makeBug(game);
assert.equal(sprintComplete(game), false);
finish(finalBug);
assert.equal(sprintComplete(game), true);
assert.equal(sprintComplete({ ...game, items: game.items.filter(entry => entry.type !== 'story') }), false);
assert.equal(automationRate(newGame()), 0);

const contextual = newGame();
const completeStory = id => {
  for (const task of contextual.items.filter(entry => entry.parent === id)) assert.equal(work(contextual, task.id, task.required), true);
  assert.equal(contextual.items.find(entry => entry.id === id).done, true);
};
const templates = {
  'S-02': [
    ['Database connection fails', 'Fix the backend database connection so the application can access its schema.'],
    ['Server API fails to start', 'Fix the backend server configuration so its API entry point starts correctly.'],
    ['Frontend configuration is incorrect', 'Fix the frontend development configuration so it can reach the backend.']
  ],
  'S-03': [
    ['Login rejects valid credentials', 'Fix the login service so valid credentials create an authenticated session.'],
    ['Login screen hides sign-in errors', 'Show authentication errors on the login screen when sign-in fails.']
  ],
  'S-04': [['Document workflow transition fails', 'Fix the workflow engine so documents can move between their configured states.']],
  'S-05': [
    ['Document preview is missing', 'Fix the document browser preview so it displays the selected document contents.'],
    ['File explorer omits folders', 'Fix the document browser file explorer so users can navigate folders.']
  ]
};
const checkTemplates = stories => {
  const actions = contextual.actions;
  for (const regression of [false, true]) {
    contextual.actions = regression ? 15000 : 14999;
    const expected = stories.flatMap(id => templates[id]).map(([title, detail]) => regression
      ? [`Automation regression: ${title}`, `Fully automated code introduced this regression. ${detail}`]
      : [title, detail]);
    const actual = new Map();
    for (let i = 0; i < 100; i++) {
      const bug = withRandom(i / 100, () => addBug(contextual));
      assert.ok(expected.some(([title, detail]) => title === bug.title && detail === bug.detail));
      actual.set(bug.title, bug.detail);
      bug.done = true;
    }
    assert.deepEqual([...actual.entries()].sort(), expected.slice().sort());
  }
  contextual.actions = actions;
};
completeStory('S-01');
assert.equal(canGenerateBugs(contextual), false);
completeStory('S-02');
checkTemplates(['S-02']);
completeStory('S-03');
const outOfOrder = structuredClone(contextual);
outOfOrder.actions = 1000;
assert.equal(activatePerk(outOfOrder, 'code-assistant'), true);
assert.deepEqual(openPerks(outOfOrder), [perks[0], perks[1], perks[3]]);
assert.deepEqual(activePerks(outOfOrder), [perks[2]]);
assert.equal(perkUnlocked(outOfOrder, perks[3]), true);
assert.equal(activatePerk(outOfOrder, 'multi-agent'), true);
assert.deepEqual(outOfOrder.agentTargets, [null]);
assert.deepEqual(openPerks(outOfOrder), [perks[0], perks[1], perks[4]]);
assert.deepEqual(activePerks(outOfOrder), perks.slice(2, 4));
checkTemplates(['S-02', 'S-03']);
completeStory('S-05');
assert.equal(contextual.items.find(entry => entry.id === 'S-04').done, false);
checkTemplates(['S-02', 'S-03', 'S-05']);
completeStory('S-04');
checkTemplates(['S-02', 'S-03', 'S-04', 'S-05']);
const unique = templates['S-02'].length + templates['S-03'].length + templates['S-04'].length + templates['S-05'].length;
const active = Array.from({ length: unique }, () => makeBug(contextual));
assert.equal(new Set(active.map(bug => bug.title)).size, unique);
const duplicate = makeBug(contextual);
assert.ok(active.some(bug => bug.title === duplicate.title));
const multi = newGame();
const get = id => multi.items.find(entry => entry.id === id);
const storyTasks = id => multi.items.filter(entry => entry.parent === id);
const complete = id => {
  for (const task of storyTasks(id)) {
    if (!task.done) assert.equal(work(multi, task.id, task.required), true);
  }
  assert.equal(get(id).done, true);
};
assert.equal(canDeploy(multi), false);
assert.equal(deploy(multi), false);
assert.equal(assistantCount(multi), 0);
assert.equal(nextAssistantCount(multi), 0);
assert.equal(activatePerk(multi, 'multi-agent'), false);
assert.equal(assignAgent(multi, 'T-01'), false);
assert.equal(upgradeAssistants(multi), false);
for (const id of ['S-01', 'S-02', 'S-03']) complete(id);
assert.equal(activatePerk(multi, 'stack-overflow'), true);
assert.equal(activatePerk(multi, 'build-pipeline'), false);
assert.equal(activatePerk(multi, 'code-assistant'), false);
multi.activatedPerks.push('build-pipeline', 'code-assistant');
multi.assistants = 1;
multi.agentTargets.push(null);
multi.agentCarry.push(0);
assert.equal(activatePerk(multi, 'code-assistant'), false);
assert.equal(multi.actions, 150);
assert.equal(nextAssistantUpgrade(multi), 500);
assert.equal(upgradeAssistants(multi), false);
const beforeMulti = structuredClone(multi);
beforeMulti.actions = 500;
beforeMulti.budget = 500;
assert.equal(upgradeAssistants(beforeMulti), false);
const beforeRejectedAssistant = structuredClone(beforeMulti);
assert.equal(addAssistant(beforeMulti), false);
assert.deepEqual(beforeMulti, beforeRejectedAssistant);
assert.equal(assistantCount(beforeMulti), 1);
assert.equal(selectItem(beforeMulti, 'T-12'), true);
assert.equal(work(beforeMulti, 'T-12', 1), true);
automate(beforeMulti);
assert.equal(beforeMulti.items.find(item => item.id === 'T-12').progress, 4);
assert.equal(beforeMulti.actions, 504);
const noAssistant = newGame();
noAssistant.actions = 5000;
noAssistant.budget = 1000;
assert.equal(addAssistant(noAssistant), false);
assert.equal(upgradeAssistants(noAssistant), false);
noAssistant.activatedPerks.push('multi-agent');
assert.equal(upgradeAssistants(noAssistant), false);
assert.equal(selectItem(multi, 'T-12'), true);
assert.equal(activatePerk(multi, 'multi-agent'), false);
multi.actions = 1000;
assert.equal(activatePerk(multi, 'multi-agent'), true);
multi.actions = 150;
assert.equal(activatePerk(multi, 'multi-agent'), false);
assert.deepEqual(openPerks(multi), [perks[4], perks[5], perks[6]]);
assert.deepEqual(activePerks(multi), perks.slice(0, 4));
assert.deepEqual(multi.activatedPerks, perks.slice(0, 4).map(perk => perk.id));
const countThresholds = structuredClone(multi);
countThresholds.budget = 499;
assert.equal(nextAssistantCount(countThresholds), 500);
assert.equal(addAssistant(countThresholds), false);
assert.equal(work(countThresholds, 'T-12', 1), true);
assert.equal(addAssistant(countThresholds), false);
countThresholds.budget = 500;
const countActions = countThresholds.actions;
assert.equal(addAssistant(countThresholds), true);
assert.equal(countThresholds.actions, countActions);
assert.equal(countThresholds.budget, 0);
assert.equal(nextAssistantCount(countThresholds), 625);
assert.deepEqual(countThresholds.agentTargets, ['T-12', null]);
assert.deepEqual(countThresholds.agentCarry, [0, 0]);
countThresholds.budget = 624;
const countBug = makeBug(countThresholds);
assert.equal(work(countThresholds, countBug.id, 2), true);
assert.equal(addAssistant(countThresholds), false);
countThresholds.budget = 626;
assert.equal(addAssistant(countThresholds), true);
assert.equal(countThresholds.budget, 1);
assert.equal(nextAssistantCount(countThresholds), 782);
assert.equal(addAssistant(countThresholds), false);
assert.deepEqual(countThresholds.agentTargets, ['T-12', null, null]);
assert.deepEqual(countThresholds.agentCarry, [0, 0, 0]);
countThresholds.budget = 781;
assert.equal(addAssistant(countThresholds), false);
countThresholds.budget = 782;
assert.equal(addAssistant(countThresholds), true);
assert.equal(addAssistant(countThresholds), false);
const automaticThreshold = structuredClone(multi);
automaticThreshold.actions = 499;
automaticThreshold.budget = 499;
assert.equal(upgradeAssistants(automaticThreshold), false);
automate(automaticThreshold);
assert.equal(automaticThreshold.actions, 502);
assert.equal(addAssistant(automaticThreshold), false);
assert.equal(upgradeAssistants(automaticThreshold), false);
const thresholds = structuredClone(multi);
thresholds.budget = 499;
assert.equal(nextAssistantUpgrade(thresholds), 500);
assert.equal(upgradeAssistants(thresholds), false);
assert.equal(work(thresholds, 'T-12', 1), true);
assert.equal(upgradeAssistants(thresholds), false);
thresholds.budget = 500;
const upgradeActions = thresholds.actions;
assert.equal(upgradeAssistants(thresholds), true);
assert.equal(thresholds.actions, upgradeActions);
assert.equal(thresholds.budget, 0);
assert.equal(nextAssistantUpgrade(thresholds), 625);
assert.equal(upgradeAssistants(thresholds), false);
thresholds.budget = 624;
const thresholdBug = makeBug(thresholds);
assert.equal(work(thresholds, thresholdBug.id, 2), true);
assert.equal(upgradeAssistants(thresholds), false);
thresholds.budget = 626;
assert.equal(upgradeAssistants(thresholds), true);
assert.equal(thresholds.budget, 1);
assert.equal(nextAssistantUpgrade(thresholds), 782);
thresholds.budget = 781;
assert.equal(upgradeAssistants(thresholds), false);
thresholds.budget = 782;
assert.equal(upgradeAssistants(thresholds), true);
assert.equal(nextAssistantUpgrade(thresholds), 977);
assert.equal(upgradeAssistants(thresholds), false);
assert.equal(upgradeAssistants(multi), false);
assert.equal(multi.actions, 150);
assert.equal(nextAssistantUpgrade(multi), 500);
assert.deepEqual(multi.agentTargets, ['T-12']);
assert.equal(assignAgent(multi, 'T-14'), false);
assert.equal(assignAgent(multi, 'T-12'), true);
assert.equal(assignAgent(multi, 'T-14'), true);
assert.equal(selectItem(multi, 'T-13'), true);
assert.deepEqual(multi.agentTargets, ['T-14']);
automate(multi);
assert.equal(get('T-13').progress, 2);
assert.equal(get('T-14').progress, 1);
assert.equal(get('T-12').progress, 0);
assert.equal(upgradeAssistants(multi), false);
complete('S-04');
assert.equal(canDeploy(multi), false);
assert.equal(deploy(multi), false);
complete('S-05');
assert.deepEqual(multi.agentTargets, [null]);
assert.equal(canDeploy(multi), true);
const blockingBug = makeBug(multi);
assert.equal(canDeploy(multi), false);
const blockedDeployment = structuredClone(multi);
assert.equal(deploy(multi), false);
assert.deepEqual(multi, blockedDeployment);
assert.equal(work(multi, blockingBug.id, blockingBug.required), true);
const beforeDeploy = structuredClone(multi.items);
const completedBeforeDeploy = beforeDeploy.filter(entry => entry.done).map(entry => entry.id);
assert.ok(boardItems(multi).some(entry => entry.done));
assert.equal(deploy(multi), true);
assert.deepEqual(multi.items.slice(0, beforeDeploy.length), beforeDeploy);
assert.deepEqual(multi.archivedIds, completedBeforeDeploy);
assert.ok(boardItems(multi).every(entry => !completedBeforeDeploy.includes(entry.id)));
assert.equal(boardItems(multi).length, 15);
assert.equal(get('S-03').done, true);
assert.equal(assistantCount(multi), 1);
assert.equal(multi.deployments, 1);
assert.equal(canDeploy(multi), false);
assert.equal(sprintComplete(multi), false);
assert.equal(deploy(multi), false);
assert.equal(nextAssistantCount(multi), 500);
assert.equal(addAssistant(multi), false);
assert.equal(assistantCount(multi), 1);
assert.equal(activatePerk(multi, 'code-assistant'), false);
multi.actions = 500;
multi.budget = 500;
assert.equal(addAssistant(multi), true);
assert.equal(multi.actions, 500);
assert.equal(assistantCount(multi), 2);
assert.equal(addAssistant(multi), false);
assert.deepEqual(multi.agentTargets, [null, null]);
assert.equal(nextAssistantUpgrade(multi), 500);
assert.equal(automationRate(multi), 4);
const newStories = multi.items.filter(entry => entry.type === 'story').slice(5);
assert.deepEqual(newStories.map(entry => entry.title), ['Find the evidence that matters', 'Keep sensitive evidence safe', 'Remember how evidence changed', 'Make the record accountable', 'Keep contributors in the loop']);
assert.deepEqual(newStories.map(story => storyTasks(story.id).map(task => task.title)), [
  ['Make evidence searchable', 'Build a search people can use'],
  ['Define who can do what', 'Check access before every change'],
  ['Save each document revision', 'Let reviewers explore earlier versions'],
  ['Record who changed what', 'Open the activity record'],
  ['Send updates about document activity', 'Build an inbox for updates']
]);
assert.ok(multi.items.every(entry => !/level\s+one/i.test(`${entry.title} ${entry.detail}`)));
for (const story of newStories) {
  assert.equal(isAvailable(multi, story), true);
  assert.equal(storyTasks(story.id).length, 2);
  for (const task of storyTasks(story.id)) {
    assert.equal(isAvailable(multi, task), true);
    assert.ok(task.title && task.detail);
  }
}
assert.equal(selectItem(multi, 'T-18'), true);
assert.equal(assignAgent(multi, 'T-16'), true);
assert.equal(assignAgent(multi, 'T-17'), true);
assert.equal(assignAgent(multi, 'T-19'), false);
const bug = makeBug(multi);
assert.equal(assignAgent(multi, 'T-16'), false);
assert.equal(assignAgent(multi, 'T-19'), false);
for (let i = 0; i < 9; i++) automate(multi);
assert.equal(get('T-16').progress, 9);
assert.equal(get('T-17').progress, 9);
assert.deepEqual(multi.agentCarry, [0, 0]);
automate(multi);
assert.equal(get('T-16').progress, 10);
assert.equal(get('T-17').progress, 10);
assert.equal(get('T-18').progress, 20);
assert.equal(get('T-19').progress, 0);
assert.deepEqual(multi.agentTargets, ['T-16', 'T-17']);
assert.equal(work(multi, bug.id, bug.required), true);
assert.equal(selectItem(multi, 'T-19'), true);
assert.deepEqual(multi.agentTargets, ['T-16', 'T-17']);
assert.equal(assignAgent(multi, 'T-16'), true);
assert.equal(assignAgent(multi, 'T-20'), true);
assert.deepEqual(multi.agentTargets, ['T-20', 'T-17']);
assert.equal(work(multi, 'T-20', 30), true);
assert.ok(boardItems(multi).some(entry => entry.id === 'T-20' && entry.done));
assert.deepEqual(multi.agentTargets, [null, 'T-17']);
automate(multi);
assert.equal(get('T-21').progress, 0);
for (const story of newStories) complete(story.id);
assert.equal(canDeploy(multi), true);
assert.equal(deploy(multi), true);
assert.equal(multi.deployments, 2);
assert.ok(!boardItems(multi).some(entry => entry.id === 'T-20'));
assert.ok(boardItems(multi).some(entry => entry.id === 'S-11'));
assert.equal(canDeploy(multi), false);
assert.equal(nextAssistantCount(multi), 625);
multi.budget = 624;
assert.equal(addAssistant(multi), false);
assert.equal(assistantCount(multi), 2);
multi.budget = 1125;
const actionsBeforeAssistant = multi.actions;
assert.equal(addAssistant(multi), true);
assert.equal(multi.actions, actionsBeforeAssistant);
assert.deepEqual(multi.agentTargets, [null, null, null]);
const cumulativeActions = multi.actions;
assert.equal(upgradeAssistants(multi), true);
assert.equal(multi.actions, cumulativeActions);
assert.equal(nextAssistantUpgrade(multi), 625);
assert.equal(multi.actions >= nextAssistantUpgrade(multi), true);
assert.equal(automationRate(multi), 5.3);
const allStories = multi.items.filter(entry => entry.type === 'story');
assert.equal(allStories.length, 15);
assert.ok(allStories.slice(10).every(story => story.title.endsWith('(iteration 2)') && isAvailable(multi, story) && storyTasks(story.id).length === 2));
assert.equal(new Set(multi.items.map(entry => entry.id)).size, multi.items.length);
assert.equal(selectItem(multi, 'T-29'), true);
const fractional = structuredClone(multi);
assert.equal(assignAgent(fractional, 'T-26'), true);
assert.equal(assignAgent(fractional, 'T-27'), true);
for (let i = 0; i < 9; i++) automate(fractional);
assert.deepEqual(['T-26', 'T-27', 'T-29'].map(id => fractional.items.find(entry => entry.id === id).progress), [9, 9, 18]);
assert.deepEqual(fractional.agentCarry, [9, 9, 0]);
automate(fractional);
assert.deepEqual(['T-26', 'T-27', 'T-29'].map(id => fractional.items.find(entry => entry.id === id).progress), [11, 11, 20]);
assert.deepEqual(fractional.agentCarry, [0, 0, 0]);
for (const id of ['T-26', 'T-27', 'T-28']) assert.equal(assignAgent(multi, id), true);
const actionsBefore = multi.actions;
for (let i = 0; i < 10; i++) automate(multi);
assert.deepEqual(['T-26', 'T-27', 'T-28', 'T-29'].map(id => get(id).progress), [11, 11, 11, 20]);
assert.equal(multi.actions - actionsBefore, 53);
assert.ok(Number.isInteger(multi.actions));
assert.deepEqual(newGame(), newGame());
assert.equal(newGame().deployments, 0);
assert.deepEqual(newGame().agentTargets, []);
assert.deepEqual(newGame().agentCarry, []);
assert.deepEqual(newGame().activatedPerks, []);
assert.equal(newGame().assistants, 0);
assert.equal(newGame().assistantUpgrades, 0);
assert.equal(newGame().actions, 0);

const ramBoundary = newGame();
ramBoundary.actions = 1999;
assert.equal(perkUnlocked(ramBoundary, perks[4]), false);
assert.equal(activatePerk(ramBoundary, 'ram-upgrade'), false);
assert.equal(work(ramBoundary, 'T-01', 1), true);
assert.equal(ramBoundary.actions, 2000);
assert.ok(ramBoundary.items.filter(entry => entry.type === 'story').every(story => !story.done));
assert.equal(perkUnlocked(ramBoundary, perks[4]), true);
assert.equal(activatePerk(ramBoundary, 'ram-upgrade'), true);
assert.equal(ramBoundary.actions, 2000);
assert.deepEqual(openPerks(ramBoundary), perks.slice(0, 3));
automate(ramBoundary);
assert.equal(ramBoundary.actions, 2000);
assert.equal(ramBoundary.selected, null);
assert.equal(ramBoundary.automationTarget, null);

const ram = newGame();
const ramItem = id => ram.items.find(entry => entry.id === id);
const completedRamStories = [];
const finishRamStory = id => {
  assert.equal(ramItem(id).done, false);
  for (const task of ram.items.filter(entry => entry.parent === id && !entry.done)) {
    assert.equal(work(ram, task.id, task.required), true);
  }
  completedRamStories.push(id);
  assert.deepEqual(ram.items.filter(entry => entry.type === 'story' && entry.done).map(entry => entry.id), completedRamStories);
};
assert.equal(perkUnlocked(ram, perks[4]), false);
assert.equal(activatePerk(ram, 'ram-upgrade'), false);
finishRamStory('S-01');
assert.equal(perkUnlocked(ram, perks[4]), false);
assert.equal(activatePerk(ram, 'ram-upgrade'), false);
finishRamStory('S-02');
assert.equal(perkUnlocked(ram, perks[4]), false);
assert.equal(activatePerk(ram, 'ram-upgrade'), false);
ram.actions = 2000;
assert.equal(perkUnlocked(ram, perks[4]), true);
const rateBeforeRam = automationRate(ram);
const otherPerksBeforeRam = perks.slice(0, 4).map(perk => perkUnlocked(ram, perk));
assert.equal(activatePerk(ram, 'ram-upgrade'), true);
assert.equal(ram.actions, 2000);
assert.equal(activatePerk(ram, 'ram-upgrade'), false);
assert.equal(automationRate(ram), rateBeforeRam + 2);
assert.deepEqual(ram.activatedPerks, ['ram-upgrade']);
assert.deepEqual(activePerks(ram), [perks[4]]);
assert.deepEqual(openPerks(ram), perks.slice(0, 3));
assert.deepEqual(perks.slice(0, 4).map(perk => perkUnlocked(ram, perk)), otherPerksBeforeRam);
const noTargetActions = ram.actions;
automate(ram);
assert.equal(ram.selected, null);
assert.equal(ram.automationTarget, null);
assert.equal(ramItem('T-10').progress, 0);
assert.equal(ram.actions, noTargetActions);
assert.equal(selectItem(ram, 'T-10'), true);
automate(ram);
assert.equal(ramItem('T-10').progress, 2);
assert.equal(ramItem('T-11').progress, 0);
const ramBug = makeBug(ram);
assert.equal(ram.selected, ramBug.id);
const bugThreshold = structuredClone(ram);
bugThreshold.activatedPerks = [];
bugThreshold.actions = 1999;
assert.equal(perkUnlocked(bugThreshold, perks[4]), false);
assert.equal(work(bugThreshold, ramBug.id, 1), true);
assert.equal(perkUnlocked(bugThreshold, perks[4]), true);
assert.equal(activatePerk(bugThreshold, 'ram-upgrade'), true);
assert.equal(bugThreshold.actions, 2000);
assert.equal(work(bugThreshold, 'T-10', 1), false);
automate(bugThreshold);
assert.equal(bugThreshold.items.find(entry => entry.id === ramBug.id).progress, 1);
assert.equal(bugThreshold.items.find(entry => entry.id === 'T-10').progress, 4);
automate(ram);
assert.equal(ramItem('T-10').progress, 4);
assert.equal(ramBug.progress, 0);
assert.equal(ramItem('T-11').progress, 0);
assert.equal(work(ram, ramBug.id, ramBug.required), true);
finishRamStory('S-03');
for (const id of ['stack-overflow', 'build-pipeline', 'code-assistant', 'multi-agent']) assert.equal(activatePerk(ram, id), true);
assert.deepEqual(activePerks(ram), perks.slice(0, 5));
assert.equal(selectItem(ram, 'T-12'), true);
assert.equal(assignAgent(ram, 'T-14'), true);
const withoutRam = structuredClone(ram);
withoutRam.activatedPerks = withoutRam.activatedPerks.filter(id => id !== 'ram-upgrade');
assert.equal(automationRate(ram), automationRate(withoutRam) + 2);
automate(ram);
automate(withoutRam);
assert.equal(ramItem('T-12').progress, withoutRam.items.find(entry => entry.id === 'T-12').progress + 2);
assert.equal(ramItem('T-14').progress, withoutRam.items.find(entry => entry.id === 'T-14').progress);
assert.deepEqual(ram.agentTargets, withoutRam.agentTargets);
assert.deepEqual(ram.agentCarry, withoutRam.agentCarry);
for (const id of ['S-04', 'S-05']) finishRamStory(id);
assert.equal(deploy(ram), true);
assert.equal(activatePerk(ram, 'ram-upgrade'), false);
const deployedThreshold = structuredClone(ram);
deployedThreshold.activatedPerks = deployedThreshold.activatedPerks.filter(id => id !== 'ram-upgrade');
deployedThreshold.actions = 1999;
assert.equal(perkUnlocked(deployedThreshold, perks[4]), false);
assert.equal(activatePerk(deployedThreshold, 'ram-upgrade'), false);
assert.equal(selectItem(deployedThreshold, 'T-16'), true);
automate(deployedThreshold);
assert.ok(deployedThreshold.actions >= 2000);
assert.equal(perkUnlocked(deployedThreshold, perks[4]), true);
const deployedActions = deployedThreshold.actions;
assert.equal(activatePerk(deployedThreshold, 'ram-upgrade'), true);
assert.equal(deployedThreshold.actions, deployedActions);
const deployedWithoutRam = structuredClone(ram);
deployedWithoutRam.activatedPerks = deployedWithoutRam.activatedPerks.filter(id => id !== 'ram-upgrade');
assert.equal(automationRate(ram), automationRate(deployedWithoutRam) + 2);
assert.equal(selectItem(ram, 'T-16'), true);
assert.equal(selectItem(deployedWithoutRam, 'T-16'), true);
automate(ram);
automate(deployedWithoutRam);
assert.equal(ramItem('T-16').progress, deployedWithoutRam.items.find(entry => entry.id === 'T-16').progress + 2);
assert.equal(ramItem('T-17').progress, 0);
const closeRate = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} !== ${expected}`);
const current = newGame();
const currentItem = id => current.items.find(entry => entry.id === id);
assert.equal(currentAutomationRate(current), 0);
current.activatedPerks.push('stack-overflow', 'ram-upgrade', 'code-assistant');
current.assistants = 1;
current.agentTargets = [null];
current.agentCarry = [0];
assert.equal(automationRate(current), 4);
assert.equal(currentAutomationRate(current), 0);
assert.equal(current.automationTarget, null);
assert.equal(selectItem(current, 'T-01'), true);
assert.equal(currentAutomationRate(current), 4);
current.assistants = 2;
current.agentTargets.push(null);
current.agentCarry.push(0);
assert.equal(currentAutomationRate(current), 5);
current.assistantUpgrades = 1;
closeRate(currentAutomationRate(current), 5.2);
current.activatedPerks.push('multi-agent');
assert.equal(currentAutomationRate(current), 3);
assert.equal(assignAgent(current, 'T-02'), true);
assert.equal(currentAutomationRate(current), 4.1);
assert.equal(assignAgent(current, 'T-03'), true);
closeRate(currentAutomationRate(current), 5.2);
current.automationTarget = null;
assert.equal(currentAutomationRate(current), 2.2);
current.automationTarget = 'T-01';
current.agentTargets = ['T-01', 'T-01'];
currentItem('T-01').progress = currentItem('T-01').required - 2.5;
assert.equal(currentAutomationRate(current), 2.5);
current.agentTargets[1] = 'T-02';
currentItem('T-02').progress = currentItem('T-02').required - 0.5;
assert.equal(currentAutomationRate(current), 3);
const currentSnapshot = structuredClone(current);
assert.equal(currentAutomationRate(current), 3);
assert.deepEqual(current, currentSnapshot);
currentItem('T-01').progress = currentItem('T-01').required;
assert.equal(currentAutomationRate(current), 0.5);
currentItem('T-02').done = true;
assert.equal(currentAutomationRate(current), 0);
current.automationTarget = 'T-06';
current.agentTargets = ['T-06', 'S-01'];
assert.equal(currentAutomationRate(current), 0);
current.automationTarget = 'missing';
current.agentTargets = [null, 'missing'];
assert.equal(currentAutomationRate(current), 0);

const currentBugs = structuredClone(beforeMulti);
currentBugs.actions = 1000;
currentBugs.budget = 500;
assert.equal(activatePerk(currentBugs, 'multi-agent'), true);
assert.equal(addAssistant(currentBugs), true);
assert.equal(assignAgent(currentBugs, 'T-13'), true);
currentBugs.assistantUpgrades = 1;
const currentBug = makeBug(currentBugs);
closeRate(currentAutomationRate(currentBugs), 4.2);
const bugProgress = currentBug.progress;
const taskProgress = currentBugs.items.find(entry => entry.id === 'T-13').progress;
automate(currentBugs);
assert.equal(currentBug.progress, bugProgress);
assert.equal(currentBugs.items.find(entry => entry.id === 'T-13').progress, taskProgress + 1);
currentBugs.automationTarget = currentBug.id;
currentBugs.agentTargets = [currentBug.id, null];
assert.equal(currentAutomationRate(currentBugs), 0);

const paused = newGame();
paused.activatedPerks.push('ram-upgrade');
paused.automationTarget = 'T-01';
for (const story of paused.items.filter(entry => entry.type === 'story')) story.done = true;
assert.equal(canDeploy(paused), true);
assert.equal(automationRate(paused), 2);
assert.equal(currentAutomationRate(paused), 0);
const pausedBug = makeBug(paused);
assert.equal(canDeploy(paused), false);
assert.equal(currentAutomationRate(paused), 2);
assert.equal(work(paused, pausedBug.id, pausedBug.required), true);
assert.equal(currentAutomationRate(paused), 0);
const subscriptionBoundary = newGame();
subscriptionBoundary.actions = 3999;
assert.equal(perkUnlocked(subscriptionBoundary, perks[5]), false);
assert.equal(activatePerk(subscriptionBoundary, 'ai-subscription'), false);
assert.equal(work(subscriptionBoundary, 'T-01', 1), true);
assert.equal(perkUnlocked(subscriptionBoundary, perks[5]), true);
assert.equal(activatePerk(subscriptionBoundary, 'ai-subscription'), true);
assert.equal(subscriptionBoundary.actions, 4000);
assert.equal(activatePerk(subscriptionBoundary, 'ai-subscription'), false);
assert.equal(subscriptionBoundary.actions, 4000);
assert.equal(assistantCount(subscriptionBoundary), 0);
assert.equal(assistantOutput(subscriptionBoundary), 2);
assert.equal(automationRate(subscriptionBoundary), 0);
assert.equal(currentAutomationRate(subscriptionBoundary), 0);
assert.deepEqual(openPerks(subscriptionBoundary), perks.slice(0, 3));
for (const id of ['S-01', 'S-02', 'S-03']) {
  for (const task of subscriptionBoundary.items.filter(entry => entry.parent === id && !entry.done)) assert.equal(work(subscriptionBoundary, task.id, task.required), true);
}
assert.equal(activatePerk(subscriptionBoundary, 'code-assistant'), true);
assert.equal(assistantCount(subscriptionBoundary), 1);
assert.equal(automationRate(subscriptionBoundary), 2);
assert.equal(currentAutomationRate(subscriptionBoundary), 0);
assert.equal(selectItem(subscriptionBoundary, 'T-12'), true);
assert.equal(currentAutomationRate(subscriptionBoundary), 2);
automate(subscriptionBoundary);
assert.equal(subscriptionBoundary.items.find(entry => entry.id === 'T-12').progress, 2);

const boosted = structuredClone(beforeMulti);
boosted.actions = 4000;
boosted.budget = 1000;
assert.equal(assistantOutput(boosted), 1);
assert.equal(activatePerk(boosted, 'multi-agent'), true);
assert.equal(addAssistant(boosted), true);
assert.equal(upgradeAssistants(boosted), true);
assert.equal(assistantOutput(boosted), 1.1);
assert.equal(activatePerk(boosted, 'ram-upgrade'), true);
assert.equal(activatePerk(boosted, 'ai-subscription'), true);
assert.equal(boosted.actions, 4000);
assert.equal(assistantOutput(boosted), 2.2);
assert.equal(automationRate(boosted), 8.4);
assert.equal(assignAgent(boosted, 'T-12'), true);
assert.equal(assignAgent(boosted, 'T-13'), true);
assert.equal(assignAgent(boosted, 'T-14'), true);
closeRate(currentAutomationRate(boosted), 8.4);
const boostedBug = makeBug(boosted);
assert.equal(assignAgent(boosted, 'T-15'), false);
closeRate(currentAutomationRate(boosted), 8.4);
for (let i = 0; i < 4; i++) automate(boosted);
assert.deepEqual(['T-12', 'T-13', 'T-14'].map(id => boosted.items.find(entry => entry.id === id).progress), [20, 8, 8]);
assert.deepEqual(boosted.agentCarry, [8, 8]);
assert.equal(boostedBug.progress, 0);
assert.equal(work(boosted, boostedBug.id, boostedBug.required), true);
automate(boosted);
assert.deepEqual(['T-12', 'T-13', 'T-14'].map(id => boosted.items.find(entry => entry.id === id).progress), [24, 11, 11]);
assert.deepEqual(boosted.agentCarry, [0, 0]);
closeRate(currentAutomationRate(boosted), 5.4);
boosted.automationTarget = null;
boosted.agentTargets = [null, null];
assert.equal(currentAutomationRate(boosted), 0);
boosted.agentCarry = [9, 3];
automate(boosted);
assert.deepEqual(boosted.agentCarry, [9, 3]);
assert.equal(assignAgent(boosted, 'T-15'), true);
automate(boosted);
assert.equal(boosted.items.find(entry => entry.id === 'T-15').progress, 3);
assert.deepEqual(boosted.agentCarry, [1, 3]);
boosted.automationTarget = 'T-15';
boosted.items.find(entry => entry.id === 'T-15').progress = boosted.items.find(entry => entry.id === 'T-15').required - 1;
assert.equal(currentAutomationRate(boosted), 1);

const sharedBoost = structuredClone(beforeMulti);
sharedBoost.actions = 4000;
assert.equal(activatePerk(sharedBoost, 'ai-subscription'), true);
assert.equal(automationRate(sharedBoost), 4);
assert.equal(currentAutomationRate(sharedBoost), 4);
automate(sharedBoost);
assert.equal(sharedBoost.items.find(entry => entry.id === 'T-12').progress, 8);
sharedBoost.items.find(entry => entry.id === 'T-12').progress = sharedBoost.items.find(entry => entry.id === 'T-12').required - 1;
assert.equal(currentAutomationRate(sharedBoost), 1);

const subscriptionDeploy = structuredClone(multi);
subscriptionDeploy.actions = 4000;
assert.equal(activatePerk(subscriptionDeploy, 'ai-subscription'), true);
for (const task of subscriptionDeploy.items.filter(entry => entry.type === 'task' && !entry.done)) assert.equal(work(subscriptionDeploy, task.id, task.required), true);
assert.equal(canDeploy(subscriptionDeploy), true);
assert.equal(currentAutomationRate(subscriptionDeploy), 0);
assert.equal(deploy(subscriptionDeploy), true);
assert.equal(assistantOutput(subscriptionDeploy), 2.2);
assert.equal(activatePerk(subscriptionDeploy, 'ai-subscription'), false);
assert.equal(newGame().activatedPerks.includes('ai-subscription'), false);
assert.equal(assistantOutput(newGame()), 1);

const assignBoundary = newGame();
assignBoundary.actions = 5999;
assert.equal(perkUnlocked(assignBoundary, perks[6]), false);
assert.equal(activatePerk(assignBoundary, 'auto-assigner'), false);
assert.equal(work(assignBoundary, 'T-01', 1), true);
assert.equal(perkUnlocked(assignBoundary, perks[6]), true);
assert.equal(activatePerk(assignBoundary, 'auto-assigner'), true);
assert.equal(activatePerk(assignBoundary, 'auto-assigner'), false);
assert.equal(assignBoundary.actions, 6000);
assert.deepEqual(openPerks(assignBoundary), perks.slice(0, 3));
assert.equal(currentAutomationRate(assignBoundary), 0);
automate(assignBoundary);
assert.deepEqual(assignBoundary.agentTargets, []);
assert.equal(assignBoundary.items.find(entry => entry.id === 'T-01').progress, 1);

const auto = structuredClone(beforeMulti);
auto.actions = 6000;
auto.budget = 1000;
assert.equal(activatePerk(auto, 'auto-assigner'), true);
assert.equal(activatePerk(auto, 'ai-subscription'), true);
assert.deepEqual(openPerks(auto), [perks[3], perks[4], perks[7]]);
assert.deepEqual(auto.agentTargets, [null]);
assert.equal(currentAutomationRate(auto), 4);
automate(auto);
assert.deepEqual(auto.agentTargets, [null]);
assert.equal(auto.items.find(entry => entry.id === 'T-12').progress, 8);
assert.equal(activatePerk(auto, 'multi-agent'), true);
assert.equal(addAssistant(auto), true);
assert.equal(upgradeAssistants(auto), true);
assert.equal(assignAgent(auto, 'T-12'), true);
assert.equal(assignAgent(auto, 'T-14'), true);
assert.deepEqual(auto.agentTargets, ['T-14', null]);
closeRate(currentAutomationRate(auto), 4.2);
const autoBug = makeBug(auto);
assert.equal(auto.selected, autoBug.id);
assert.equal(assignAgent(auto, 'T-13'), false);
closeRate(currentAutomationRate(auto), 4.2);
automate(auto);
assert.deepEqual(auto.agentTargets, ['T-14', 'T-12']);
assert.equal(auto.selected, autoBug.id);
assert.equal(auto.automationTarget, 'T-12');
assert.equal(autoBug.progress, 0);
assert.equal(auto.items.find(entry => entry.id === 'T-14').progress, 2);
assert.equal(auto.items.find(entry => entry.id === 'T-12').progress, 12);
assert.deepEqual(auto.agentCarry, [2, 2]);
closeRate(currentAutomationRate(auto), 6.4);
assert.equal(work(auto, autoBug.id, autoBug.required), true);

const eligible = structuredClone(beforeMulti);
eligible.actions = 6000;
eligible.budget = 6000;
assert.equal(activatePerk(eligible, 'auto-assigner'), true);
eligible.automationTarget = null;
assert.equal(activatePerk(eligible, 'multi-agent'), true);
while (addAssistant(eligible)) {}
eligible.items.find(entry => entry.id === 'T-12').progress = eligible.items.find(entry => entry.id === 'T-12').required;
eligible.items.find(entry => entry.id === 'T-13').done = true;
assert.equal(assignAgent(eligible, 'T-14'), true);
assert.equal(currentAutomationRate(eligible), 1);
const selectedBeforeAssign = eligible.selected;
automate(eligible);
assert.deepEqual(eligible.agentTargets, ['T-14', 'T-15', ...Array(assistantCount(eligible) - 2).fill(null)]);
assert.equal(eligible.selected, selectedBeforeAssign);
assert.equal(eligible.automationTarget, null);
assert.equal(currentAutomationRate(eligible), 2);
assert.equal(eligible.items.find(entry => entry.id === 'T-12').progress, eligible.items.find(entry => entry.id === 'T-12').required);
assert.equal(eligible.items.find(entry => entry.id === 'T-15').progress, 1);

const locked = structuredClone(beforeMulti);
locked.actions = 6000;
locked.budget = 500;
locked.automationTarget = null;
assert.equal(activatePerk(locked, 'multi-agent'), true);
assert.equal(addAssistant(locked), true);
assert.equal(activatePerk(locked, 'auto-assigner'), true);
locked.items.find(entry => entry.id === 'S-03').done = false;
assert.equal(isAvailable(locked, locked.items.find(entry => entry.id === 'T-12')), false);
assert.equal(currentAutomationRate(locked), 0);
automate(locked);
assert.deepEqual(locked.agentTargets, [null, null]);
assert.equal(locked.items.find(entry => entry.id === 'T-12').progress, 4);
locked.items.find(entry => entry.id === 'S-03').done = true;
automate(locked);
assert.deepEqual(locked.agentTargets, ['T-12', 'T-13']);

const nextTick = structuredClone(beforeMulti);
nextTick.actions = 6000;
nextTick.budget = 500;
nextTick.automationTarget = null;
assert.equal(activatePerk(nextTick, 'multi-agent'), true);
assert.equal(addAssistant(nextTick), true);
assert.equal(activatePerk(nextTick, 'auto-assigner'), true);
nextTick.items.find(entry => entry.id === 'T-12').progress = 24;
assert.equal(currentAutomationRate(nextTick), 0);
automate(nextTick);
assert.deepEqual(nextTick.agentTargets, [null, 'T-13']);
assert.equal(nextTick.items.find(entry => entry.id === 'T-14').progress, 0);
assert.equal(currentAutomationRate(nextTick), 1);
automate(nextTick);
assert.deepEqual(nextTick.agentTargets, ['T-14', 'T-13']);
assert.equal(nextTick.items.find(entry => entry.id === 'T-14').progress, 1);
assert.equal(currentAutomationRate(nextTick), 2);

const assignDeploy = structuredClone(subscriptionDeploy);
assignDeploy.actions = 6000;
assert.equal(activatePerk(assignDeploy, 'auto-assigner'), true);
assert.equal(currentAutomationRate(assignDeploy), 0);
automate(assignDeploy);
assert.ok(assignDeploy.agentTargets.some(target => target !== null));
for (const task of assignDeploy.items.filter(entry => entry.type === 'task' && !entry.done)) assert.equal(work(assignDeploy, task.id, task.required), true);
assert.equal(canDeploy(assignDeploy), true);
assert.equal(currentAutomationRate(assignDeploy), 0);
assert.equal(deploy(assignDeploy), true);
assert.equal(activatePerk(assignDeploy, 'auto-assigner'), false);
assert.equal(currentAutomationRate(assignDeploy), 0);
automate(assignDeploy);
assert.ok(assignDeploy.agentTargets.some(target => target !== null));
assert.equal(newGame().activatedPerks.includes('auto-assigner'), false);
const storageData = new Map();
const storage = {
  getItem: key => storageData.has(key) ? storageData.get(key) : null,
  setItem: (key, value) => storageData.set(key, value)
};
assert.equal(loadGame(storage), null);

const regressionBase = newGame();
for (const id of ['S-01', 'S-02']) {
  for (const task of regressionBase.items.filter(entry => entry.parent === id)) assert.equal(work(regressionBase, task.id, task.required), true);
}
const regressionTitle = 'Automation regression: ';
const regressionDetail = 'Fully automated code introduced this regression. ';
for (const actions of [14999, 15000, 15001]) {
  const boundary = structuredClone(regressionBase);
  boundary.actions = actions;
  assert.equal(automationRegressions(boundary), actions >= 15000);
  assert.equal(bugChance(boundary), actions >= 15000 ? 0.60 : 0.30);
  const created = makeBug(boundary);
  const [title, detail] = templates['S-02'][0];
  assert.deepEqual(created, {
    id: 'B-01', type: 'bug', title: (actions >= 15000 ? regressionTitle : '') + title,
    detail: (actions >= 15000 ? regressionDetail : '') + detail, required: 8, progress: 0, done: false, inTest: false
  });
  assert.equal(boundary.actions, actions);
  assert.equal(boundary.selected, created.id);
  assert.equal(work(boundary, 'T-10', 1), false);
  assert.equal(work(boundary, created.id, 1), true);
  assert.equal(boundary.actions, actions + 1);
  assert.equal(automationRegressions(boundary), true);
}

for (const firstActions of [14999, 15000]) {
  const mixed = structuredClone(regressionBase);
  mixed.actions = firstActions;
  const first = makeBug(mixed);
  mixed.actions = firstActions === 14999 ? 15000 : 14999;
  const second = makeBug(mixed);
  const third = makeBug(mixed);
  assert.deepEqual([first, second, third].map(bug => bug.title.replace(regressionTitle, '')), templates['S-02'].map(([title]) => title));
  assert.equal(new Set(openBugs(mixed).map(bug => bug.title.replace(regressionTitle, ''))).size, 3);
  const fallback = makeBug(mixed);
  assert.equal(fallback.title.replace(regressionTitle, ''), first.title.replace(regressionTitle, ''));
  assert.deepEqual([first.required, second.required, third.required, fallback.required], [8, 10, 12, 14]);
}

let prematureRandomCalls = 0;
const originalRandom = Math.random;
try {
  Math.random = () => { prematureRandomCalls++; return 0; };
  const lockedRegression = newGame();
  lockedRegression.actions = 15000;
  assert.equal(automationRegressions(lockedRegression), true);
  assert.equal(addBug(lockedRegression), null);
  assert.equal(prematureRandomCalls, 0);
} finally {
  Math.random = originalRandom;
}

const ordinaryRandom = structuredClone(regressionBase);
const regressionRandom = structuredClone(regressionBase);
ordinaryRandom.actions = 14999;
regressionRandom.actions = 15000;
for (const value of [0.8, 0.2, 0.5, 0.9]) {
  let calls = 0;
  const random = Math.random;
  try {
    Math.random = () => { calls++; return value; };
    const ordinary = addBug(ordinaryRandom);
    assert.equal(calls, 1);
    const regression = addBug(regressionRandom);
    assert.equal(calls, 2);
    assert.deepEqual(regression, { ...ordinary, title: regressionTitle + ordinary.title, detail: regressionDetail + ordinary.detail });
  } finally {
    Math.random = random;
  }
}

const oldSave = structuredClone(regressionBase);
oldSave.actions = 14999;
const oldBug = makeBug(oldSave);
assert.equal(work(oldSave, oldBug.id, 2), true);
oldSave.actions = 15000;
saveGame(storage, oldSave);
const loadedOldSave = loadGame(storage);
assert.deepEqual(loadedOldSave, oldSave);
assert.equal(loadedOldSave.items.find(item => item.id === oldBug.id).title, oldBug.title);
assert.equal(loadedOldSave.items.find(item => item.id === oldBug.id).detail, oldBug.detail);
assert.equal(activatePerk(loadedOldSave, 'bug-fix-agent'), true);
const newBug = makeBug(loadedOldSave);
assert.equal(newBug.title, regressionTitle + templates['S-02'][1][0]);
assert.equal(selectItem(loadedOldSave, 'T-10'), false);
assert.equal(work(loadedOldSave, 'T-10', 1), false);
assert.equal(work(loadedOldSave, newBug.id, 1, true), false);
saveGame(storage, loadedOldSave);
const mixedSave = loadGame(storage);
assert.deepEqual(mixedSave, loadedOldSave);
assert.equal(currentAutomationRate(mixedSave), 1);
for (let i = 0; i < oldBug.required - oldBug.progress; i++) automate(mixedSave);
assert.equal(mixedSave.items.find(item => item.id === oldBug.id).done, true);
assert.equal(mixedSave.items.find(item => item.id === newBug.id).progress, 0);
automate(mixedSave);
assert.equal(mixedSave.items.find(item => item.id === newBug.id).progress, 1);
saveGame(storage, mixedSave);
assert.deepEqual(loadGame(storage), mixedSave);

const sequence = [500, 625, 782, 977, 1221, 1526, 1908];
const sequenceGame = newGame();
sequenceGame.actions = 1000;
assert.equal(activatePerk(sequenceGame, 'code-assistant'), true);
assert.equal(activatePerk(sequenceGame, 'multi-agent'), true);
for (const [level, required] of sequence.entries()) {
  assert.equal(nextAssistantCount(sequenceGame), required);
  assert.equal(nextAssistantUpgrade(sequenceGame), required);
  sequenceGame.budget = required - 1;
  assert.equal(assistantLimit(sequenceGame), level + 1);
  assert.equal(addAssistant(sequenceGame), false);
  assert.equal(upgradeAssistants(sequenceGame), false);
  sequenceGame.budget = required * 2;
  assert.equal(assistantLimit(sequenceGame), level + 2);
  assert.equal(addAssistant(sequenceGame), true);
  assert.equal(upgradeAssistants(sequenceGame), true);
  assert.equal(sequenceGame.actions, 1000);
  assert.equal(sequenceGame.budget, 0);
  assert.equal(assistantCount(sequenceGame), assistantLimit(sequenceGame));
}
const unactivatedLimit = newGame();
assert.equal(nextAssistantCount(unactivatedLimit), 0);
assert.equal(assistantLimit(unactivatedLimit), 1);
unactivatedLimit.budget = 500 + 625 + 782 - 1;
assert.equal(assistantLimit(unactivatedLimit), 3);
unactivatedLimit.budget++;
assert.equal(assistantLimit(unactivatedLimit), 4);
assert.equal(nextAssistantCount(unactivatedLimit), 0);
unactivatedLimit.budget = Number.MAX_SAFE_INTEGER;
assert.ok(assistantLimit(unactivatedLimit) > 100);
unactivatedLimit.budget = Infinity;
assert.equal(assistantLimit(unactivatedLimit), 1);

for (const multiFirst of [false, true]) {
  let ordered = newGame();
  assert.equal(selectItem(ordered, 'T-01'), true);
  ordered.actions = 999;
  assert.equal(activatePerk(ordered, 'multi-agent'), false);
  if (multiFirst) {
    ordered.actions = 1000;
    assert.equal(activatePerk(ordered, 'multi-agent'), true);
    assert.equal(ordered.assistants, 0);
    const beforeCode = structuredClone(ordered);
    assert.equal(addAssistant(ordered), false);
    assert.deepEqual(ordered, beforeCode);
    assert.deepEqual(ordered.agentTargets, []);
    assert.deepEqual(ordered.agentCarry, []);
    assert.equal(assignAgent(ordered, 'T-02'), false);
    assert.equal(upgradeAssistants(ordered), false);
    automate(ordered);
    assert.deepEqual(ordered.agentTargets, []);
    saveGame(storage, ordered);
    assert.deepEqual(loadGame(storage), ordered);
    ordered = loadGame(storage);
  }
  assert.equal(activatePerk(ordered, 'code-assistant'), true);
  assert.deepEqual(ordered.agentTargets, [multiFirst ? 'T-01' : null]);
  assert.deepEqual(ordered.agentCarry, [0]);
  if (!multiFirst) {
    const beforeActivation = structuredClone(ordered);
    assert.equal(addAssistant(ordered), false);
    assert.deepEqual(ordered, beforeActivation);
    ordered.actions = 1000;
    assert.equal(activatePerk(ordered, 'multi-agent'), true);
  }
  assert.deepEqual(ordered.agentTargets, ['T-01']);
  const orderedActions = ordered.actions;
  ordered.budget = 500;
  assert.equal(addAssistant(ordered), true);
  assert.equal(ordered.actions, orderedActions);
  assert.equal(assistantCount(ordered), 2);
  assert.deepEqual(ordered.agentTargets, ['T-01', null]);
  assert.equal(ordered.selected, 'T-01');
  assert.equal(ordered.automationTarget, 'T-01');
  saveGame(storage, ordered);
  const reloaded = loadGame(storage);
  assert.deepEqual(reloaded, ordered);
  automate(reloaded);
  automate(ordered);
  assert.deepEqual(reloaded, ordered);
}
const skippedTarget = newGame();
skippedTarget.actions = 1000;
assert.equal(activatePerk(skippedTarget, 'multi-agent'), true);
assert.equal(activatePerk(skippedTarget, 'code-assistant'), true);
assert.deepEqual(skippedTarget.agentTargets, [null]);
const finishedTarget = newGame();
assert.equal(selectItem(finishedTarget, 'T-01'), true);
assert.equal(work(finishedTarget, 'T-01', 10), true);
finishedTarget.actions = 1000;
assert.equal(activatePerk(finishedTarget, 'multi-agent'), true);
assert.equal(activatePerk(finishedTarget, 'code-assistant'), true);
assert.deepEqual(finishedTarget.agentTargets, [null]);

const legacy = newGame();
legacy.activatedPerks = perks.filter(perk => perk.id !== 'earl').map(perk => perk.id);
legacy.assistants = 5;
legacy.assistantUpgrades = 4;
legacy.agentTargets = ['T-01', null, null, null, null];
legacy.agentCarry = [9, 8, 7, 6, 5];
assert.equal(assistantLimit(legacy), 5);
assert.equal(nextAssistantCount(legacy), 1221);
assert.equal(nextAssistantUpgrade(legacy), 1221);
assert.equal(addAssistant(legacy), false);
assert.equal(upgradeAssistants(legacy), false);
saveGame(storage, legacy);
assert.deepEqual(loadGame(storage), legacy);
const priorSave = newGame();
priorSave.actions = 500;
priorSave.activatedPerks = ['stack-overflow', 'build-pipeline', 'code-assistant', 'multi-agent'];
priorSave.assistants = 2;
priorSave.assistantUpgrades = 1;
priorSave.agentTargets = [null, null];
priorSave.agentCarry = [3, 4];
saveGame(storage, priorSave);
assert.deepEqual(loadGame(storage), priorSave);
assert.equal(assistantLimit(loadGame(storage)), 2);
const legacyBeforeMulti = structuredClone(beforeMulti);
legacyBeforeMulti.budget = 0;
legacyBeforeMulti.assistants = 2;
legacyBeforeMulti.agentTargets.push(null);
legacyBeforeMulti.agentCarry.push(0);
saveGame(storage, legacyBeforeMulti);
const loadedLegacyBeforeMulti = loadGame(storage);
assert.deepEqual(loadedLegacyBeforeMulti, legacyBeforeMulti);
assert.equal(assistantCount(loadedLegacyBeforeMulti), 2);
assert.equal(activatePerk(loadedLegacyBeforeMulti, 'multi-agent'), false);
loadedLegacyBeforeMulti.actions = 1000;
const legacySnapshot = structuredClone(loadedLegacyBeforeMulti);
assert.equal(addAssistant(loadedLegacyBeforeMulti), false);
assert.deepEqual(loadedLegacyBeforeMulti, legacySnapshot);
assert.equal(activatePerk(loadedLegacyBeforeMulti, 'multi-agent'), true);
loadedLegacyBeforeMulti.budget = 625;
assert.equal(addAssistant(loadedLegacyBeforeMulti), true);
assert.equal(loadedLegacyBeforeMulti.actions, 1000);
assert.equal(assistantCount(loadedLegacyBeforeMulti), 3);
for (const change of [
  value => { value.agentTargets = [null]; },
  value => { value.agentCarry = [0]; },
  value => { value.assistantUpgrades = 1; }
]) {
  const value = newGame();
  value.activatedPerks = ['multi-agent'];
  change(value);
  saveGame(storage, value);
  assert.throws(() => loadGame(storage));
}

const savedGame = structuredClone(fractional);
const savedBug = makeBug(savedGame);
assert.equal(work(savedGame, savedBug.id, 2), true);
const savedSnapshot = structuredClone(savedGame);
saveGame(storage, savedGame);
assert.deepEqual(savedGame, savedSnapshot);
assert.deepEqual(JSON.parse(storageData.get('sprint-game')), { version: 5, game: savedSnapshot });
const restored = loadGame(storage);
assert.deepEqual(restored, savedSnapshot);
assert.notEqual(restored, savedGame);
automate(restored);
automate(savedGame);
assert.deepEqual(restored, savedGame);
assert.equal(restored.selected, savedBug.id);
assert.equal(restored.items.find(entry => entry.id === savedBug.id).progress, 2);

const deployRestore = structuredClone(game);
saveGame(storage, deployRestore);
const loadedDeploy = loadGame(storage);
assert.equal(deploy(deployRestore), true);
assert.equal(deploy(loadedDeploy), true);
assert.deepEqual(loadedDeploy, deployRestore);
saveGame(storage, loadedDeploy);
assert.deepEqual(loadGame(storage), loadedDeploy);
saveGame(storage, newGame());
assert.deepEqual(loadGame(storage), newGame());

const storageError = new Error('storage unavailable');
assert.throws(() => loadGame({ getItem: () => { throw storageError; } }), error => error === storageError);
assert.throws(() => saveGame({ setItem: () => { throw storageError; } }, savedGame), error => error === storageError);
const beforeFailure = structuredClone(savedGame);
assert.throws(() => saveGame({ setItem: () => { throw storageError; } }, savedGame));
assert.deepEqual(savedGame, beforeFailure);
for (const raw of ['', '{', 'null', '[]', '{}', '{"version":2,"game":{}}', '{"version":1,"game":null}']) {
  storageData.set('sprint-game', raw);
  assert.throws(() => loadGame(storage));
  assert.equal(storageData.get('sprint-game'), raw);
}
const invalidSaves = [
  value => { delete value.seconds; },
  value => { value.actions = -1; },
  value => { value.seconds = 1.5; },
  value => { value.deployments = 1e100; },
  value => { value.items = {}; },
  value => { value.items.pop(); },
  value => { value.items[0].id = value.items[1].id; },
  value => { value.items[0].id = 'unknown'; },
  value => { value.items[0].type = 'story'; },
  value => { value.items[0].parent = 'S-99'; },
  value => { value.items[0].title = null; },
  value => { value.items[0].detail = 1; },
  value => { value.items[0].required = 0; },
  value => { value.items[0].progress = -1; },
  value => { value.items[0].progress = value.items[0].required + 1; },
  value => { value.items[0].done = 'yes'; },
  value => { value.items[0].done = true; },
  value => { value.items.find(item => item.type === 'story').progress++; },
  value => { value.selected = 'S-01'; },
  value => { value.selected = 'T-06'; },
  value => { value.automationTarget = 'missing'; },
  value => { value.archivedIds = ['missing']; },
  value => { value.archivedIds = ['T-01']; },
  value => { value.activatedPerks = ['unknown']; },
  value => { value.assistants = 1; },
  value => { value.agentCarry = [0]; },
  value => { value.assistantUpgrades = 1; },
  value => { value.bugCount = 1; }
];
for (const change of invalidSaves) {
  const value = newGame();
  change(value);
  const raw = JSON.stringify({ version: 1, game: value });
  storageData.set('sprint-game', raw);
  assert.throws(() => loadGame(storage), raw);
  assert.equal(storageData.get('sprint-game'), raw);
}
const unfinishedStory = newGame();
for (const task of unfinishedStory.items.filter(entry => entry.parent === 'S-01')) work(unfinishedStory, task.id, task.required);
unfinishedStory.items.find(entry => entry.id === 'S-01').done = false;
storageData.set('sprint-game', JSON.stringify({ version: 1, game: unfinishedStory }));
assert.throws(() => loadGame(storage));

for (const change of [
  value => { value.agentCarry[0] = 10; },
  value => { value.agentCarry[0] = 0.5; },
  value => { value.agentTargets[0] = 'missing'; },
  value => { value.agentTargets[1] = value.agentTargets[0]; },
  value => { value.archivedIds.push(value.archivedIds[0]); },
  value => { value.archivedIds = []; },
  value => { value.activatedPerks.push(value.activatedPerks[0]); },
  value => { value.items.find(item => item.type === 'bug').detail = null; }
]) {
  const value = structuredClone(savedSnapshot);
  change(value);
  storageData.set('sprint-game', JSON.stringify({ version: 1, game: value }));
  assert.throws(() => loadGame(storage));
}

const order = structuredClone(beforeMulti);
order.actions = 6000;
order.budget = 500;
assert.equal(activatePerk(order, 'multi-agent'), true);
assert.equal(addAssistant(order), true);
assert.equal(activatePerk(order, 'auto-assigner'), true);
assert.equal(selectItem(order, 'T-12'), true);
order.agentTargets = [null, null];
assert.equal(work(order, 'T-12', 19), true);
const orderBug = makeBug(order);
automate(order);
assert.equal(order.items.find(item => item.id === 'T-12').done, true);
assert.deepEqual(order.agentTargets, ['T-13', 'T-14']);
assert.equal(order.items.find(item => item.id === 'T-13').progress, 1);
assert.equal(order.items.find(item => item.id === 'T-14').progress, 1);
assert.equal(order.selected, orderBug.id);
assert.equal(orderBug.progress, 0);
const noAutoOrder = structuredClone(order);
noAutoOrder.activatedPerks = noAutoOrder.activatedPerks.filter(id => id !== 'auto-assigner');
noAutoOrder.agentTargets = [null, null];
automate(noAutoOrder);
assert.deepEqual(noAutoOrder.agentTargets, [null, null]);
assert.equal(noAutoOrder.selected, orderBug.id);
const bugAgentBoundary = newGame();
bugAgentBoundary.actions = 9999;
assert.equal(perkUnlocked(bugAgentBoundary, perks[7]), false);
assert.equal(activatePerk(bugAgentBoundary, 'bug-fix-agent'), false);
assert.equal(automationRate(bugAgentBoundary), 0);
assert.equal(work(bugAgentBoundary, 'T-01', 1), true);
assert.equal(perkUnlocked(bugAgentBoundary, perks[7]), true);
assert.equal(activatePerk(bugAgentBoundary, 'bug-fix-agent'), true);
assert.equal(activatePerk(bugAgentBoundary, 'bug-fix-agent'), false);
assert.equal(bugAgentBoundary.actions, 10000);
assert.equal(automationRate(bugAgentBoundary), 1);
assert.equal(currentAutomationRate(bugAgentBoundary), 0);
assert.deepEqual(openPerks(bugAgentBoundary), perks.slice(0, 3));
assert.equal(selectItem(bugAgentBoundary, 'T-02'), true);
automate(bugAgentBoundary);
assert.equal(bugAgentBoundary.items.find(entry => entry.id === 'T-02').progress, 0);
assert.equal(bugAgentBoundary.actions, 10000);

const bugAgent = structuredClone(beforeMulti);
bugAgent.actions = 10000;
bugAgent.budget = 1000;
assert.equal(activatePerk(bugAgent, 'multi-agent'), true);
assert.equal(addAssistant(bugAgent), true);
assert.equal(activatePerk(bugAgent, 'ram-upgrade'), true);
assert.equal(activatePerk(bugAgent, 'ai-subscription'), true);
assert.equal(upgradeAssistants(bugAgent), true);
assert.equal(assignAgent(bugAgent, 'T-13'), true);
const withoutBugAgent = structuredClone(bugAgent);
assert.equal(activatePerk(bugAgent, 'bug-fix-agent'), true);
closeRate(automationRate(bugAgent), automationRate(withoutBugAgent) + 1);
closeRate(currentAutomationRate(bugAgent), currentAutomationRate(withoutBugAgent));
const oldestBug = makeBug(bugAgent);
const newerBug = makeBug(bugAgent);
const reorderedBugs = structuredClone(bugAgent);
reorderedBugs.items.reverse();
saveGame(storage, reorderedBugs);
const reorderedSave = loadGame(storage);
automate(reorderedSave);
assert.equal(reorderedSave.items.find(entry => entry.id === oldestBug.id).progress, 1);
assert.equal(reorderedSave.items.find(entry => entry.id === newerBug.id).progress, 0);
makeBug(withoutBugAgent);
makeBug(withoutBugAgent);
assert.equal(selectItem(bugAgent, oldestBug.id), true);
assert.equal(work(bugAgent, oldestBug.id, 1, true), false);
assert.equal(work(bugAgent, 'T-14', 1), false);
closeRate(currentAutomationRate(bugAgent), currentAutomationRate(withoutBugAgent) + 1);
const beforeBugTick = bugAgent.actions;
automate(bugAgent);
automate(withoutBugAgent);
assert.equal(oldestBug.progress, 1);
assert.equal(newerBug.progress, 0);
assert.equal(bugAgent.selected, oldestBug.id);
assert.equal(bugAgent.actions, withoutBugAgent.actions + 1);
assert.ok(bugAgent.actions > beforeBugTick + 1);
for (const id of ['T-12', 'T-13', 'T-14']) {
  assert.equal(bugAgent.items.find(entry => entry.id === id).progress, withoutBugAgent.items.find(entry => entry.id === id).progress);
}
assert.deepEqual(bugAgent.agentCarry, withoutBugAgent.agentCarry);
assert.equal(work(bugAgent, newerBug.id, 2), true);
assert.equal(work(bugAgent, oldestBug.id, oldestBug.required - oldestBug.progress - 1), true);
const newerProgress = newerBug.progress;
automate(bugAgent);
assert.equal(oldestBug.done, true);
assert.equal(newerBug.progress, newerProgress);
assert.equal(bugAgent.selected, oldestBug.id);
assert.equal(selectItem(bugAgent, 'T-14'), false);
assert.equal(selectItem(bugAgent, newerBug.id), true);
automate(bugAgent);
assert.equal(newerBug.progress, newerProgress + 1);
assert.equal(work(bugAgent, newerBug.id, newerBug.required), true);
const noBugActions = bugAgent.actions;
bugAgent.automationTarget = null;
bugAgent.agentTargets = [null, null];
assert.equal(currentAutomationRate(bugAgent), 0);
automate(bugAgent);
assert.equal(bugAgent.actions, noBugActions);

const manuallyFinished = structuredClone(beforeMulti);
manuallyFinished.actions = 10000;
assert.equal(activatePerk(manuallyFinished, 'bug-fix-agent'), true);
const manualOld = makeBug(manuallyFinished);
const manualNew = makeBug(manuallyFinished);
assert.equal(work(manuallyFinished, manualOld.id, manualOld.required), true);
automate(manuallyFinished);
assert.equal(manualOld.progress, manualOld.required);
assert.equal(manualNew.progress, 1);

const bugStory = newGame();
for (const id of ['S-01', 'S-02']) {
  for (const task of bugStory.items.filter(entry => entry.parent === id)) assert.equal(work(bugStory, task.id, task.required), true);
}
bugStory.actions = 10000;
assert.equal(activatePerk(bugStory, 'bug-fix-agent'), true);
const storyOldBug = makeBug(bugStory);
const storyNewBug = makeBug(bugStory);
for (const task of bugStory.items.filter(entry => entry.parent === 'S-03')) assert.equal(work(bugStory, task.id, task.required, true), true);
const waitingStory = bugStory.items.find(entry => entry.id === 'S-03');
assert.equal(waitingStory.progress, waitingStory.required);
assert.equal(waitingStory.done, false);
assert.equal(work(bugStory, storyOldBug.id, storyOldBug.required - 1), true);
assert.equal(work(bugStory, storyNewBug.id, storyNewBug.required - 1), true);
const storyActions = bugStory.actions;
automate(bugStory);
assert.equal(storyOldBug.done, true);
assert.equal(storyNewBug.done, false);
assert.equal(waitingStory.done, false);
assert.equal(bugStory.actions, storyActions + 1);
assert.equal(work(bugStory, 'T-12', 1), false);
saveGame(storage, bugStory);
const restoredBugAgent = loadGame(storage);
assert.deepEqual(restoredBugAgent, bugStory);
assert.equal(currentAutomationRate(restoredBugAgent), 1);
automate(restoredBugAgent);
automate(bugStory);
assert.deepEqual(restoredBugAgent, bugStory);
assert.equal(storyNewBug.done, true);
assert.equal(waitingStory.done, true);
assert.equal(bugStory.actions, storyActions + 2);
assert.equal(currentAutomationRate(bugStory), 0);
saveGame(storage, bugStory);
assert.deepEqual(loadGame(storage), bugStory);

const earlPerk = perks.find(perk => perk.id === 'earl');
assert.deepEqual(earlPerk, {
  id: 'earl', name: 'Install Earl', description: 'An automated testing suite for your project.',
  icon: 'E', kind: 'upgradeable', actionsRequired: 17000
});
const earlBoundary = newGame();
assert.equal(earlBoundary.testCoverage, 0);
assert.ok(earlBoundary.items.every(entry => entry.inTest === false));
assert.equal(improveCoverage(earlBoundary), false);
earlBoundary.actions = 16999;
assert.deepEqual(openPerks(earlBoundary), perks.slice(0, 3));
earlBoundary.activatedPerks = perks.filter(perk => perk.id !== 'earl').map(perk => perk.id);
assert.deepEqual(openPerks(earlBoundary), []);
earlBoundary.activatedPerks = [];
earlBoundary.actions = 17000;
assert.deepEqual(openPerks(earlBoundary), [perks[0], perks[1], earlPerk]);
earlBoundary.actions = 19999;
assert.deepEqual(openPerks(earlBoundary), [perks[0], perks[1], earlPerk]);
earlBoundary.actions = 20000;
assert.deepEqual(openPerks(earlBoundary), [perks[0], earlPerk, perks[9]]);
earlBoundary.actions = 24999;
assert.equal(perkUnlocked(earlBoundary, perks[10]), false);
earlBoundary.actions = 25000;
assert.equal(perkUnlocked(earlBoundary, perks[10]), true);
assert.deepEqual(openPerks(earlBoundary), [earlPerk, perks[9], perks[10]]);
earlBoundary.activatedPerks = perks.slice(0, 6).map(perk => perk.id);
assert.deepEqual(openPerks(earlBoundary), [earlPerk, perks[9], perks[10]]);
assert.equal(activatePerk(earlBoundary, 'earl'), true);
assert.equal(activatePerk(earlBoundary, 'earl'), false);
assert.deepEqual(openPerks(earlBoundary), [perks[6], perks[9], perks[10]]);
assert.equal(coveragePercent(earlBoundary), 0);
assert.equal(coverageCost, 1);
assert.equal(improveCoverage(earlBoundary), false);
earlBoundary.budget = 2;
assert.equal(improveCoverage(earlBoundary), true);
assert.equal(earlBoundary.budget, 1);
assert.equal(earlBoundary.testCoverage, 1);
assert.equal(coveragePercent(earlBoundary), 0.001);
assert.equal(earlBoundary.actions, 25000);
assert.equal(coverageStep(earlBoundary), 1);
assert.equal(activatePerk(earlBoundary, 'testing-skills'), true);
assert.equal(coverageStep(earlBoundary), 5);
earlBoundary.budget = 3;
assert.equal(improveCoverage(earlBoundary), true);
assert.equal(earlBoundary.testCoverage, 6);
assert.equal(earlBoundary.budget, 2);
assert.equal(coveragePercent(earlBoundary), 0.006);
earlBoundary.testCoverage = 99998;
earlBoundary.budget = 1;
assert.equal(improveCoverage(earlBoundary), true);
assert.equal(coveragePercent(earlBoundary), 100);
assert.equal(improveCoverage(earlBoundary), false);
assert.equal(earlBoundary.testCoverage, 100000);
assert.equal(earlBoundary.budget, 0);
assert.equal(earlBoundary.actions, 25000);
const savedManualCoverage = structuredClone(earlBoundary);
savedManualCoverage.activatedPerks = ['earl', 'testing-skills'];
saveGame(storage, savedManualCoverage);
assert.deepEqual(loadGame(storage), savedManualCoverage);
const resetCoverage = newGame();
saveGame(storage, resetCoverage);
assert.deepEqual(loadGame(storage), resetCoverage);
assert.equal(resetCoverage.testCoverage, 0);
assert.deepEqual(resetCoverage.activatedPerks, []);
for (const [actions, baseline] of [[0, 0.04], [4000, 0.08], [7500, 0.12], [8500, 0.16], [11000, 0.30], [15000, 0.60]]) {
  const chance = newGame();
  chance.actions = actions;
  chance.testCoverage = 50000;
  assert.equal(bugChance(chance), baseline);
  chance.activatedPerks.push('earl');
  chance.testCoverage = 0;
  assert.equal(bugChance(chance), baseline);
  chance.testCoverage = 25000;
  closeRate(bugChance(chance), baseline * 0.75);
  chance.testCoverage = 50000;
  closeRate(bugChance(chance), baseline * 0.5);
  chance.testCoverage = 100000;
  assert.equal(bugChance(chance), 0);
}

const automaticCoverage = newGame();
automaticCoverage.actions = 24999;
assert.equal(activatePerk(automaticCoverage, 'auto-testing'), false);
assert.equal(work(automaticCoverage, 'T-01', 1), true);
assert.equal(automaticCoverage.actions, 25000);
assert.equal(activatePerk(automaticCoverage, 'auto-testing'), true);
assert.equal(automaticCoverage.testCoverage, 0);
automaticCoverage.budget = 0;
const noEarlCoverageState = [automaticCoverage.testCoverage, automaticCoverage.budget, automaticCoverage.actions];
automate(automaticCoverage);
assert.deepEqual([automaticCoverage.testCoverage, automaticCoverage.budget, automaticCoverage.actions], noEarlCoverageState);
assert.equal(activatePerk(automaticCoverage, 'earl'), true);
automaticCoverage.testCoverage = 100;
const coverageActions = automaticCoverage.actions;
const coverageBudget = automaticCoverage.budget;
closeRate(bugChance(automaticCoverage), 0.6 * (1 - 100 / 100000));
automate(automaticCoverage);
assert.equal(automaticCoverage.testCoverage, 101);
assert.equal(automaticCoverage.actions, coverageActions);
assert.equal(automaticCoverage.budget, coverageBudget);
closeRate(bugChance(automaticCoverage), 0.6 * (1 - 101 / 100000));
saveGame(storage, automaticCoverage);
const restoredAutomaticCoverage = loadGame(storage);
assert.deepEqual(restoredAutomaticCoverage, automaticCoverage);
automate(automaticCoverage);
automate(restoredAutomaticCoverage);
assert.deepEqual(restoredAutomaticCoverage, automaticCoverage);
automaticCoverage.testCoverage = 99999;
const cappedAutoActions = automaticCoverage.actions;
const cappedAutoBudget = automaticCoverage.budget;
automate(automaticCoverage);
assert.equal(automaticCoverage.testCoverage, 100000);
automate(automaticCoverage);
assert.equal(automaticCoverage.testCoverage, 100000);
assert.equal(automaticCoverage.actions, cappedAutoActions);
assert.equal(automaticCoverage.budget, cappedAutoBudget);
saveGame(storage, automaticCoverage);
assert.deepEqual(loadGame(storage), automaticCoverage);

const testing = newGame();
assert.equal(work(testing, 'T-01', 10), true);
testing.actions = 50000;
assert.equal(activatePerk(testing, 'earl'), true);
assert.equal(testing.items.find(entry => entry.id === 'T-01').done, true);
assert.equal(selectItem(testing, 'T-02'), true);
const testingTask = testing.items.find(entry => entry.id === 'T-02');
assert.equal(work(testing, testingTask.id, testingTask.required), true);
assert.equal(testing.selected, testingTask.id);
assert.equal(testingTask.progress, testingTask.required);
assert.equal(testingTask.inTest, true);
assert.equal(testingTask.done, false);
assert.equal(work(testing, testingTask.id, 1), false);
const testActions = testing.actions;
saveGame(storage, testing);
assert.deepEqual(loadGame(storage), testing);
withRandom(0.5, () => automate(testing));
assert.equal(testingTask.inTest, false);
assert.equal(testingTask.done, false);
assert.equal(testingTask.progress, Math.floor(testingTask.required / 2), 'a failed test halves the progress');
assert.equal(testing.selected, testingTask.id);
assert.equal(testing.actions, testActions);
const reworkActions = testingTask.required - testingTask.progress;
assert.equal(work(testing, testingTask.id, reworkActions), true);
assert.equal(testingTask.inTest, true);
withRandom(0.499999, () => automate(testing));
assert.equal(testingTask.inTest, false);
assert.equal(testingTask.done, true);
assert.equal(testing.actions, testActions + reworkActions);

const delayed = newGame();
delayed.actions = 50000;
for (const id of ['earl', 'code-assistant', 'multi-agent', 'auto-assigner', 'ai-subscription']) assert.equal(activatePerk(delayed, id), true);
assert.equal(selectItem(delayed, 'T-01'), true);
assert.equal(assignAgent(delayed, 'T-01'), true);
assert.equal(work(delayed, 'T-01', 8), true);
let randomCalls = 0;
const randomBeforeDelay = Math.random;
try {
  Math.random = () => { randomCalls++; return 0; };
  automate(delayed);
  assert.equal(randomCalls, 0);
  assert.equal(delayed.items.find(entry => entry.id === 'T-01').inTest, true);
  assert.equal(delayed.items.find(entry => entry.id === 'T-01').done, false);
  assert.deepEqual(delayed.agentTargets, [null]);
  assert.equal(delayed.selected, 'T-01');
  automate(delayed);
  assert.equal(randomCalls, 1);
  assert.equal(delayed.items.find(entry => entry.id === 'T-01').done, true);
  assert.equal(delayed.items.find(entry => entry.id === 'T-02').progress, 2);
  assert.deepEqual(delayed.agentTargets, ['T-02']);
} finally {
  Math.random = randomBeforeDelay;
}

const concurrent = newGame();
concurrent.actions = 50000;
assert.equal(activatePerk(concurrent, 'earl'), true);
for (const task of concurrent.items.filter(entry => entry.parent === 'S-01')) assert.equal(work(concurrent, task.id, task.required), true);
assert.equal(concurrent.items.find(entry => entry.id === 'S-01').done, false);
let outcomes = [0.1, 0.5, 0.2, 0.7, 0.3];
let outcomeCalls = 0;
const concurrentRandom = Math.random;
try {
  Math.random = () => { outcomeCalls++; return outcomes.shift(); };
  automate(concurrent);
} finally {
  Math.random = concurrentRandom;
}
assert.equal(outcomeCalls, 5);
assert.deepEqual(concurrent.items.filter(entry => entry.parent === 'S-01').map(entry => entry.done), [true, false, true, false, true]);
assert.equal(concurrent.items.find(entry => entry.id === 'S-01').done, false);
for (const task of concurrent.items.filter(entry => entry.parent === 'S-01' && !entry.done)) {
  assert.equal(task.progress, Math.floor(task.required / 2));
  assert.equal(work(concurrent, task.id, task.required - task.progress), true);
}
withRandom(0, () => automate(concurrent));
assert.equal(concurrent.items.find(entry => entry.id === 'S-01').done, true);

const earlBugs = structuredClone(regressionBase);
earlBugs.actions = 50000;
for (const id of ['earl', 'bug-fix-agent', 'code-assistant', 'multi-agent', 'auto-assigner']) assert.equal(activatePerk(earlBugs, id), true);
assert.equal(selectItem(earlBugs, 'T-10'), true);
assert.equal(assignAgent(earlBugs, 'T-10'), true);
const earlOldBug = makeBug(earlBugs);
const earlNewBug = makeBug(earlBugs);
assert.equal(selectItem(earlBugs, earlOldBug.id), true);
assert.equal(work(earlBugs, earlOldBug.id, earlOldBug.required), true);
assert.equal(earlBugs.selected, earlOldBug.id);
assert.equal(earlOldBug.inTest, true);
assert.equal(openBugs(earlBugs).length, 2);
assert.equal(work(earlBugs, 'T-10', 1), false);
assert.equal(canDeploy(earlBugs), false);
const taskBeforeBugTick = earlBugs.items.find(entry => entry.id === 'T-10').progress;
saveGame(storage, earlBugs);
assert.deepEqual(loadGame(storage), earlBugs);
withRandom(0.5, () => automate(earlBugs));
assert.equal(earlOldBug.progress, Math.floor(earlOldBug.required / 2), 'a failed bug test halves the bug progress');
assert.equal(earlOldBug.inTest, false);
assert.equal(earlNewBug.progress, 1);
assert.ok(earlBugs.items.find(entry => entry.id === 'T-10').progress > taskBeforeBugTick);
// The bug-fix agent reworks the oldest bug at 1 action / sec until it re-enters the test.
const reworkTicks = earlOldBug.required - earlOldBug.progress;
for (let tick = 0; tick < reworkTicks; tick++) withRandom(0, () => automate(earlBugs));
assert.equal(earlOldBug.inTest, true);
assert.equal(earlOldBug.done, false);
assert.equal(earlNewBug.progress, 1);
withRandom(0, () => automate(earlBugs));
assert.equal(earlOldBug.done, true);
assert.equal(earlNewBug.progress, 2);
assert.equal(work(earlBugs, earlNewBug.id, earlNewBug.required), true);
assert.equal(earlNewBug.inTest, true);
assert.equal(openBugs(earlBugs).length, 1);
withRandom(0, () => automate(earlBugs));
assert.equal(openBugs(earlBugs).length, 0);
assert.equal(earlNewBug.done, true);

const oldInitialStories = [
  ['Define the application concept', 'Describe the data, workflows and screens needed for the application.'],
  ['Set up the application project', 'Prepare the frontend, backend, database and basic authentication for development.'],
  ['Enable user login', 'Allow users to sign in through the application.'],
  ['Implement document workflows', 'Enable documents to move through the defined workflow states.'],
  ['Build the document browser', 'Let users navigate files and inspect document contents.']
];
const oldInitialTasks = [
  ['Define the data model', 'Identify the entities and fields the application needs to store.'],
  ['Map entity relationships', 'Document how users, documents and workflow records relate to each other.'],
  ['Design the workflows', 'Describe the states and transitions documents move through.'],
  ['Outline the application views', 'Identify the screens needed to browse documents and track their status.'],
  ['Specify the application forms', 'Define the fields and validation needed to enter and update data.'],
  ['Set up the frontend', 'Create the client application and configure its development environment.'],
  ['Set up the backend', 'Create the server application and configure its API entry point.'],
  ['Configure the database', 'Connect the backend to a database and prepare the initial schema.'],
  ['Configure basic authentication', 'Set up the backend authentication mechanism for protected requests.'],
  ['Implement the login service', 'Validate credentials and establish an authenticated session.'],
  ['Build the login screen', 'Provide credential inputs and show errors when sign-in fails.'],
  ['Set up the workflow engine', 'Configure the engine to manage document states and transitions.'],
  ['Implement basic document workflows', 'Add the initial workflow states and transitions for documents.'],
  ['Build the document preview', 'Display the contents of a selected document in the browser.'],
  ['Build the file explorer', 'List files and folders so users can navigate and select documents.']
];
const oldImprovementStories = [
  ['Add document search', 'Help users find documents by their contents and metadata.'],
  ['Enforce access control', 'Restrict document access according to user permissions.'],
  ['Track document version history', 'Keep earlier document versions available for review.'],
  ['Add an audit trail', 'Record important document activity for later inspection.'],
  ['Handle notifications', 'Notify users about relevant document activity.']
];
const oldImprovementTasks = [
  ['Index documents for search', 'Index document text and metadata for efficient queries.'],
  ['Build the search interface', 'Let users enter search terms and review matching documents.'],
  ['Define document permissions', 'Assign roles and permissions to document operations.'],
  ['Enforce permission checks', 'Check permissions before serving or modifying documents.'],
  ['Store document revisions', 'Save a revision whenever a document changes.'],
  ['Display version history', 'List earlier revisions and let users inspect them.'],
  ['Record audit events', 'Capture the actor, action and time for document changes.'],
  ['Display audit events', 'Show document activity in a searchable audit view.'],
  ['Generate activity notifications', 'Create notifications for relevant document events.'],
  ['Build the notification inbox', 'List notifications and allow users to mark them as read.']
];
const useOldBacklog = value => {
  for (const entry of value.items) {
    if (entry.type === 'bug') continue;
    const number = Number(entry.id.slice(2));
    const initialCount = entry.type === 'story' ? 5 : 15;
    const initial = entry.type === 'story' ? oldInitialStories : oldInitialTasks;
    const later = entry.type === 'story' ? oldImprovementStories : oldImprovementTasks;
    const [title, detail] = number <= initialCount ? initial[number - 1] : later[(number - initialCount - 1) % later.length];
    const iteration = Math.floor((number - initialCount - 1) / later.length) + 1;
    entry.title = title + (entry.type === 'story' && iteration > 1 ? ` (iteration ${iteration})` : '');
    entry.detail = detail;
  }
};
const oldFixture = structuredClone(savedSnapshot);
useOldBacklog(oldFixture);
delete oldFixture.testCoverage;
delete oldFixture.budget;
delete oldFixture.lastDeploymentActions;
for (const entry of oldFixture.items) delete entry.inTest;
const expectedOldFixture = { ...savedSnapshot, budget: 0, lastDeploymentActions: savedSnapshot.actions };
const originalFixture = structuredClone(oldFixture);
const oldRaw = JSON.stringify({ version: 1, game: oldFixture });
storageData.set('sprint-game', oldRaw);
const migrated = loadGame(storage);
assert.deepEqual(oldFixture, originalFixture);
assert.equal(storageData.get('sprint-game'), oldRaw);
assert.deepEqual(migrated, expectedOldFixture);
assert.equal(migrated.items.find(entry => entry.id === 'S-06').title, 'Find the evidence that matters');
assert.equal(migrated.items.find(entry => entry.id === 'S-11').title, 'Find the evidence that matters (iteration 2)');
assert.equal(migrated.items.find(entry => entry.id === savedBug.id).title, savedBug.title);
assert.equal(migrated.items.find(entry => entry.id === savedBug.id).detail, savedBug.detail);
assert.equal(migrated.testCoverage, 0);
assert.ok(migrated.items.every(entry => entry.inTest === false));
saveGame(storage, migrated);
assert.deepEqual(loadGame(storage), expectedOldFixture);
assert.equal(JSON.parse(storageData.get('sprint-game')).version, 5);

const gated = structuredClone(regressionBase);
gated.actions = 50000;
assert.equal(activatePerk(gated, 'earl'), true);
const gatedBug = makeBug(gated);
for (const task of gated.items.filter(entry => entry.parent === 'S-03')) assert.equal(work(gated, task.id, task.required, true), true);
withRandom(0, () => automate(gated));
assert.ok(gated.items.filter(entry => entry.parent === 'S-03').every(entry => entry.done));
assert.equal(gated.items.find(entry => entry.id === 'S-03').done, false);
assert.equal(work(gated, gatedBug.id, gatedBug.required), true);
assert.equal(gatedBug.inTest, true);
assert.equal(gated.items.find(entry => entry.id === 'S-03').done, false);
withRandom(0, () => automate(gated));
assert.equal(gated.items.find(entry => entry.id === 'S-03').done, true);

const impossibleCoverage = newGame();
impossibleCoverage.testCoverage = 1;
const impossibleRaw = JSON.stringify({ version: 1, game: impossibleCoverage });
storageData.set('sprint-game', impossibleRaw);
assert.throws(() => loadGame(storage));
assert.equal(storageData.get('sprint-game'), impossibleRaw);

const beforeEarlTest = structuredClone(earlBugs);
beforeEarlTest.testCoverage = 12345;
saveGame(storage, beforeEarlTest);
assert.deepEqual(loadGame(storage), beforeEarlTest);

const midTest = structuredClone(earlBugs);
assert.equal(work(midTest, 'T-11', 20), true);
assert.equal(midTest.items.find(entry => entry.id === 'T-11').inTest, true);
midTest.testCoverage = 12345;
saveGame(storage, midTest);
assert.deepEqual(loadGame(storage), midTest);
const testingFixture = structuredClone(midTest);
const testingFixtureBug = makeBug(testingFixture);
assert.equal(work(testingFixture, testingFixtureBug.id, testingFixtureBug.required), true);
testingFixtureBug.title = 'An existing bug title';
testingFixtureBug.detail = 'An existing bug detail';
const expectedTestingFixture = structuredClone(testingFixture);
useOldBacklog(testingFixture);
const testingRaw = JSON.stringify({ version: 1, game: testingFixture });
storageData.set('sprint-game', testingRaw);
assert.deepEqual(loadGame(storage), expectedTestingFixture);
assert.equal(storageData.get('sprint-game'), testingRaw);
assert.equal(testingFixtureBug.inTest, true);
assert.equal(expectedTestingFixture.items.find(entry => entry.id === 'T-11').inTest, true);
for (const change of [
  value => { value.testCoverage = -1; },
  value => { value.testCoverage = 100001; },
  value => { value.testCoverage = 0.5; },
  value => { value.testCoverage = null; },
  value => { value.items[0].inTest = null; },
  value => { value.items[0].inTest = true; },
  value => { value.items.find(entry => entry.type === 'story').inTest = true; },
  value => { const task = value.items.find(entry => entry.id === 'T-11'); task.progress--; },
  value => { value.items.find(entry => entry.id === 'T-11').done = true; },
  value => { value.activatedPerks = value.activatedPerks.filter(id => id !== 'earl'); },
  value => { value.agentTargets[0] = 'T-11'; }
]) {
  const invalid = structuredClone(midTest);
  change(invalid);
  const raw = JSON.stringify({ version: 1, game: invalid });
  storageData.set('sprint-game', raw);
  assert.throws(() => loadGame(storage));
  assert.equal(storageData.get('sprint-game'), raw);
}

assert.equal(formatVersion(versionForDeployments(0)), '0.0.0');
assert.deepEqual(newGame().appVersion, { major: 0, minor: 0, patch: 0 });
assert.equal(formatVersion(nextVersion(versionForDeployments(0))), '1.0.0');
for (const [deployments, version] of [[1, '1.0.0'], [9, '1.8.0'], [10, '1.9.0'], [11, '2.0.0'], [20, '2.9.0'], [21, '3.0.0']]) {
  assert.equal(formatVersion(versionForDeployments(deployments)), version);
}
assert.deepEqual(nextVersion({ major: 1, minor: 9, patch: 0 }), { major: 2, minor: 0, patch: 0 });

const economy = newGame();
assert.equal(economy.budget, 0);
assert.equal(economy.lastDeploymentActions, 0);
assert.deepEqual(economy.appVersion, { major: 0, minor: 0, patch: 0 });
for (const task of economy.items.filter(entry => entry.type === 'task')) assert.equal(work(economy, task.id, task.required), true);
economy.actions = 2000;
const firstDeploymentActions = economy.actions;
const firstLimit = assistantLimit(economy);
assert.equal(deploymentBudgetReward(economy), 2000);
assert.equal(deploy(economy), true);
assert.deepEqual(economy.appVersion, { major: 1, minor: 0, patch: 0 });
assert.equal(economy.budget, firstDeploymentActions);
assert.equal(economy.lastDeploymentActions, firstDeploymentActions);
assert.equal(economy.actions, firstDeploymentActions);
assert.equal(firstLimit, 1);
const afterFirstDeployment = structuredClone(economy);
assert.equal(deploy(economy), false);
assert.deepEqual(economy, afterFirstDeployment);
assert.equal(activatePerk(economy, 'code-assistant'), true);
assert.equal(activatePerk(economy, 'multi-agent'), true);
assert.equal(assistantLimit(economy), 4);
assert.equal(addAssistant(economy), true);
assert.equal(upgradeAssistants(economy), true);
assert.equal(economy.actions, firstDeploymentActions);
assert.equal(economy.budget, 1000);
for (const task of economy.items.filter(entry => entry.type === 'task' && !entry.done)) assert.equal(work(economy, task.id, task.required), true);
const remainingBudget = economy.budget;
const secondDeploymentActions = economy.actions;
assert.equal(economy.appVersion.major, 1);
assert.equal(economy.appVersion.minor, 0);
assert.equal(deploymentBudgetReward(economy), Math.round((secondDeploymentActions - firstDeploymentActions) * 1.1));
assert.equal(deploy(economy), true);
assert.deepEqual(economy.appVersion, { major: 1, minor: 1, patch: 0 });
assert.equal(economy.budget, remainingBudget + Math.round((secondDeploymentActions - firstDeploymentActions) * 1.1));
assert.equal(economy.lastDeploymentActions, secondDeploymentActions);
const afterSecondDeployment = structuredClone(economy);
assert.equal(deploy(economy), false);
assert.deepEqual(economy, afterSecondDeployment);
const tenthRelease = structuredClone(economy);
tenthRelease.deployments = 10;
tenthRelease.appVersion = versionForDeployments(10);
tenthRelease.actions = tenthRelease.lastDeploymentActions + 100;
assert.equal(deploymentBudgetReward(tenthRelease), 200);
assert.deepEqual(nextVersion(tenthRelease.appVersion), { major: 2, minor: 0, patch: 0 });
const twentiethRelease = structuredClone(tenthRelease);
twentiethRelease.deployments = 20;
twentiethRelease.appVersion = versionForDeployments(20);
assert.deepEqual(nextVersion(twentiethRelease.appVersion), { major: 3, minor: 0, patch: 0 });

const zeroDelta = structuredClone(afterFirstDeployment);
for (const task of zeroDelta.items.filter(entry => entry.type === 'task' && !entry.done)) assert.equal(work(zeroDelta, task.id, task.required), true);
zeroDelta.lastDeploymentActions = zeroDelta.actions;
zeroDelta.budget = Number.MAX_SAFE_INTEGER;
assert.equal(deploy(zeroDelta), true);
assert.equal(zeroDelta.budget, Number.MAX_SAFE_INTEGER);
const overflowDeployment = structuredClone(afterFirstDeployment);
for (const task of overflowDeployment.items.filter(entry => entry.type === 'task' && !entry.done)) assert.equal(work(overflowDeployment, task.id, task.required), true);
overflowDeployment.budget = Number.MAX_SAFE_INTEGER;
const overflowSnapshot = structuredClone(overflowDeployment);
assert.equal(deploy(overflowDeployment), false);
assert.deepEqual(overflowDeployment, overflowSnapshot);
for (const change of [
  value => { value.actions = Number.MAX_SAFE_INTEGER + 1; },
  value => { value.lastDeploymentActions = value.actions + 1; },
  value => { value.budget = Infinity; }
]) {
  const invalid = structuredClone(overflowSnapshot);
  change(invalid);
  const snapshot = structuredClone(invalid);
  assert.equal(deploy(invalid), false);
  assert.deepEqual(invalid, snapshot);
}

const budgetPerks = newGame();
budgetPerks.actions = 28000;
budgetPerks.budget = 3;
for (const perk of perks) assert.equal(activatePerk(budgetPerks, perk.id), true);
assert.equal(budgetPerks.actions, 28000);
assert.equal(budgetPerks.budget, 3);
assert.equal(improveCoverage(budgetPerks), true);
assert.equal(budgetPerks.budget, 2);
assert.equal(budgetPerks.testCoverage, 5);
assert.equal(coveragePercent(budgetPerks), 0.005);
budgetPerks.testCoverage = 100000;
const cappedCoverage = structuredClone(budgetPerks);
assert.equal(improveCoverage(budgetPerks), false);
assert.deepEqual(budgetPerks, cappedCoverage);
const withoutEarl = structuredClone(budgetPerks);
withoutEarl.testCoverage = 0;
withoutEarl.activatedPerks = withoutEarl.activatedPerks.filter(id => id !== 'earl');
const withoutEarlSnapshot = structuredClone(withoutEarl);
assert.equal(improveCoverage(withoutEarl), false);
assert.deepEqual(withoutEarl, withoutEarlSnapshot);

for (const budget of [-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  const invalid = structuredClone(budgetPerks);
  invalid.testCoverage = 0;
  invalid.budget = budget;
  const snapshot = structuredClone(invalid);
  assert.equal(addAssistant(invalid), false);
  assert.equal(upgradeAssistants(invalid), false);
  assert.equal(improveCoverage(invalid), false);
  assert.deepEqual(invalid, snapshot);
}
const unsafePrice = structuredClone(budgetPerks);
unsafePrice.budget = Number.MAX_SAFE_INTEGER;
unsafePrice.assistantUpgrades = 10000;
assert.equal(upgradeAssistants(unsafePrice), false);
unsafePrice.assistants = 10000;
assert.equal(addAssistant(unsafePrice), false);
assert.equal(assistantLimit(unsafePrice), 10000);

const legacyUndeployed = structuredClone(game);
delete legacyUndeployed.budget;
delete legacyUndeployed.lastDeploymentActions;
storageData.set('sprint-game', JSON.stringify({ version: 1, game: legacyUndeployed }));
const migratedUndeployed = loadGame(storage);
assert.equal(migratedUndeployed.budget, 0);
assert.equal(migratedUndeployed.lastDeploymentActions, 0);
assert.equal(deploy(migratedUndeployed), true);
assert.equal(migratedUndeployed.budget, legacyUndeployed.actions);
assert.equal(migratedUndeployed.lastDeploymentActions, legacyUndeployed.actions);

const v4Save = structuredClone(afterFirstDeployment);
storageData.set('sprint-game', JSON.stringify({ version: 4, game: v4Save }));
assert.deepEqual(loadGame(storage), v4Save);
const v2Save = structuredClone(afterFirstDeployment);
delete v2Save.appVersion;
storageData.set('sprint-game', JSON.stringify({ version: 2, game: v2Save }));
assert.deepEqual(loadGame(storage).appVersion, { major: 1, minor: 0, patch: 0 });

const legacyDeployed = structuredClone(afterFirstDeployment);
delete legacyDeployed.budget;
delete legacyDeployed.lastDeploymentActions;
storageData.set('sprint-game', JSON.stringify({ version: 1, game: legacyDeployed }));
const migratedDeployed = loadGame(storage);
assert.equal(migratedDeployed.budget, 0);
assert.equal(migratedDeployed.lastDeploymentActions, legacyDeployed.actions);
for (const task of migratedDeployed.items.filter(entry => entry.type === 'task' && !entry.done)) assert.equal(work(migratedDeployed, task.id, task.required), true);
assert.equal(deploy(migratedDeployed), true);
assert.equal(migratedDeployed.budget, Math.round((migratedDeployed.actions - legacyDeployed.actions) * 1.1));
saveGame(storage, migratedDeployed);
assert.equal(JSON.parse(storageData.get('sprint-game')).version, 5);
assert.deepEqual(loadGame(storage), migratedDeployed);

const legacyAgents = structuredClone(priorSave);
delete legacyAgents.budget;
delete legacyAgents.lastDeploymentActions;
storageData.set('sprint-game', JSON.stringify({ version: 1, game: legacyAgents }));
const grandfathered = loadGame(storage);
assert.equal(grandfathered.assistants, 2);
assert.equal(grandfathered.assistantUpgrades, 1);
assert.deepEqual(grandfathered.agentCarry, [3, 4]);
assert.equal(grandfathered.budget, 0);
assert.equal(assistantLimit(grandfathered), 2);
assert.equal(addAssistant(grandfathered), false);
assert.equal(upgradeAssistants(grandfathered), false);

const legacyTesting = structuredClone(midTest);
delete legacyTesting.budget;
delete legacyTesting.lastDeploymentActions;
storageData.set('sprint-game', JSON.stringify({ version: 1, game: legacyTesting }));
const migratedTesting = loadGame(storage);
assert.equal(migratedTesting.testCoverage, legacyTesting.testCoverage);
assert.equal(migratedTesting.items.find(entry => entry.id === 'T-11').inTest, true);
assert.equal(migratedTesting.budget, 0);
saveGame(storage, migratedTesting);
assert.deepEqual(loadGame(storage), migratedTesting);

for (const change of [
  value => { delete value.budget; },
  value => { delete value.lastDeploymentActions; },
  value => { value.budget = -1; },
  value => { value.budget = 1.5; },
  value => { value.budget = null; },
  value => { value.budget = Number.MAX_SAFE_INTEGER + 1; },
  value => { value.budget = value.lastDeploymentActions + 1; },
  value => { value.lastDeploymentActions = -1; },
  value => { value.lastDeploymentActions = 0.5; },
  value => { value.lastDeploymentActions = null; },
  value => { value.lastDeploymentActions = Number.MAX_SAFE_INTEGER + 1; },
  value => { value.lastDeploymentActions = value.actions + 1; },
  value => { value.actions = Number.MAX_SAFE_INTEGER + 1; }
]) {
  const value = structuredClone(midTest);
  change(value);
  const raw = JSON.stringify({ version: 2, game: value });
  storageData.set('sprint-game', raw);
  assert.throws(() => loadGame(storage));
  assert.equal(storageData.get('sprint-game'), raw);
}
const prematureBudget = newGame();
prematureBudget.budget = 1;
saveGame(storage, prematureBudget);
assert.throws(() => loadGame(storage));
prematureBudget.budget = 0;
prematureBudget.actions = 1;
prematureBudget.lastDeploymentActions = 1;
saveGame(storage, prematureBudget);
assert.throws(() => loadGame(storage));
const maxBudgetSave = structuredClone(afterFirstDeployment);
maxBudgetSave.actions = Number.MAX_SAFE_INTEGER;
maxBudgetSave.lastDeploymentActions = Number.MAX_SAFE_INTEGER;
maxBudgetSave.budget = Number.MAX_SAFE_INTEGER;
saveGame(storage, maxBudgetSave);
assert.deepEqual(loadGame(storage), maxBudgetSave);
saveGame(storage, newGame());
assert.equal(loadGame(storage).budget, 0);
assert.equal(loadGame(storage).lastDeploymentActions, 0);

{
  const { storiesPerRelease, releaseStoriesDone, selectedWorkItem, storiesWaitingForBugs, boardColumns } = require('../src/app/game/game.ts');
  assert.equal(storiesPerRelease, 5);

  const view = newGame();
  const columnNames = value => boardColumns(value).map(column => column.name);
  const columnIds = (value, name) => boardColumns(value).find(column => column.name === name).items.map(entry => entry.id);
  assert.deepEqual(columnNames(view), ['TO DO', 'IN PROGRESS', 'DONE']);
  assert.equal(selectedWorkItem(view), undefined);
  assert.equal(releaseStoriesDone(view), 0);
  assert.equal(storiesWaitingForBugs(view).size, 0);

  const firstTask = view.items.find(entry => entry.type === 'task' && entry.parent === 'S-01');
  assert.ok(columnIds(view, 'TO DO').includes(firstTask.id));
  assert.equal(selectItem(view, firstTask.id), true);
  assert.equal(selectedWorkItem(view), firstTask);
  assert.ok(columnIds(view, 'IN PROGRESS').includes(firstTask.id));
  assert.ok(!columnIds(view, 'TO DO').includes(firstTask.id));

  for (const task of view.items.filter(entry => entry.type === 'task' && entry.parent === 'S-01')) work(view, task.id, task.required);
  assert.equal(selectedWorkItem(view), undefined);
  assert.ok(columnIds(view, 'DONE').includes('S-01'));
  assert.equal(releaseStoriesDone(view), 1);

  const columnsTotal = boardColumns(view).reduce((sum, column) => sum + column.items.length, 0);
  assert.equal(columnsTotal, boardItems(view).length);

  const blocked = newGame();
  const storyTasks = story => blocked.items.filter(entry => entry.type === 'task' && entry.parent === story);
  for (const story of ['S-01', 'S-02']) for (const task of storyTasks(story)) work(blocked, task.id, task.required);
  const [lastTask, ...otherTasks] = storyTasks('S-03').reverse();
  for (const task of otherTasks) work(blocked, task.id, task.required);
  assert.equal(storiesWaitingForBugs(blocked).size, 0);
  assert.ok(makeBug(blocked));
  assert.equal(storiesWaitingForBugs(blocked).size, 0);
  assert.equal(work(blocked, lastTask.id, lastTask.required, true), true);
  assert.equal(blocked.items.find(entry => entry.id === 'S-03').done, false);
  assert.deepEqual([...storiesWaitingForBugs(blocked)], ['S-03']);
  assert.equal(releaseStoriesDone(blocked), 2);

  const testing = structuredClone(view);
  testing.activatedPerks.push('earl');
  assert.deepEqual(columnNames(testing), ['TO DO', 'IN PROGRESS', 'IN TEST', 'DONE']);
}

{
  const {
    coverageUpgradeStep, manualCoverageUpgradeCost, autoCoverageUpgradeCost, autoCoverageRate,
    upgradeManualCoverage, upgradeAutoCoverage
  } = require('../src/app/game/game.ts');
  assert.equal(coverageUpgradeStep, 5);
  assert.equal(manualCoverageUpgradeCost, 2000);
  assert.equal(autoCoverageUpgradeCost, 5000);

  const fresh = newGame();
  assert.equal(fresh.manualCoverageUpgrades, 0);
  assert.equal(fresh.autoCoverageUpgrades, 0);
  assert.equal(autoCoverageRate(fresh), 0);

  const upgrades = newGame();
  upgrades.budget = 100000;
  upgrades.activatedPerks.push('earl');
  assert.equal(coverageStep(upgrades), 1);
  assert.equal(upgradeManualCoverage(upgrades), false, 'manual upgrade needs Improve Testing Skills');
  assert.equal(upgradeAutoCoverage(upgrades), false, 'automatic upgrade needs Automate Testing');
  assert.equal(upgrades.budget, 100000);

  upgrades.activatedPerks.push('testing-skills');
  assert.equal(coverageStep(upgrades), 5);
  assert.equal(upgradeManualCoverage(upgrades), true);
  assert.equal(upgrades.budget, 98000);
  assert.equal(upgrades.manualCoverageUpgrades, 1);
  assert.equal(coverageStep(upgrades), 10);
  assert.equal(improveCoverage(upgrades), true);
  assert.equal(upgrades.testCoverage, 10);
  assert.equal(upgradeManualCoverage(upgrades), true);
  assert.equal(coverageStep(upgrades), 15);

  upgrades.activatedPerks.push('auto-testing');
  assert.equal(autoCoverageRate(upgrades), 1);
  assert.equal(upgradeAutoCoverage(upgrades), true);
  assert.equal(upgrades.budget, 96000 - 1 - 5000);
  assert.equal(upgrades.autoCoverageUpgrades, 1);
  assert.equal(autoCoverageRate(upgrades), 6);
  const beforeTick = upgrades.testCoverage;
  automate(upgrades);
  assert.equal(upgrades.testCoverage, beforeTick + 6);
  upgrades.testCoverage = 99998;
  automate(upgrades);
  assert.equal(upgrades.testCoverage, 100000);

  const poor = newGame();
  poor.activatedPerks.push('earl', 'testing-skills', 'auto-testing');
  poor.budget = 1999;
  assert.equal(upgradeManualCoverage(poor), false);
  poor.budget = 4999;
  assert.equal(upgradeAutoCoverage(poor), false);
  assert.equal(upgradeManualCoverage(poor), true);
  assert.equal(poor.budget, 2999);

  const coverageStorage = new Map();
  const memory = { getItem: key => coverageStorage.get(key) ?? null, setItem: (key, value) => coverageStorage.set(key, value) };
  const fullEarl = structuredClone(upgrades);
  fullEarl.budget = 0;
  saveGame(memory, fullEarl);
  assert.equal(loadGame(memory).manualCoverageUpgrades, 2);
  assert.equal(loadGame(memory).autoCoverageUpgrades, 1);

  const legacy = JSON.parse(coverageStorage.get('sprint-game'));
  delete legacy.game.manualCoverageUpgrades;
  delete legacy.game.autoCoverageUpgrades;
  coverageStorage.set('sprint-game', JSON.stringify(legacy));
  assert.equal(loadGame(memory).manualCoverageUpgrades, 0);
  assert.equal(loadGame(memory).autoCoverageUpgrades, 0);

  for (const [field, perk] of [['manualCoverageUpgrades', 'testing-skills'], ['autoCoverageUpgrades', 'auto-testing']]) {
    const invalidSave = structuredClone(fullEarl);
    invalidSave.activatedPerks = invalidSave.activatedPerks.filter(id => id !== perk);
    invalidSave[field] = 1;
    saveGame(memory, invalidSave);
    assert.throws(() => loadGame(memory), field);
    const negative = structuredClone(fullEarl);
    negative[field] = -1;
    saveGame(memory, negative);
    assert.throws(() => loadGame(memory), field);
  }
}

{
  const { assistantsFixBugs } = require('../src/app/game/game.ts');
  const setup = withPerk => {
    const value = newGame();
    for (const story of ['S-01', 'S-02']) {
      for (const task of value.items.filter(entry => entry.type === 'task' && entry.parent === story)) work(value, task.id, task.required);
    }
    value.actions = 28000;
    for (const id of ['code-assistant', 'multi-agent', ...(withPerk ? ['ai-testing-subscription'] : [])]) {
      assert.equal(activatePerk(value, id), true, id);
    }
    value.agentTargets = [null, null];
    value.agentCarry = [0, 0];
    value.assistants = 2;
    const task = value.items.find(entry => entry.type === 'task' && entry.parent === 'S-03');
    assert.equal(assignAgent(value, task.id), true);
    const bug = makeBug(value);
    assert.ok(bug);
    return { value, task, bug };
  };

  const without = setup(false);
  assert.equal(assistantsFixBugs(without.value), false);
  automate(without.value);
  assert.equal(without.bug.progress, 0, 'assistants ignore bugs without the perk');
  assert.equal(without.task.progress, 1);

  const withPerk = setup(true);
  assert.equal(assistantsFixBugs(withPerk.value), true);
  assert.equal(currentAutomationRate(withPerk.value), 2);
  const actionsBefore = withPerk.value.actions;
  automate(withPerk.value);
  assert.equal(withPerk.bug.progress, 2, 'both assistants fix the open bug');
  assert.equal(withPerk.task.progress, 0, 'tasks wait while bugs are open');
  assert.equal(withPerk.value.actions, actionsBefore + 2);
  assert.equal(withPerk.value.agentTargets[0], withPerk.task.id, 'assignments are kept');
  while (!withPerk.bug.done) automate(withPerk.value);
  assert.equal(openBugs(withPerk.value).length, 0);
  const taskBefore = withPerk.task.progress;
  automate(withPerk.value);
  assert.equal(withPerk.task.progress, taskBefore + 1, 'assigned assistant returns to its task');

  const noAssistants = newGame();
  noAssistants.actions = 28000;
  assert.equal(activatePerk(noAssistants, 'ai-testing-subscription'), true);
  assert.equal(assistantsFixBugs(noAssistants), false);
}

{
  const byId = id => perks.find(perk => perk.id === id);
  const preview = newGame();
  preview.actions = 21000;
  preview.activatedPerks = perks.slice(0, 8).map(perk => perk.id).concat('earl', 'testing-skills');
  assert.deepEqual(openPerks(preview), [byId('auto-testing'), byId('ai-testing-subscription')],
    'locked Automate Testing is previewed before later perks');
  preview.activatedPerks = perks.slice(0, 8).map(perk => perk.id);
  assert.deepEqual(openPerks(preview), [byId('auto-testing'), byId('earl'), byId('testing-skills')],
    'unlocked testing perks are promoted, the next preview follows unlock order');
  preview.actions = 16999;
  preview.activatedPerks = perks.slice(0, 8).map(perk => perk.id);
  assert.deepEqual(openPerks(preview), [byId('ai-testing-subscription')],
    'testing perks stay hidden until Earl is unlocked');
}

{
  const { testPassChance } = require('../src/app/game/game.ts');
  const passGame = newGame();
  passGame.actions = 17000;
  assert.equal(activatePerk(passGame, 'earl'), true);
  assert.equal(testPassChance(passGame), 0.5);
  passGame.testCoverage = 50000;
  assert.equal(testPassChance(passGame), 0.75);
  passGame.testCoverage = 100000;
  assert.equal(testPassChance(passGame), 1);
  assert.equal(work(passGame, 'T-01', 10), true);
  const passTask = passGame.items.find(entry => entry.id === 'T-01');
  assert.equal(passTask.inTest, true);
  withRandom(0.999999, () => automate(passGame));
  assert.equal(passTask.done, true, 'full coverage always passes');

  const halfGame = newGame();
  halfGame.actions = 17000;
  assert.equal(activatePerk(halfGame, 'earl'), true);
  halfGame.testCoverage = 20000;
  assert.equal(work(halfGame, 'T-01', 10), true);
  const halfTask = halfGame.items.find(entry => entry.id === 'T-01');
  withRandom(0.599999, () => automate(halfGame));
  assert.equal(halfTask.done, true, 'just below the 60% pass chance passes');
  assert.equal(work(halfGame, 'T-02', 10), true);
  const failTask = halfGame.items.find(entry => entry.id === 'T-02');
  withRandom(0.6, () => automate(halfGame));
  assert.equal(failTask.done, false);
  assert.equal(failTask.progress, 5, 'failed test halves the progress');
  assert.equal(halfGame.items.find(entry => entry.id === 'S-01').progress, 10 + 5 + 0 + 0 + 0);

  const unlimited = newGame();
  for (const story of ['S-01', 'S-02']) {
    for (const task of unlimited.items.filter(entry => entry.type === 'task' && entry.parent === story)) work(unlimited, task.id, task.required);
  }
  unlimited.actions = 15000;
  const baseChance = bugChance(unlimited);
  assert.equal(baseChance, 0.6);
  for (let count = 1; count <= 5; count++) {
    assert.ok(makeBug(unlimited), `bug ${count} can be added`);
    assert.equal(openBugs(unlimited).length, count);
    assert.ok(Math.abs(bugChance(unlimited) - baseChance / (1 + count) ** 2) < 1e-12, `chance with ${count} open bugs`);
  }

  const inTestDeploy = structuredClone(afterFirstDeployment);
  inTestDeploy.activatedPerks.push('earl');
  const pendingTask = inTestDeploy.items.find(entry => entry.type === 'task' && !entry.done);
  pendingTask.progress = pendingTask.required;
  pendingTask.inTest = true;
  for (const story of inTestDeploy.items.filter(entry => entry.type === 'story')) story.done = true;
  assert.equal(canDeploy(inTestDeploy), false, 'nothing deploys while an item is still in test');
  pendingTask.inTest = false;
  pendingTask.done = true;
  assert.equal(canDeploy(inTestDeploy), true);
}

console.log('Gameplay checks passed.');
