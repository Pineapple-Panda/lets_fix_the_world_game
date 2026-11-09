import { prefixed, unprefixed, type Smoothing } from '../../../shared/game/smoothing.ts';
import type { Game } from '../../level-one/models/game.model.ts';
import { formatVersion } from '../../level-one/models/version.model.ts';
import type {
  EpicDefinition, Fact, LaunchedGame, LaunchedPerk, LaunchedStats, LevelSummary, LaunchedProduct, LawsuitCase, ProductDefinition, ProgramDefinition, ProgramState,
  SpecialEvent,
  RentalClient, WorldProblem
} from '../models/launched.model.ts';
import { epics, launchedPerks, lawsuits, products, programs, rentalClients, specialEvents, worldGoals, worldProblems } from './launched-content.ts';

/** Coverage units (1/1000 percentage point) required before the application can launch: 100%. */
export const launchCoverage = 100000;
export const minActionsPerSecond = 50;
export const maxActionsPerSecond = 300;
/** Every this many seconds the budget grows by the new actions times `budgetPerAction`. */
export const budgetInterval = 5;
export const budgetPerAction = 1;

// ---------- Ids that the logic refers to ----------

/** Perk that brings the server (and with it the epics) into play. */
export const serverPerk = 'workflow-abstraction';
/** Perk that opens the Network & Financing card. */
export const networkPerk = 'network-financing';
/** Perk that halves every epic's server time and makes clients 25% stronger. */
export const dataCentersPerk = 'data-centers';
/** The repeatable "Add Server" perk. */
export const addServerPerkId = 'add-server';
/** Client whose riot-control robots resolve protests automatically. */
export const robotClient = 'edisonx';
/** Epic that runs the data centres on green energy. */
export const connectorEpic = 'data-center-green-connector';

/** True once Earl reports full test coverage. */
export function canLaunch(game: Game): boolean {
  return game.activatedPerks.includes('earl') && game.testCoverage >= launchCoverage;
}

/** A fresh level 2 state with the given actions and budget. */
function newLaunchedState(actions: number, budget: number): LaunchedGame {
  return {
    actions,
    budget,
    seconds: 0,
    budgetActions: actions,
    perks: [],
    serverSlots: 1,
    epics: [],
    products: [],
    focus: 0,
    rentals: [],
    worldProgress: noProgress(),
    integrity: startIntegrity,
    programs: [],
    completedPrograms: [],
    lawsuit: null,
    lawsuitsFiled: 0,
    verdict: null,
    stats: noStats(),
    victorySeen: false,
    history: [],
    eventsSeen: [],
    pendingEvent: null,
    nsaSeconds: 0,
    aidSlots: 0,
    aidSeconds: 0
  };
}

/** Reduces the level 1 game to the level 2 state: only actions and budget survive, level 1 perks are gone. */
export function launch(game: Game): LaunchedGame | null {
  return canLaunch(game) ? { ...newLaunchedState(game.actions, game.budget), history: [level1Summary(game)] } : null;
}

/** Level 1 in a few numbers, frozen at the launch. */
export function level1Summary(game: Game): LevelSummary {
  return {
    level: 1,
    title: 'Level 1 · Building the platform',
    facts: [
      { label: 'Time', value: playTime(game.seconds) },
      { label: 'App version at launch', value: formatVersion(game.appVersion) },
      { label: 'Deployments', value: game.deployments.toLocaleString('en-US') },
      { label: 'Bugs that showed up', value: game.bugCount.toLocaleString('en-US') },
      { label: 'Perks activated', value: game.activatedPerks.length.toLocaleString('en-US') },
      { label: 'Coding actions', value: game.actions.toLocaleString('en-US') }
    ]
  };
}

/** Level 2 in a few numbers, frozen when level 3 starts. */
export function level2Summary(state: LaunchedGame): LevelSummary {
  return {
    level: 2,
    title: 'Level 2 · Fixing the world',
    facts: [
      ...victorySummary(state).facts,
      { label: 'Epics shipped', value: state.epics.filter(entry => entry.done).length.toLocaleString('en-US') },
      { label: 'Servers', value: state.serverSlots.toLocaleString('en-US') },
      { label: 'Coding actions', value: state.actions.toLocaleString('en-US') }
    ]
  };
}

/** Starting values of level 2 when level 1 is disabled in the game config. */
export const skipLevelActions = 34000;
export const skipLevelBudget = 3000;

/** Dev shortcut: a fresh level 2 state without playing level 1. */
export function skippedLevelTwo(): LaunchedGame {
  return newLaunchedState(skipLevelActions, skipLevelBudget);
}

/** All end-of-level counters at 0. */
export function noStats(): LaunchedStats {
  return { lawsuits: 0, lawsuitsWon: 0, lawsuitsLost: 0, lawsuitsSettled: 0, protestClicks: 0, dirtySeconds: 0, tegridyBags: 0, pitches: 0 };
}

/** Perk that unlocks the "Pitch to investors" button. */
export const pitchPerk = 'pitch-deck';

export function canPitch(state: LaunchedGame): boolean {
  return state.perks.includes(pitchPerk);
}

/** A pitch is worth at least this much budget. */
export const pitchBase = 100;
/** A pitch is worth this share of the current budget income per second. */
export const pitchShare = 0.1;
/** Each server added with Add Server raises the pitch by half its base value. */
export const pitchServerStep = 0.5;

/**
 * Budget per second on average, ignoring the focus slider: the payout for new actions at the centre position plus
 * client rent and program income. The base for pitching, so the slider does not inflate it.
 */
export function budgetPerSecond(state: LaunchedGame): number {
  const averageActions = (minActionsPerSecond + maxActionsPerSecond) / 2;
  const programIncome = state.programs.reduce((total, entry) => {
    const program = programDefinition(entry.id);
    return total + (program && program.upkeep < 0 ? -program.upkeep : 0);
  }, 0);
  return averageActions * budgetPerAction + rentalIncome(state) + programIncome;
}

/**
 * Budget for one "Pitch to investors" click: 10% of the income per second without the focus slider (at least 100),
 * times 1 + 0.5 per added server (10 slots: ×5.5). Grows with the platform.
 */
export function pitchValue(state: LaunchedGame): number {
  return Math.round(Math.max(pitchBase, budgetPerSecond(state) * pitchShare) * (1 + pitchServerStep * addedServers(state)));
}

/** One click on "Pitch to investors" (needs the Pitch Deck Generator). */
export function pitch(state: LaunchedGame): LaunchedGame | null {
  if (!canPitch(state)) return null;
  return {
    ...state,
    budget: cap(state.budget + pitchValue(state)),
    stats: { ...state.stats, pitches: state.stats.pitches + 1 }
  };
}

/** A new run of level 2 after completing it: 10,000,000 actions and 20,000,000 budget. */
export const replayLevelTwoActions = 10000000;
export const replayLevelTwoBudget = 20000000;

export function replayLevelTwo(): LaunchedGame {
  return newLaunchedState(replayLevelTwoActions, replayLevelTwoBudget);
}

/** Every problem at 0%. */
export function noProgress(): Record<WorldProblem, number> {
  return { climate: 0, war: 0, hunger: 0, poverty: 0, corruption: 0 };
}

/** Solution progress (percentage points) each finished epic adds to its problems. */
export const epicProgress = 1.5;
/** Integrity at the start of level 2. */
export const startIntegrity = 50;

