import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  actionBoost, addedServers, addServerPerk, budgetBoost, budgetInterval, budgetPerAction, canBuyTegridy, canRentSlot,
  canStartEpic, clientAvailable, clientFactor, courtDamages, courtDuration, winChance, lawyerOnCase, programUpkeep, dataCentersActive, epicDefinition, epicDone, epicDuration,
  epicPerkMissing, epicUnlocked, focusPower, goalComplete, goalEpics, inProtest, infrastructureEpics, missingPrograms, programDefinition, programRevealed,
  integrityBlocked, launchedPerkAvailable, lawsuitCase, networkOnline, openLaunchedPerks, previousEpic, product,
  productDefinition, productForGoal, productProblems, productTitle, programBlocker, programBoost, programFunded, protestChance, rentalIncome, rentedSlots,
  resistanceGrowth, robotPerk, robotPower, robotsOnSite, clickPower, mediatorsTrained, pitchValue, canPitch, mediationPower, maxResistance, secondsToSolve, problemSolved, runningEpics, serverLoad, serverOnline, settlementCost,
  tegridyActive, tegridyBagCost, tegridyPerk, upgradeCost
} from '../../game/launched';
import { launchedPerks, products, programs, rentalClients, worldGoals, worldProblems } from '../../game/launched-content';
import type { EpicDefinition, LaunchedGame, LaunchedPerk, ProgramDefinition, WorldProblem } from '../../models/launched.model';

/** Rounds tiny per-second rates for display (5 decimals). */
const small = (value: number) => Math.round(value * 100000) / 100000;
const problemName = (id: string) => worldProblems.find(entry => entry.id === id)?.name ?? id;

/** Level 2: a 3×2 grid of cards. The development card sits bottom centre; the others unlock over time. */
@Component({
  selector: 'app-level-two',
  imports: [DecimalPipe],
  templateUrl: './level-two.html'
})
export class LevelTwoComponent {
  readonly state = input.required<LaunchedGame>();
  /** Dev mode: epics take at most 5 seconds. */
  readonly fastEpics = input(false);
  readonly perkActivated = output<string>();
  readonly epicStarted = output<string>();
  readonly productActivated = output<string>();
  readonly focusChanged = output<number>();
  readonly slotRented = output<string>();
  readonly rentalEnded = output<string>();
  readonly tegridyBought = output<void>();
  readonly programStarted = output<string>();
  readonly programStopped = output<string>();
  readonly protestResolved = output<string>();
  readonly productUpgraded = output<string>();
  readonly lawsuitSettled = output<void>();
  readonly lawsuitFought = output<void>();
  readonly pitched = output<void>();