const percent = (value: number) => Math.max(0, Math.min(100, value));

const cap = (value: number) => Math.min(Number.MAX_SAFE_INTEGER, value);

/*
 * Focus slider: a trade-off between shipping features (left) and monetising (right).
 *   fully left:  actions +50% × focus power, budget per new action drops to 0
 *   centre:      no effect
 *   fully right: budget per new action +100% × focus power, actions -50%
 * In between the effects change linearly. Only the bonuses grow with focus power (Add Server);
 * the penalties stay at their fixed limits.
 */
export const focusLimit = 100;
export const maxActionBoost = 0.5;
export const maxBudgetBoost = 1;
/** Actions lost with the slider fully on "monetise". */
export const maxActionPenalty = 0.5;
/** Budget lost with the slider fully on "ship features" (all of it). */
export const maxBudgetPenalty = 1;

const clampFocus = (focus: number) => Math.max(-focusLimit, Math.min(focusLimit, Math.round(focus)));

/** Focus power grows by this factor per added server on top of the linear step. */
export const focusGrowth = 1.03;
/** Linear step of focus power per added server. */
export const focusStep = 0.5;

/**
 * How strong the slider's bonuses are: (1 + 0.5 per added server) × 1.03 per added server, rounded to 2 decimals.
 * 1 server ×1.55, 3 servers ×2.73, 9 servers ×7.17: a little faster than linear. Server slots already multiply
 * the actions per second, so the slider grows more gently.
 */
export function focusPower(state: LaunchedGame): number {
  const servers = addedServers(state);
  return Math.round((1 + focusStep * servers) * focusGrowth ** servers * 100) / 100;
}

/** Multiplier for actions per second: ×1.5 fully left (more with Add Server), ×0.5 fully right. */
export function actionBoost(state: LaunchedGame): number {
  const focus = clampFocus(state.focus) / focusLimit;
  return focus <= 0
    ? 1 + maxActionBoost * focusPower(state) * -focus
    : 1 - maxActionPenalty * focus;
}

/** Multiplier for the budget payout: ×2 fully right (more with Add Server), ×0 fully left. */
export function budgetBoost(state: LaunchedGame): number {
  const focus = clampFocus(state.focus) / focusLimit;
  return focus >= 0
    ? 1 + maxBudgetBoost * focusPower(state) * focus
    : 1 - maxBudgetPenalty * -focus;
}

/** Moves the focus slider; values are clamped to -100…100. */
export function setFocus(state: LaunchedGame, focus: number): LaunchedGame | null {
  if (!Number.isFinite(focus)) return null;
  const next = clampFocus(focus);
  return next === state.focus ? null : { ...state, focus: next };
}

/** Actions per second from clients (Mississippi Corp): their actions per slot × your server slots. */
export function clientActions(state: LaunchedGame): number {
  return state.rentals.reduce((total, id) => total + (rentalClient(id)?.actions ?? 0), 0) * state.serverSlots;
}

/**
 * Average actions per second right now: 175 (the middle of 50–300) × focus slider × server slots, plus the
 * actions from clients.
 */
export function averageActionsPerSecond(state: LaunchedGame): number {
  return Math.round((minActionsPerSecond + maxActionsPerSecond) / 2 * actionBoost(state) * state.serverSlots + clientActions(state));
}

/**
 * Average net budget per second right now, without pitches: the payout for new actions (with the focus slider),
 * client rent, and the income or upkeep of every program that is working this second.
 */
export function averageBudgetPerSecond(state: LaunchedGame): number {
  const payout = (minActionsPerSecond + maxActionsPerSecond) / 2 * actionBoost(state) * state.serverSlots * budgetPerAction * budgetBoost(state);
  const programs = state.programs.reduce((total, entry) => {
    const program = programDefinition(entry.id);
    return program && programWorking(state, entry) ? total - programUpkeep(state, program) : total;
  }, 0);
  return Math.round(payout + rentalIncome(state) + programs);
}

/** True after migrating to data centres. */
export function dataCentersActive(state: LaunchedGame): boolean {
  return state.perks.includes(dataCentersPerk);
}

/** Seconds an epic needs: halved (rounded up) after migrating to data centres. */
export function epicDuration(epic: EpicDefinition, dataCenters = false): number {
  return dataCenters ? Math.ceil(epic.duration / 2) : epic.duration;
}

/**
 * One second in level 2: actions grow by 50–300 per server slot (scaled by the focus slider), running epics advance by one second of server time,
 * and every 5 seconds the budget grows by the actions gained since the last payout (times `budgetPerAction` and the slider).
 * Then clients, finished epics, programs, lawsuits and product releases are applied.
 */
export function tickLaunched(
  state: LaunchedGame,
  random: () => number = Math.random
): LaunchedGame {
  const base = minActionsPerSecond + Math.floor(random() * (maxActionsPerSecond - minActionsPerSecond + 1));
  // Every server slot adds a full share of actions per second.
  const gained = Math.round(base * actionBoost(state) * state.serverSlots);
  const dataCenters = dataCentersActive(state);
  const next: LaunchedGame = {
    ...state,
    actions: cap(state.actions + gained),
    seconds: state.seconds + 1,
    epics: state.epics.map(epic => {
      if (epic.done) return epic;
      const progress = epic.progress + 1;
      const definition = epicDefinition(epic.id);
      return { ...epic, progress, done: progress >= (definition ? epicDuration(definition, dataCenters) : 0) };
    })
  };
  if (next.seconds % budgetInterval === 0) {
    next.budget = cap(next.budget + Math.round((next.actions - next.budgetActions) * budgetPerAction * budgetBoost(next)));
    next.budgetActions = next.actions;
  }
  // Rented slots pay every second, nudge the solution progress a tiny bit and move integrity.
  next.budget = cap(next.budget + rentalIncome(next));
  // Client actions (Mississippi Corp) count as coding actions but are not paid out as budget again.
  const outsourced = clientActions(next);
  if (outsourced) {
    next.actions = cap(next.actions + outsourced);
    next.budgetActions = cap(next.budgetActions + outsourced);
  }
  const progress = { ...next.worldProgress };
  const factor = clientFactor(next);
  for (const id of next.rentals) {
    const client = rentalClient(id);
    if (!client) continue;
    for (const [problem, delta] of Object.entries(client.progress) as [WorldProblem, number][]) {
      progress[problem] = percent(progress[problem] + delta * factor);
    }
    next.integrity = percent(next.integrity + client.integrity * factor);
  }
  // Epics that just finished add a fixed amount of solution progress to each of their problems.
  const finished = next.epics.filter(epic => epic.done && !state.epics.find(before => before.id === epic.id)?.done);
  for (const entry of finished) {
    const epic = epicDefinition(entry.id);
    if (epic?.climateBoost) progress.climate = percent(progress.climate + epic.climateBoost);
    const goal = epic && worldGoals.find(candidate => candidate.id === epic.goal);
    if (!goal) continue;
    for (const problem of goal.problems) progress[problem] = percent(progress[problem] + epicProgress);
  }
  next.worldProgress = progress;
  // Lawsuits first: a case filed this second freezes the sued product's programs right away.
  runLawsuit(next, random);
  runPrograms(next, random);
  runEvents(next);
  // A citizens assembly keeps integrity at 40% or more.
  if (citizensAssembly(next)) next.integrity = Math.max(assemblyIntegrity, next.integrity);
  // Clients walk out once integrity leaves their range (Green-Left below 70%, EdisonX above 20%).
  const leaving = next.rentals.filter(id => !clientAvailable(next, id));
  if (leaving.length) next.rentals = next.rentals.filter(id => !leaving.includes(id));
  if (shadyDeals(next)) next.stats = { ...next.stats, dirtySeconds: next.stats.dirtySeconds + 1 };
  // A product is released (at version 1.0) once all of its world goals are reached.
  const released = products
    .filter(definition => definition.goals.every(goal => goalComplete(next, goal)) && !product(next, definition.id))
    .map((definition): LaunchedProduct => ({ id: definition.id, major: 1, minor: 0, active: false }));
  if (released.length) next.products = [...next.products, ...released];
  return next;
}

/** Perk: integrity never drops below 40% and no new protests break out. */
export const assemblyPerk = 'citizens-assembly';
export const assemblyIntegrity = 40;

export function citizensAssembly(state: LaunchedGame): boolean {
  return state.perks.includes(assemblyPerk);
}

/** A client or running program that costs integrity or makes a problem worse (NSA, EdisonX, greenwashing, weapons). */
export function shadyDeals(state: LaunchedGame): boolean {
  return state.rentals.some(id => (rentalClient(id)?.integrity ?? 0) < 0) ||
    state.programs.some(entry => {
      const program = programDefinition(entry.id);
      return !!program && ((program.integrity ?? 0) < 0 || program.rate < 0);
    });
}

/** Closes the "world fixed" dialog for good. */
export function dismissVictory(state: LaunchedGame): LaunchedGame | null {
  return state.victorySeen ? null : { ...state, victorySeen: true };
}

export function product(state: LaunchedGame, id: string): LaunchedProduct | undefined {
  return state.products.find(entry => entry.id === id);
}

export function productDefinition(id: string): ProductDefinition | undefined {
  return products.find(definition => definition.id === id);
}

/** The product a world goal contributes to. */
export function productForGoal(goal: string): ProductDefinition | undefined {
  return products.find(definition => definition.goals.includes(goal));
}

/** Display name of a released product, e.g. "Green World v1.0". */
export function productTitle(released: LaunchedProduct): string {
  return `${productDefinition(released.id)?.name ?? released.id} v${released.major}.${released.minor}`;
}

/** Switches a released product on. It has no effect yet; what it does is still to be defined. */
export function activateProduct(state: LaunchedGame, id: string): LaunchedGame | null {
  const released = product(state, id);
  if (!released || released.active) return null;
  return { ...state, products: state.products.map(entry => entry.id === id ? { ...entry, active: true } : entry) };
}

export function launchedPerkUnlocked(state: LaunchedGame, perk: LaunchedPerk): boolean {
  return state.actions >= perk.actionsRequired;
}

/** Add Server is bought with budget: 10,000 for the first server, 10% more for each further one. */
export const addServerBasePrice = 10000;
export const addServerPriceStep = 1.1;

/** Budget price of the next server: 10,000 × 1.1 per server already added (rounded). */
export function addServerPrice(state: LaunchedGame): number {
  return Math.round(addServerBasePrice * addServerPriceStep ** addedServers(state));
}

/** Servers bought with the Add Server perk (the first slot comes with the workflow perk). */
export function addedServers(state: LaunchedGame): number {
  return Math.max(0, state.serverSlots - 1);
}

/** The next Add Server perk, priced by how many servers were already added. */
export function addServerPerk(state: LaunchedGame): LaunchedPerk {
  return {
    id: addServerPerkId,
    name: 'Add Server',
    description: 'Rack another server: +1 slot, so one more epic can run at the same time. Each server costs 10% more than the last.',
    icon: 'SV',
    actionsRequired: 0,
    cost: addServerPrice(state)
  };
}

/** Level 2 perks that are not activated yet, in unlock order. Add Server is always offered again. */
export function openLaunchedPerks(state: LaunchedGame): LaunchedPerk[] {
  return [
    // Some perks wait until one of their products is activated (the Mediation Academy needs Green World,
    // the lawyers any product card).
    ...launchedPerks.filter(perk => !state.perks.includes(perk.id) &&
      (!perk.requiresProducts || perk.requiresProducts.some(id => productActive(state, id)))),
    addServerPerk(state),
    // The Tegridy deal is offered once Network & Financing is open.
    ...(networkOnline(state) && !tegridyActive(state) ? [tegridyPerk] : []),
    // The robots are only offered while EdisonX is a client.
    ...(state.rentals.includes(robotClient) && !state.perks.includes(robotPerk.id) ? [robotPerk] : [])
  ].sort((a, b) => a.actionsRequired - b.actionsRequired);
}

/**
 * One-time deal with a small family farm in Colorado (1,000,000 budget). Afterwards integrity can be bought
 * by the bag in Network & Financing: +1 integrity for 100,000 budget, as often as you like.
 */
export const tegridyPerk: LaunchedPerk = {
  id: 'tegridy-farms',
  name: 'Tegridy Farms Supply Deal',
  description: 'Sign an exclusive deal with a small family farm in Colorado. Nobody asks how their integrity is grown.',
  icon: 'TF',
  actionsRequired: 0,
  cost: 1000000
};
export const tegridyBagCost = 100000;
export const tegridyBagIntegrity = 1;

export function tegridyActive(state: LaunchedGame): boolean {
  return state.perks.includes(tegridyPerk.id);
}

export function canBuyTegridy(state: LaunchedGame): boolean {
  return tegridyActive(state) && state.budget >= tegridyBagCost && state.integrity < 100;
}

/** "Buy some Tegridy": +1 integrity for 100,000 budget. */
export function buyTegridy(state: LaunchedGame): LaunchedGame | null {
  if (!canBuyTegridy(state)) return null;
  return {
    ...state,
    budget: state.budget - tegridyBagCost,
    integrity: Math.min(100, state.integrity + tegridyBagIntegrity),
    stats: { ...state.stats, tegridyBags: state.stats.tegridyBags + 1 }
  };
}

/**
 * Whether a perk can be taken right now: it is on offer (see `openLaunchedPerks`), enough actions are reached and
 * the budget covers its price. Adding a server only makes sense once there is a server to extend.
 */
export function launchedPerkAvailable(state: LaunchedGame, perk: LaunchedPerk): boolean {
  return openLaunchedPerks(state).some(open => open.id === perk.id) &&
    (perk.id !== addServerPerkId || serverOnline(state)) &&
    launchedPerkUnlocked(state, perk) &&
    state.budget >= (perk.cost ?? 0);
}

/** The Network & Financing desk (bottom left of the grid) opens with the "Who Pays for All This?" perk. */
export function networkOnline(state: LaunchedGame): boolean {
  return state.perks.includes(networkPerk);
}

/** Takes a perk and pays its price. Add Server adds a slot; every other perk is owned from then on. */
export function activateLaunchedPerk(state: LaunchedGame, id: string): LaunchedGame | null {
  const perk = openLaunchedPerks(state).find(entry => entry.id === id);
  if (!perk || !launchedPerkAvailable(state, perk)) return null;
  const budget = state.budget - (perk.cost ?? 0);
  return id === addServerPerkId
    ? { ...state, budget, serverSlots: state.serverSlots + 1 }
    : { ...state, budget, perks: [...state.perks, id] };
}