  protected readonly view = computed(() => {
    const state = this.state();
    const fast = this.fastEpics();
    const halved = dataCentersActive(state);
    const factor = clientFactor(state);
    return {
      nextPayout: budgetInterval - (state.seconds % budgetInterval),
      payoutRate: Math.round(budgetPerAction * budgetBoost(state) * 10) / 10,
      pitchValue: pitchValue(state),
      canPitch: canPitch(state),
      // At most five perks: the ones that can be taken right now first, then the next by unlock threshold.
      openPerks: openLaunchedPerks(state)
        .map(perk => ({ perk, unlocked: launchedPerkAvailable(state, perk) }))
        .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
        .slice(0, 5),
      // Top row of the grid, left to right. Each card stays locked until its product is released.
      productCards: products.map(definition => {
        const released = product(state, definition.id);
        return { definition, released, title: released ? productTitle(released) : '', panel: this.panel(state, definition.id) };
      }),
      actionBoost: Math.round((actionBoost(state) - 1) * 100),
      budgetBoost: Math.round((budgetBoost(state) - 1) * 100),
      // Every Add Server adds one step to the slider effect.
      focusPower: focusPower(state),
      networkOnline: networkOnline(state),
      serverOnline: serverOnline(state),
      load: Math.round(serverLoad(state) * 100),
      running: runningEpics(state),
      rented: rentedSlots(state),
      rentalIncome: rentalIncome(state),
      worldProgress: worldProblems.map(problem => ({
        ...problem,
        value: state.worldProgress[problem.id],
        eta: this.eta(secondsToSolve(state, problem.id))
      })),
      clients: rentalClients.map(client => ({
        client,
        rented: state.rentals.includes(client.id),
        canRent: canRentSlot(state, client.id),
        available: clientAvailable(state, client.id),
        condition: client.minIntegrity !== undefined ? `Only works with you at ${client.minIntegrity}% integrity or more`
          : client.maxIntegrity !== undefined ? `Only works with you at ${client.maxIntegrity}% integrity or less` : '',
        income: Math.round(client.income * factor),
        effects: (Object.entries(client.progress) as [WorldProblem, number][]).map(([problem, delta]) => ({
          name: problemName(problem),
          delta: small(delta * factor)
        })),
        integrity: small(client.integrity * factor)
      })),
      integrity: state.integrity,
      tegridy: tegridyActive(state),
      canBuyTegridy: canBuyTegridy(state),
      tegridyBagCost,
      activePerks: <(LaunchedPerk & { badge?: number })[]>[
        ...launchedPerks.filter(perk => state.perks.includes(perk.id)),
        ...(tegridyActive(state) ? [tegridyPerk] : []),
        ...(state.perks.includes(robotPerk.id)
          ? [{ ...robotPerk, description: robotPerk.description + (robotsOnSite(state) ? ' On site.' : ' Idle: EdisonX is not a client.') }]
          : []),
        // Add Server can be taken many times; show it once with its count.
        ...(addedServers(state) > 0
          ? [{ ...addServerPerk(state), name: `Add Server ×${addedServers(state)}`, description: `${state.serverSlots} servers in total.`, badge: state.serverSlots }]
          : [])
      ],
      slots: state.serverSlots,
      // Special epics unlocked by programs; hidden again once done.
      infrastructure: infrastructureEpics(state).filter(epic => !epicDone(state, epic.id)).map(epic => ({
        ...this.epicCard(state, epic, fast, halved),
        missingPerk: epicPerkMissing(state, epic.id)
      })),
      // One block per world goal that has epics: finished epics, then the next one in the chain.
      goals: worldGoals.filter(goal => goalEpics(goal.id).length).map(goal => {
        const chain = goalEpics(goal.id);
        const next = chain.find(epic => !epicDone(state, epic.id));
        const target = productForGoal(goal.id);
        const released = target && product(state, target.id);
        // Goals that share a product (war + corruption) wait for each other.
        const missing = target?.goals
          .filter(other => !goalComplete(state, other))
          .map(other => worldGoals.find(candidate => candidate.id === other)?.name ?? other) ?? [];
        return {
          goal,
          total: chain.length,
          shipped: chain.filter(epic => epicDone(state, epic.id)),
          complete: goalComplete(state, goal.id),
          outcome: released
            ? `Released: ${productTitle(released)}`
            : `Goal reached · ${target?.name ?? 'The product'} also needs ${missing.join(' and ')}`,
          next: next && {
            ...this.epicCard(state, next, fast, halved),
            // Within a system epics run one after another (Peace & Integrity: war first, then corruption).
            waitingFor: epicUnlocked(state, next.id) ? undefined : previousEpic(next.id)?.title
          }
        };
      })
    };
  });

  /** Epic categories that still have work left; finished ones are hidden. */
  protected readonly openGoals = computed(() => this.view().goals.filter(goal => !goal.complete));

  /** An epic as shown on the server card: its effective duration, whether it runs and how far it is. */
  private epicCard(state: LaunchedGame, epic: EpicDefinition, fast: boolean, halved: boolean) {
    const entry = state.epics.find(candidate => candidate.id === epic.id);
    const duration = epicDuration(epic, fast, halved);
    return {
      epic: { ...epic, duration },
      running: !!entry,
      progress: entry ? Math.min(entry.progress, duration) : 0,
      canStart: canStartEpic(state, epic.id)
    };
  }