/** The server and its epics appear once the workflow is abstracted. */
export function serverOnline(state: LaunchedGame): boolean {
  return state.perks.includes(serverPerk);
}

export function epicDefinition(id: string): EpicDefinition | undefined {
  return epics.find(epic => epic.id === id);
}

export function runningEpics(state: LaunchedGame): number {
  return state.epics.filter(epic => !epic.done).length;
}

/** Server slots taken by running epics and rented clients. */
export function usedSlots(state: LaunchedGame): number {
  return runningEpics(state) + rentedSlots(state) + programSlots(state) + state.aidSlots;
}

// ---------- Problem solving cards: programs, integrity and protests ----------

/** Below this integrity the population distrusts the programs and protests can break out. */
export const protestIntegrity = 50;
/** Chance per program and second of a protest at 0% integrity (it falls linearly to 0 at 50%). */
export const maxProtestChance = 0.02;
/** Each product upgrade (v1.0 → v1.1 → …) makes its programs this much stronger. */
export const upgradeBonus = 0.25;
/** Budget for the next product upgrade: 500,000 × the next minor version. */
export const upgradeCostStep = 500000;

export function programDefinition(id: string): ProgramDefinition | undefined {
  return programs.find(program => program.id === id);
}

/** Server slots a program takes: 1 (or its own base), times the major version of its product (v2.x needs 2 each). */
export function programSlotsNeeded(state: LaunchedGame, program: ProgramDefinition): number {
  return (program.slots ?? 1) * (product(state, program.product)?.major ?? 1);
}

export function programSlots(state: LaunchedGame): number {
  return state.programs.reduce((total, entry) => {
    const program = programDefinition(entry.id);
    return total + (program ? programSlotsNeeded(state, program) : 0);
  }, 0);
}

/** A product's card works only once the product is active. */
export function productActive(state: LaunchedGame, id: string): boolean {
  return !!product(state, id)?.active;
}

/** At 0% integrity nobody cooperates: nothing can be started and nothing runs. */
export function integrityBlocked(state: LaunchedGame): boolean {
  return state.integrity <= 0;
}

/** A new protest needs this many clicks to resolve. */
export const protestResistance = 20;
/** Distrust can push a protest's resistance up to this many clicks, but not further. */
export const maxResistance = 50;
/** Perk that trains mediators: protests end faster and peacefully. */
export const mediationPerk = 'mediation-academy';
/** Resistance one click removes with trained mediators (1 without). */
export const mediationClick = 3;
/** Resistance the mediators remove from every protest per second on their own. */
export const mediationPower = 2;
/** At 0% integrity a protest's resistance grows by this much per second (linearly less up to 50%). */
export const maxResistanceGrowth = 2;
/** Resistance the robots remove from every protest per second. */
export const robotPower = 5;

/** Distrust of the population, 0 at 50% integrity or more, 1 at 0%. Drives protests. */
function distrust(state: LaunchedGame): number {
  return state.integrity >= protestIntegrity ? 0 : (protestIntegrity - state.integrity) / protestIntegrity;
}

/** How much a protest's resistance grows per second: the lower the integrity, the faster. */
export function resistanceGrowth(state: LaunchedGame): number {
  return maxResistanceGrowth * distrust(state);
}

export function mediatorsTrained(state: LaunchedGame): boolean {
  return state.perks.includes(mediationPerk);
}

/** Resistance removed from every protest per second by robots and mediators together. */
export function calmingPower(state: LaunchedGame): number {
  return (robotsOnSite(state) ? robotPower : 0) + (mediatorsTrained(state) ? mediationPower : 0);
}

/** Riot-control robots on site: available while EdisonX rents a slot. */
export function robotsOnSite(state: LaunchedGame): boolean {
  return state.perks.includes(robotPerk.id) && state.rentals.includes(robotClient);
}

/**
 * EdisonX's riot-control robots: offered only while EdisonX rents a slot (5,000,000 TCA, 2,000,000 budget),
 * and they only operate while EdisonX is still a client.
 */
export const robotPerk: LaunchedPerk = {
  id: 'edisonx-robots',
  name: 'EdisonX Riot-Control Robots',
  description: 'Polite, tireless and very large. They clear protests automatically, as long as EdisonX is your client.',
  icon: 'RB',
  actionsRequired: 5000000,
  cost: 2000000
};

export function inProtest(entry: ProgramState): boolean {
  return entry.resistance > 0;
}

/** Chance per second that a running program is hit by a protest. */
export function protestChance(state: LaunchedGame): number {
  return maxProtestChance * distrust(state);
}

/** Versions as steps: v1.0 → 10, v1.1 → 11, v2.0 → 20. */
function versionStep(major: number, minor: number): number {
  return major * 10 + minor;
}

/** Multiplier on program output from product upgrades: v1.0 ×1, v1.1 ×1.25, v1.2 ×1.5 … */
export function programBoost(state: LaunchedGame, productId: string): number {
  const released = product(state, productId);
  return released ? 1 + upgradeBonus * (versionStep(released.major, released.minor) - versionStep(1, 0)) : 1;
}

/** Programs that need an epic stay hidden until it is done. */
export function programRevealed(state: LaunchedGame, id: string): boolean {
  const program = programDefinition(id);
  return !!program && (!program.requiresEpic || epicDone(state, program.requiresEpic));
}

/** Names of the programs a program needs that are not running right now (missing or in protest). */
export function missingPrograms(state: LaunchedGame, id: string): string[] {
  return (programDefinition(id)?.requiresPrograms ?? [])
    .filter(required => !state.programs.some(entry => entry.id === required && !inProtest(entry)))
    .map(required => programDefinition(required)?.name ?? required);
}

/** Why a program cannot start right now, or null when it can. */
export function programBlocker(state: LaunchedGame, id: string): string | null {
  const program = programDefinition(id);
  if (!program) return 'Unknown program';
  if (!productActive(state, program.product)) return 'Activate the product first';
  if (state.programs.some(entry => entry.id === id)) return 'Already running';
  if (state.completedPrograms.includes(id)) return 'Already completed';
  if (!programRevealed(state, id)) return 'Not available yet';
  if (program.rate > 0 && !program.milestoneRate && problemSolved(state, program.problem)) {
    return `${worldProblems.find(entry => entry.id === program.problem)?.name ?? program.problem} is solved`;
  }
  if (integrityBlocked(state)) return 'Integrity is 0%: nobody cooperates';
  if (program.minActions !== undefined && state.actions < program.minActions) {
    return `Needs ${program.minActions.toLocaleString('en-US')} total coding actions`;
  }
  if (program.minIntegrity !== undefined && state.integrity < program.minIntegrity) {
    return `Needs ${program.minIntegrity}% integrity`;
  }
  const released = product(state, program.product);
  if (program.minVersion !== undefined &&
    versionStep(released?.major ?? 1, released?.minor ?? 0) < Math.round(program.minVersion * 10)) {
    return `Needs v${program.minVersion.toFixed(1)}`;
  }
  if (program.minProgress !== undefined && state.worldProgress[program.problem] < program.minProgress) {
    const problem = worldProblems.find(entry => entry.id === program.problem)?.name ?? program.problem;
    return `Needs ${program.minProgress}% ${problem} solution`;
  }
  const missing = missingPrograms(state, id);
  if (missing.length) return `Needs ${missing.join(' and ')} running`;
  const slots = programSlotsNeeded(state, program);
  if (usedSlots(state) + slots > state.serverSlots) {
    return `Needs ${slots} free server ${slots === 1 ? 'slot' : 'slots'}`;
  }
  if (state.budget < program.cost) return 'Not enough budget';
  return null;
}

export function startProgram(state: LaunchedGame, id: string): LaunchedGame | null {
  const program = programDefinition(id);
  if (!program || programBlocker(state, id)) return null;
  return { ...state, budget: state.budget - program.cost, programs: [...state.programs, { id, resistance: 0, milestone: 0 }] };
}

export function stopProgram(state: LaunchedGame, id: string): LaunchedGame | null {
  if (!state.programs.some(entry => entry.id === id)) return null;
  return { ...state, programs: state.programs.filter(entry => entry.id !== id) };
}

/** Resistance one "Talk to the protesters" click removes: 1, or 3 with trained mediators. */
export function clickPower(state: LaunchedGame): number {
  return mediatorsTrained(state) ? mediationClick : 1;
}

/** One click on "Talk to the protesters". At 0 the protest is over and the program continues. */
export function resolveProtest(state: LaunchedGame, id: string): LaunchedGame | null {
  if (!state.programs.some(entry => entry.id === id && inProtest(entry))) return null;
  const power = clickPower(state);
  return {
    ...state,
    programs: state.programs.map(entry => entry.id === id ? { ...entry, resistance: lowerResistance(entry.resistance, power) } : entry),
    stats: { ...state.stats, protestClicks: state.stats.protestClicks + 1 }
  };
}

/** Lowers resistance; anything below one click counts as resolved. */
function lowerResistance(resistance: number, by: number): number {
  const rest = resistance - by;
  return rest < 1e-9 ? 0 : rest;
}

/** Perk that halves the upkeep of every program. */
export const grantPerk = 'grant-proposals';

/** Budget per second a program costs (negative: income). Grant proposals halve costs, not income. */
export function programUpkeep(state: LaunchedGame, program: ProgramDefinition): number {
  return program.upkeep > 0 && state.perks.includes(grantPerk) ? program.upkeep / 2 : program.upkeep;
}

/** Whether a running program can pay this second's upkeep (income programs always can). */
export function programFunded(state: LaunchedGame, id: string): boolean {
  const program = programDefinition(id);
  return !!program && (program.upkeep <= 0 || state.budget >= programUpkeep(state, program));
}

/**
 * One second of all running programs (mutates `next`): at 0% integrity everything is frozen. Below 50%
 * protests can break out; a protested program makes no progress until the protest is resolved. A program
 * that cannot pay its upkeep, or whose required programs do not run, pauses for that second. A program with a
 * milestone ends by itself once it reaches 100%.
 */
function runPrograms(next: LaunchedGame, random: () => number): void {
  if (!next.programs.length || integrityBlocked(next)) return;
  // A court injunction freezes the programs of the sued product while the lawsuit is open.
  const sued = suedProducts(next);
  const growth = resistanceGrowth(next);
  // With a citizens assembly nobody needs to protest any more.
  const chance = citizensAssembly(next) ? 0 : protestChance(next);
  const robots = calmingPower(next);
  const progress = { ...next.worldProgress };
  // Required programs are checked against the start of the second.
  const before = { ...next };
  const running = next.programs.map(entry => {
    const program = programDefinition(entry.id);
    if (!program || sued.includes(program.product)) return entry;
    // A protest grows with distrust and shrinks while robots are on site; the program waits meanwhile.
    if (inProtest(entry)) {
      return { ...entry, resistance: lowerResistance(Math.min(maxResistance, entry.resistance + growth), robots) };
    }
    if (chance > 0 && random() < chance) return { ...entry, resistance: protestResistance };
    if (missingPrograms(before, entry.id).length || !programFunded(next, entry.id)) return entry;
    next.budget = cap(Math.max(0, next.budget - programUpkeep(next, program)));
    progress[program.problem] = percent(progress[program.problem] + program.rate * programBoost(next, program.product));
    if (program.integrity) next.integrity = percent(next.integrity + program.integrity);
    // Some programs work towards a milestone that unlocks an epic.
    if (program.milestoneRate && entry.milestone < 100) {
      return { ...entry, milestone: Math.min(100, entry.milestone + program.milestoneRate) };
    }
    return entry;
  });
  const completed = running.filter(entry => programDefinition(entry.id)?.milestoneRate && entry.milestone >= 100);
  // Once a problem is solved, the programs working on it stop by themselves (no upkeep for nothing).
  const solved = running.filter(entry => {
    const program = programDefinition(entry.id);
    return !!program && program.rate > 0 && !program.milestoneRate && progress[program.problem] >= 100;
  });
  next.programs = running.filter(entry => !completed.includes(entry) && !solved.includes(entry));
  if (completed.length) next.completedPrograms = [...next.completedPrograms, ...completed.map(entry => entry.id)];
  next.worldProgress = progress;
}

/** A world problem at 100%. */
export function problemSolved(state: LaunchedGame, problem: WorldProblem): boolean {
  return state.worldProgress[problem] >= 100;
}

/** All world problems at 100%: the end of level 2. */
export function worldFixed(state: LaunchedGame): boolean {
  return (Object.keys(state.worldProgress) as WorldProblem[]).every(problem => problemSolved(state, problem));
}

/** Whether a running program makes progress this second (not frozen, no protest, funded, requirements met). */
export function programWorking(state: LaunchedGame, entry: ProgramState): boolean {
  const program = programDefinition(entry.id);
  return !!program && !integrityBlocked(state) && !suedProducts(state).includes(program.product) &&
    !inProtest(entry) && programFunded(state, entry.id) && !missingPrograms(state, entry.id).length;
}

/** Solution progress per second a problem gets right now from clients and working programs. */
export function problemRate(state: LaunchedGame, problem: WorldProblem): number {
  const programRate = state.programs
    .filter(entry => programDefinition(entry.id)?.problem === problem && programWorking(state, entry))
    .reduce((total, entry) => {
      const program = programDefinition(entry.id)!;
      return total + program.rate * programBoost(state, program.product);
    }, 0);
  return programRate + rentalProgress(state, problem);
}

/** Seconds until a problem is solved at the current rate, or null when it is not moving forward. */
export function secondsToSolve(state: LaunchedGame, problem: WorldProblem): number | null {
  if (problemSolved(state, problem)) return 0;
  const rate = problemRate(state, problem);
  return rate > 0 ? Math.ceil((100 - state.worldProgress[problem]) / rate) : null;
}

/**
 * Budget for the next product version: 500,000 per step from v1.0 (v1.0 → v1.1 costs 500,000, v1.9 → v2.0
 * 5,000,000, v2.0 → v2.1 5,500,000, …).
 */
export function upgradeCost(state: LaunchedGame, productId: string): number {
  const released = product(state, productId);
  const steps = released ? versionStep(released.major, released.minor) - versionStep(1, 0) : 0;
  return upgradeCostStep * (steps + 1);
}