  /** The control panel of an active product card (programs, protests, upgrade). Completed programs are hidden. */
  private panel(state: LaunchedGame, productId: string) {
    const released = product(state, productId);
    const productPrograms = programs.filter(program => program.product === productId);
    if (!released?.active || !productPrograms.length) return null;
    const boost = programBoost(state, productId);
    const cost = upgradeCost(state, productId);
    const cardPrograms = productPrograms.filter(program =>
      !state.completedPrograms.includes(program.id) && programRevealed(state, program.id));
    return {
      productName: productDefinition(productId)?.name ?? productId,
      // Any running program blocked by a protest; makes the card border pulse.
      protest: state.programs.some(entry => inProtest(entry) && programDefinition(entry.id)?.product === productId),
      problems: productProblems(productId).map(id => ({ id, name: problemName(id), progress: state.worldProgress[id], solved: problemSolved(state, id) })),
      frozen: integrityBlocked(state),
      protestRisk: Math.round(protestChance(state) * 1000) / 10,
      lawsuit: state.lawsuit && lawsuitCase(state)?.product === productId ? {
        ...lawsuitCase(state)!,
        courtSeconds: state.lawsuit.courtSeconds,
        canSettle: state.budget >= settlementCost(state)
      } : null,
      settlementCost: settlementCost(state),
      courtDamages: courtDamages(state),
      winChance: Math.round(winChance(state) * 100),
      lawyer: lawyerOnCase(state),
      verdict: !state.lawsuit && state.verdict?.product === productId ? state.verdict : null,
      courtDuration: courtDuration(state),
      resistanceGrowth: Math.round(resistanceGrowth(state) * 10) / 10,
      robots: robotsOnSite(state),
      robotPower,
      mediators: mediatorsTrained(state),
      mediationPower,
      clickPower: clickPower(state),
      maxResistance,
      boostPercent: Math.round((boost - 1) * 100),
      upgradeCost: cost,
      canUpgrade: !integrityBlocked(state) && state.budget >= cost,
      programs: cardPrograms.map(program => {
        const running = state.programs.find(entry => entry.id === program.id);
        return {
          program,
          problemName: problemName(program.problem),
          rate: small(program.rate * boost),
          terms: this.programTerms(program, small(program.rate * boost), programUpkeep(state, program)),
          running: !!running,
          protest: !!running && inProtest(running),
          clicksLeft: running ? Math.ceil(running.resistance) : 0,
          milestone: program.milestoneRate ? (running?.milestone ?? 0) : null,
          milestoneLabel: program.milestoneLabel ?? 'Progress',
          unlocksEpic: program.unlocksEpic ? epicDefinition(program.unlocksEpic)?.title : undefined,
          unfunded: !!running && !inProtest(running) && !programFunded(state, program.id),
          waitingFor: running ? missingPrograms(state, program.id) : [],
          blocker: running ? null : programBlocker(state, program.id)
        };
      })
    };
  }

  /** The cost line of a program: start price, upkeep or income, effect, integrity, slots. */
  private programTerms(program: ProgramDefinition, rate: number, upkeep: number): { text: string; tone: string }[] {
    return [
      program.cost ? { text: `${this.format(program.cost)} to start`, tone: '' } : null,
      upkeep > 0 ? { text: `−${this.format(upkeep)} budget/sec`, tone: '' } : null,
      upkeep < 0 ? { text: `+${this.format(-upkeep)} budget/sec`, tone: 'good' } : null,
      rate ? { text: `${problemName(program.problem)} ${this.rate(rate)}%/sec`, tone: rate > 0 ? 'good' : 'bad' } : null,
      program.integrity ? { text: `Integrity ${this.rate(program.integrity)}/sec`, tone: program.integrity > 0 ? 'good' : 'bad' } : null,
      program.slots ? { text: `${program.slots} server ${program.slots === 1 ? 'slot' : 'slots'}`, tone: '' } : null,
      program.lawsuitMultiplier ? { text: `Lawsuits ×${program.lawsuitMultiplier}`, tone: 'bad' } : null
    ].filter(term => term !== null);
  }

  /** Per-second rates: 0.005 → "+0.005", -0.1 → "−0.1". */
  protected rate(value: number): string {
    const text = String(Math.abs(value));
    return value > 0 ? `+${text}` : value < 0 ? `−${text}` : '±0';
  }

  /** 50 → "+50", -50 → "−50", 0 → "±0". */
  protected signed(value: number): string {
    return value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '±0';
  }

  protected format(value: number): string {
    return value.toLocaleString('en-US');
  }

  /** 20 → "20s", 120 → "2 min", 90 → "1:30 min". */
  protected duration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const rest = seconds % 60;
    return rest ? `${Math.floor(seconds / 60)}:${String(rest).padStart(2, '0')} min` : `${seconds / 60} min`;
  }

  /** Time until a problem is solved: "solved", "≈ 12 min", "≈ 3 h", or "" when it does not move. */
  protected eta(seconds: number | null): string {
    if (seconds === null) return '';
    if (seconds === 0) return 'solved';
    if (seconds < 60) return '≈ 1 min';
    const minutes = Math.round(seconds / 60);
    return minutes < 120 ? `≈ ${minutes} min` : `≈ ${Math.round(minutes / 60)} h`;
  }

  /** 75 → "1:15". */
  protected clock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
}