/** Raises an active product's version by 0.1; at v1.9 the next step is v2.0. */
export function upgradeProduct(state: LaunchedGame, productId: string): LaunchedGame | null {
  const released = product(state, productId);
  const cost = upgradeCost(state, productId);
  if (!released?.active || integrityBlocked(state) || state.budget < cost) return null;
  const minor = released.minor === 9 ? 0 : released.minor + 1;
  const major = released.minor === 9 ? released.major + 1 : released.major;
  return {
    ...state,
    budget: state.budget - cost,
    products: state.products.map(entry => entry.id === productId ? { ...entry, major, minor } : entry)
  };
}

/** Server slots taken by rental contracts (some clients rent several at once). */
export function rentedSlots(state: LaunchedGame): number {
  return state.rentals.reduce((total, id) => total + (rentalClient(id)?.slots ?? 1), 0);
}

/** Share of server slots in use, 0–1. */
export function serverLoad(state: LaunchedGame): number {
  return state.serverSlots > 0 ? Math.min(1, usedSlots(state) / state.serverSlots) : 1;
}

export function rentalClient(id: string): RentalClient | undefined {
  return rentalClients.find(client => client.id === id);
}

/** Data centres make every client 25% stronger: more income, and bigger effects in both directions. */
export const dataCenterClientBoost = 1.25;

export function clientFactor(state: LaunchedGame): number {
  return dataCentersActive(state) ? dataCenterClientBoost : 1;
}

/** Budget per second from all rented slots. */
/** Every server added with Add Server raises client rent by 3%. */
export const serverRentBonus = 0.03;

/** Multiplier on client rent from added servers: 1 + 3% per added server. */
export function serverRentFactor(state: LaunchedGame): number {
  return 1 + serverRentBonus * addedServers(state);
}

/** Perk that multiplies client rent by ten. */
export const premiumHostingPerk = 'premium-hosting';
export const premiumHostingFactor = 10;

/** Multiplier on client rent: data centres ×1.25, +3% per added server, premium hosting ×10. */
export function rentFactor(state: LaunchedGame): number {
  return clientFactor(state) * serverRentFactor(state) * (state.perks.includes(premiumHostingPerk) ? premiumHostingFactor : 1);
}

/** Budget per second a client pays right now (all rent multipliers included). */
export function clientIncome(state: LaunchedGame, client: RentalClient): number {
  return Math.round(client.income * rentFactor(state));
}

export function rentalIncome(state: LaunchedGame): number {
  return Math.round(state.rentals.reduce((total, id) => total + (rentalClient(id)?.income ?? 0), 0) * rentFactor(state));
}

/** Solution progress per second the current clients add to a problem (negative slows it down). */
export function rentalProgress(state: LaunchedGame, problem: WorldProblem): number {
  return state.rentals.reduce((total, id) => total + (rentalClient(id)?.progress[problem] ?? 0), 0) * clientFactor(state);
}

/** Whether a client works with you at the current integrity. Clients outside their range end the contract on the next tick. */
export function clientAvailable(state: LaunchedGame, id: string): boolean {
  const client = rentalClient(id);
  return !!client &&
    (client.minIntegrity === undefined || state.integrity >= client.minIntegrity) &&
    (client.maxIntegrity === undefined || state.integrity <= client.maxIntegrity);
}

/** Renting needs Network & Financing, a free server slot and a willing client; each client rents at most one slot. */
export function canRentSlot(state: LaunchedGame, id: string): boolean {
  const slots = rentalClient(id)?.slots ?? 1;
  return clientAvailable(state, id) && networkOnline(state) && !state.rentals.includes(id) &&
    usedSlots(state) + slots <= state.serverSlots;
}

export function rentSlot(state: LaunchedGame, id: string): LaunchedGame | null {
  if (!canRentSlot(state, id)) return null;
  return { ...state, rentals: [...state.rentals, id] };
}

/** Ends a rental contract and frees its slot. */
export function endRental(state: LaunchedGame, id: string): LaunchedGame | null {
  if (!state.rentals.includes(id)) return null;
  return { ...state, rentals: state.rentals.filter(entry => entry !== id) };
}

/** The epics of a world goal, in the order they build on each other. */
export function goalEpics(goal: string): EpicDefinition[] {
  return epics.filter(epic => epic.goal === goal);
}

export function epicDone(state: LaunchedGame, id: string): boolean {
  return state.epics.some(entry => entry.id === id && entry.done);
}

/**
 * All epics of a system (product) in the order they have to be done: goal by goal, e.g. war then corruption
 * for Peace & Integrity. Different systems can run in parallel; within a system it is one epic after another.
 */
export function systemEpics(epicId: string): EpicDefinition[] {
  const epic = epicDefinition(epicId);
  if (!epic) return [];
  const goals = productForGoal(epic.goal)?.goals ?? [epic.goal];
  return goals.flatMap(goal => goalEpics(goal));
}

/** The epic that has to be done before this one (the previous one in its system), if any. */
export function previousEpic(id: string): EpicDefinition | undefined {
  const chain = systemEpics(id);
  return chain[chain.findIndex(epic => epic.id === id) - 1];
}

/** An epic becomes available once the previous epic of its system is done (the first one right away). */
export function epicUnlocked(state: LaunchedGame, id: string): boolean {
  if (!epicDefinition(id)) return false;
  const previous = previousEpic(id);
  return !previous || epicDone(state, previous.id);
}

/** A world goal is reached once all of its epics are done. Goals without epics are never reached. */
export function goalComplete(state: LaunchedGame, goal: string): boolean {
  const chain = goalEpics(goal);
  return chain.length > 0 && chain.every(epic => epicDone(state, epic.id));
}

/** Special epics appear only once their program has completed its milestone. */
export function epicRevealed(state: LaunchedGame, id: string): boolean {
  const epic = epicDefinition(id);
  if (!epic?.requiresProgram) return !!epic;
  return state.completedPrograms.includes(epic.requiresProgram) || state.epics.some(entry => entry.id === id);
}

/** Why a revealed special epic cannot start yet (missing perk), or null. */
export function epicPerkMissing(state: LaunchedGame, id: string): string | null {
  const perk = epicDefinition(id)?.requiresPerk;
  if (!perk || state.perks.includes(perk)) return null;
  return launchedPerks.find(entry => entry.id === perk)?.name ?? perk;
}

/** Special epics outside the world goal chains (e.g. infrastructure) that are visible right now. */
export function infrastructureEpics(state: LaunchedGame): EpicDefinition[] {
  return epics.filter(epic => epic.requiresProgram && epicRevealed(state, epic.id));
}

/** True once the data centres run on green energy (the connector epic is done). */
export function greenDataCenters(state: LaunchedGame): boolean {
  return dataCentersActive(state) && epicDone(state, connectorEpic);
}

export function canStartEpic(state: LaunchedGame, id: string): boolean {
  const epic = epicDefinition(id);
  return !!epic &&
    serverOnline(state) &&
    epicRevealed(state, id) &&
    !epicPerkMissing(state, id) &&
    epicUnlocked(state, id) &&
    !state.epics.some(entry => entry.id === id) &&
    usedSlots(state) < state.serverSlots &&
    state.budget >= epic.cost;
}

/** Pays for an epic and puts it on the server. */
export function startEpic(state: LaunchedGame, id: string): LaunchedGame | null {
  const epic = epicDefinition(id);
  if (!epic || !canStartEpic(state, id)) return null;
  return { ...state, budget: state.budget - epic.cost, epics: [...state.epics, { id, progress: 0, done: false }] };
}

// ---------- Lawsuits ----------

/** Lawsuits only start once a product's work hurts business (solution progress of its problem) ... */
export const lawsuitProgress = 30;
/** ... and the platform looks too clean to ignore. */
export const lawsuitIntegrity = 80;
/** Chance per second of a lawsuit while both conditions hold. */
export const lawsuitChance = 0.003;
/** Budget to settle the first lawsuit out of court. */
export const baseSettlementCost = 500000;
/** Seconds in court for the first lawsuit when you fight. */
export const baseCourtDuration = 90;
/** Chance to win in court. */
export const courtWinChance = 0.65;
/** Perk: lawsuits go to court automatically. */
export const decentLawyerPerk = 'decent-lawyer';
/** Perk: +20 percentage points in court. */
export const goodLawyerPerk = 'good-lawyer';
export const goodLawyerBonus = 0.2;
/** Perk: court cases are won with a fixed 95%. */
export const chewbaccaPerk = 'chewbacca-defense';
export const chewbaccaChance = 0.95;

/** Chance to win the current court case: 65%, 85% with a good lawyer, a fixed 95% with the Chewbacca defense. */
export function winChance(state: LaunchedGame): number {
  if (state.perks.includes(chewbaccaPerk)) return chewbaccaChance;
  return courtWinChance + (state.perks.includes(goodLawyerPerk) ? goodLawyerBonus : 0);
}

/** A decent lawyer takes every lawsuit to court on their own. */
export function lawyerOnCase(state: LaunchedGame): boolean {
  return state.perks.includes(decentLawyerPerk);
}
/** A lost case costs this many times the settlement as damages. */
export const damagesFactor = 2;
/** Every further lawsuit costs and takes this much more. */
export const lawsuitEscalation = 1.2;
/** Without an open lawsuit, the escalation counter drops by one every this many seconds. */
export const lawsuitCooldown = 120;

/**
 * Factor for the current lawsuit: 1.2^(n-1), where n counts recent lawsuits. The count drops by one every two
 * minutes without a lawsuit, so a quiet phase makes the next one cheaper again.
 */
function escalation(state: LaunchedGame): number {
  return lawsuitEscalation ** Math.max(0, state.lawsuitsFiled - 1);
}

/** Budget to settle the current lawsuit. */
export function settlementCost(state: LaunchedGame): number {
  return Math.round(baseSettlementCost * escalation(state) * (lawsuitCase(state)?.costFactor ?? 1));
}

/** Seconds in court for the current lawsuit. */
export function courtDuration(state: LaunchedGame): number {
  return Math.round(baseCourtDuration * escalation(state));
}

/** Damages for losing the current lawsuit in court: twice the settlement. */
export function courtDamages(state: LaunchedGame): number {
  return settlementCost(state) * damagesFactor;
}

/** The world problems a product's programs work on, in program order (Green World: climate; Fair Share: hunger, poverty). */
export function productProblems(productId: string): WorldProblem[] {
  return [...new Set(programs.filter(program => program.product === productId).map(program => program.problem))];
}

/** A product whose world problems are all solved: its work is done and it can no longer be sued. */
export function productSolved(state: LaunchedGame, productId: string): boolean {
  return productProblems(productId).every(problem => problemSolved(state, problem));
}

/**
 * Whether companies feel threatened enough to sue a product: it is active and not solved yet, one of its problems
 * is solved to 30% or more and integrity is above 80%. Without a product: whether any product is at risk.
 */
export function lawsuitRisk(state: LaunchedGame, productId?: string): boolean {
  if (productId === undefined) return products.some(definition => lawsuitRisk(state, definition.id));
  return productActive(state, productId) && !productSolved(state, productId) && state.integrity > lawsuitIntegrity &&
    productProblems(productId).some(problem => state.worldProgress[problem] >= lawsuitProgress);
}

/** Chance per second of a new lawsuit: 0.3%, multiplied by running programs that provoke lawsuits (Tax the Rich ×3). */
export function currentLawsuitChance(state: LaunchedGame): number {
  return state.programs.reduce((chance, entry) => chance * (programDefinition(entry.id)?.lawsuitMultiplier ?? 1), lawsuitChance);
}

/**
 * One second of lawsuit logic (mutates `next`): a new case may be filed, a fought case counts down. When the
 * verdict comes, the case is won with 65%; a loss costs damages (the budget does not drop below 0).
 */
function runLawsuit(next: LaunchedGame, random: () => number): void {
  // A case against applications that are all solved collapses: there is nothing left to sue.
  if (next.lawsuit && suedProducts(next).every(id => productSolved(next, id))) {
    const sued = lawsuitCase(next);
    next.verdict = { product: sued?.products ? 'all' : sued?.product ?? '', plaintiff: sued?.plaintiff ?? '', won: true, damages: 0 };
    next.lawsuit = null;
    return;
  }
  if (next.lawsuit) {
    if (next.lawsuit.courtSeconds === null) {
      if (lawyerOnCase(next)) next.lawsuit = { ...next.lawsuit, courtSeconds: courtDuration(next) };
      return;
    }
    const courtSeconds = next.lawsuit.courtSeconds - 1;
    if (courtSeconds > 0) {
      next.lawsuit = { ...next.lawsuit, courtSeconds };
      return;
    }
    const sued = lawsuitCase(next);
    const won = random() < winChance(next);
    const damages = won ? 0 : courtDamages(next);
    next.budget = Math.max(0, next.budget - damages);
    next.verdict = { product: sued?.products ? 'all' : sued?.product ?? '', plaintiff: sued?.plaintiff ?? '', won, damages };
    next.lawsuit = null;
    next.stats = { ...next.stats, [won ? 'lawsuitsWon' : 'lawsuitsLost']: next.stats[won ? 'lawsuitsWon' : 'lawsuitsLost'] + 1 };
    return;
  }
  // Quiet times calm the companies down again.
  if (next.lawsuitsFiled > 0 && next.seconds % lawsuitCooldown === 0) next.lawsuitsFiled = next.lawsuitsFiled - 1;
  // Only one lawsuit at a time; the case is drawn from those against the products at risk. Cases tied to a
  // program are filed while that program runs.
  const open = lawsuits.map((entry, caseId) => ({ entry, caseId })).filter(({ entry }) => entry.special ? false : entry.program
    ? next.programs.some(running => running.id === entry.program) && productActive(next, entry.product) && !productSolved(next, entry.product)
    : lawsuitRisk(next, entry.product));
  if (open.length && random() < currentLawsuitChance(next)) {
    next.lawsuit = { caseId: open[Math.min(open.length - 1, Math.floor(random() * open.length))]!.caseId, courtSeconds: null };
    next.lawsuitsFiled = next.lawsuitsFiled + 1;
    next.verdict = null;
    next.stats = { ...next.stats, lawsuits: next.stats.lawsuits + 1 };
  }
}

export function lawsuitCase(state: LaunchedGame): LawsuitCase | undefined {
  return state.lawsuit ? lawsuits[state.lawsuit.caseId] : undefined;
}

/** Products whose programs the current lawsuit freezes (one, or all three for the EdisonX lawsuit). */
export function suedProducts(state: LaunchedGame): string[] {
  const sued = lawsuitCase(state);
  return sued ? sued.products ?? [sued.product] : [];
}

/** Turning down the EdisonX donation: a lawsuit against all three applications, unless they are all solved already. */
function suedForDonation(state: LaunchedGame): LaunchedGame {
  const caseId = lawsuits.findIndex(entry => entry.special);
  const sued = lawsuits[caseId]?.products ?? [];
  return sued.every(id => productSolved(state, id)) ? state : fileLawsuit(state, caseId);
}

/** Files a lawsuit right away (used by special events). */
function fileLawsuit(state: LaunchedGame, caseId: number): LaunchedGame {
  return {
    ...state,
    lawsuit: { caseId, courtSeconds: null },
    lawsuitsFiled: state.lawsuitsFiled + 1,
    verdict: null,
    stats: { ...state.stats, lawsuits: state.stats.lawsuits + 1 }
  };
}

// ---------- Special events ----------

/** The NSA leak comes after the NSA has been a client for this many seconds in total. */
export const nsaLeakSeconds = 60;
/** UN drought aid: slots lent, for how long, and the hunger progress it brings. */
export const aidSlotCount = 5;
export const aidDuration = 60;
export const aidHunger = 2;
export const donationBudget = 5000000;
export const donationIntegrity = 20;
export const leakPayment = 5000000;
export const leakIntegrity = 10;

export function specialEvent(id: string | null): SpecialEvent | undefined {
  return specialEvents.find(entry => entry.id === id);
}

/** Whether a special event's moment has come. */
export function eventDue(state: LaunchedGame, id: string): boolean {
  switch (id) {
    case 'edisonx-donation':
      // All three applications activated and at least three problems at 10% or more; needs a free court.
      return ['green-world', 'fair-share', 'peace-integrity'].every(productId => productActive(state, productId)) &&
        Object.values(state.worldProgress).filter(value => value >= 10).length >= 3 && !state.lawsuit;
    case 'nsa-leak':
      return state.nsaSeconds >= nsaLeakSeconds;
    case 'un-drought':
      // Integrity right at 80% (79.5 to 80.5).
      return Math.round(state.integrity) === 80;
    default:
      return false;
  }
}

/** Whether the "accept" answer is possible right now (enough budget or free slots). */
export function canAcceptEvent(state: LaunchedGame, id: string): boolean {
  if (id === 'nsa-leak') return state.budget >= leakPayment;
  if (id === 'un-drought') return usedSlots(state) + aidSlotCount <= state.serverSlots;
  return true;
}

/** One second of event logic (mutates `next`): counts NSA time, ends the UN aid, and raises the next due event. */
function runEvents(next: LaunchedGame): void {
  if (next.rentals.includes('nsa')) next.nsaSeconds = next.nsaSeconds + 1;
  if (next.aidSeconds > 0) {
    next.aidSeconds = next.aidSeconds - 1;
    if (next.aidSeconds === 0) next.aidSlots = 0;
  }
  if (next.pendingEvent) return;
  const due = specialEvents.find(entry => !next.eventsSeen.includes(entry.id) && eventDue(next, entry.id));
  if (due) {
    next.pendingEvent = due.id;
    next.eventsSeen = [...next.eventsSeen, due.id];
  }
}

/** The player's answer to the pending event. */
export function answerEvent(state: LaunchedGame, accept: boolean): LaunchedGame | null {
  const id = state.pendingEvent;
  if (!id || (accept && !canAcceptEvent(state, id))) return null;
  const closed: LaunchedGame = { ...state, pendingEvent: null };
  switch (id) {
    case 'edisonx-donation':
      return accept
        ? { ...closed, budget: cap(closed.budget + donationBudget), integrity: percent(closed.integrity - donationIntegrity) }
        : suedForDonation(closed);
    case 'nsa-leak':
      return accept
        ? { ...closed, budget: closed.budget - leakPayment }
        : { ...closed, integrity: percent(closed.integrity - leakIntegrity) };
    case 'un-drought':
      return accept
        ? { ...closed, aidSlots: aidSlotCount, aidSeconds: aidDuration,
            worldProgress: { ...closed.worldProgress, hunger: percent(closed.worldProgress.hunger + aidHunger) } }
        : closed;
    default:
      return closed;
  }
}

/** Pay to make it go away. */
export function settleLawsuit(state: LaunchedGame): LaunchedGame | null {
  const cost = settlementCost(state);
  if (!state.lawsuit || state.lawsuit.courtSeconds !== null || state.budget < cost) return null;
  return { ...state, budget: state.budget - cost, lawsuit: null, stats: { ...state.stats, lawsuitsSettled: state.stats.lawsuitsSettled + 1 } };
}

/** Go to court: free, but the programs stay frozen until the verdict, and a loss costs damages. */
export function fightLawsuit(state: LaunchedGame): LaunchedGame | null {
  if (!state.lawsuit || state.lawsuit.courtSeconds !== null) return null;
  return { ...state, lawsuit: { ...state.lawsuit, courtSeconds: courtDuration(state) } };
}

// ---------- End of level 2 ----------

/** 8,040 seconds → "2 h 14 min", 300 → "5 min". */
export function playTime(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

/** A few facts about how the world was fixed, and one line about how clean it was. */
export function victorySummary(state: LaunchedGame): { facts: Fact[]; verdict: string } {
  const { stats } = state;
  const shady = state.seconds > 0 ? Math.round(stats.dirtySeconds / state.seconds * 100) : 0;
  const facts = [
    { label: 'Time to fix the world', value: playTime(state.seconds) },
    { label: 'Lawsuits', value: stats.lawsuits ? `${stats.lawsuits} (${stats.lawsuitsWon} won, ${stats.lawsuitsLost} lost, ${stats.lawsuitsSettled} settled)` : 'None. Suspicious.' },
    { label: 'Talks with protesters', value: stats.protestClicks.toLocaleString('en-US') },
    { label: 'Investor pitches', value: stats.pitches.toLocaleString('en-US') },
    { label: 'Time with shady deals', value: `${shady}%` },
    { label: 'Integrity at the end', value: `${Math.round(state.integrity)}%` },
    ...(stats.tegridyBags ? [{ label: 'Bags of Tegridy', value: stats.tegridyBags.toLocaleString('en-US') }] : [])
  ];
  const verdict = shady < 5 && state.integrity >= 70
    ? 'A saint with a server farm. History will write songs about you, royalty-free.'
    : shady < 30
      ? 'Mostly clean. Nobody needs to know about the rest.'
      : shady < 60
        ? 'You fixed the world, partly with the help of the people who broke it.'
        : 'The world is fixed. Your conscience is still in the backlog.';
  return { facts, verdict };
}

/** Numbers that glide between ticks: actions, budget, integrity, the world problems and the program milestones. */
export const launchedSmoothing: Smoothing<LaunchedGame> = {
  read: state => ({
    actions: state.actions,
    budget: state.budget,
    integrity: state.integrity,
    ...prefixed('world', state.worldProgress),
    ...Object.fromEntries(state.programs.map(entry => [`milestone.${entry.id}`, entry.milestone]))
  }),
  write: (state, values) => ({
    ...state,
    actions: Math.round(values['actions'] ?? state.actions),
    budget: Math.round(values['budget'] ?? state.budget),
    integrity: values['integrity'] ?? state.integrity,
    worldProgress: unprefixed('world', values, state.worldProgress),
    programs: state.programs.map(entry => ({ ...entry, milestone: values[`milestone.${entry.id}`] ?? entry.milestone }))
  })
};
