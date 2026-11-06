import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  actionBoost, addedServers, addServerPerk, budgetBoost, budgetInterval, budgetPerAction, canRentSlot,
  canBuyTegridy, canStartEpic, clientAvailable, inProtest, integrityBlocked, programBlocker, programBoost, programFunded,
  protestChance, resistanceGrowth, robotPerk, robotPower, robotsOnSite,
  upgradeCost, epicDone, epicDuration, epicUnlocked, focusPower, goalComplete, goalEpics, launchedPerkAvailable, networkOnline,
  openLaunchedPerks, previousEpic, rentedSlots, product, productForGoal, productTitle, rentalIncome, runningEpics, serverLoad,
  serverOnline, tegridyActive, tegridyBagCost, tegridyPerk
} from '../../game/launched';
import { launchedPerks, products, programs, rentalClients, worldGoals, worldProblems } from '../../game/launched-content';
import type { LaunchedGame } from '../../models/launched.model';

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

  protected readonly view = computed(() => {
    const state = this.state();
    const fast = this.fastEpics();
    return {
      nextPayout: budgetInterval - (state.seconds % budgetInterval),
      payoutRate: Math.round(budgetPerAction * budgetBoost(state) * 10) / 10,
      openPerks: openLaunchedPerks(state).map(perk => ({
        perk,
        unlocked: launchedPerkAvailable(state, perk)
      })),
      // Top row of the grid, left to right. Each card stays locked until its product is released.
      productCards: products.map(definition => {
        const released = product(state, definition.id);
        return { definition, released, title: released ? productTitle(released) : '', panel: this.panel(state, definition.id) };
      }),
      actionBoost: Math.round((actionBoost(state) - 1) * 100),
      budgetBoost: Math.round((budgetBoost(state) - 1) * 100),
      // Every Add Server doubles the slider effect.
      focusPower: focusPower(state),
      networkOnline: networkOnline(state),
      serverOnline: serverOnline(state),
      load: Math.round(serverLoad(state) * 100),
      running: runningEpics(state),
      rented: rentedSlots(state),
      rentalIncome: rentalIncome(state),
      worldProgress: worldProblems.map(problem => ({ ...problem, value: state.worldProgress[problem.id] })),
      clients: rentalClients.map(client => ({
        client,
        rented: state.rentals.includes(client.id),
        canRent: canRentSlot(state, client.id),
        available: clientAvailable(state, client.id),
        condition: client.minIntegrity !== undefined ? `Only signs at ${client.minIntegrity}% integrity or more`
          : client.maxIntegrity !== undefined ? `Only signs at ${client.maxIntegrity}% integrity or less` : '',
        effects: (Object.entries(client.progress) as [string, number][]).map(([problem, delta]) => ({
          name: worldProblems.find(entry => entry.id === problem)?.name ?? problem,
          delta
        })),
        integrity: client.integrity
      })),
      integrity: state.integrity,
      tegridy: tegridyActive(state),
      canBuyTegridy: canBuyTegridy(state),
      tegridyBagCost,
      activePerks: [
        ...launchedPerks.filter(perk => state.perks.includes(perk.id)),
        ...(tegridyActive(state) ? [tegridyPerk] : []),
        ...(state.perks.includes(robotPerk.id)
          ? [{ ...robotPerk, description: robotPerk.description + (robotsOnSite(state) ? ' On site.' : ' Idle: EdisonX is not a client.') }]
          : []),
        // Add Server can be taken many times; show it once with its count.
        ...(addedServers(state) > 0
          ? [{ ...addServerPerk(state), name: `Add Server ×${addedServers(state)}`, description: `${state.serverSlots} server slots in total.` }]
          : [])
      ],
      slots: state.serverSlots,
      // One block per world goal that has epics: finished epics, then the next one in the chain.
      goals: worldGoals.filter(goal => goalEpics(goal.id).length).map(goal => {
        const chain = goalEpics(goal.id);
        const next = chain.find(epic => !epicDone(state, epic.id));
        const entry = next && state.epics.find(candidate => candidate.id === next.id);
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
            epic: { ...next, duration: epicDuration(next, fast) },
            progress: entry ? Math.min(entry.progress, epicDuration(next, fast)) : 0,
            running: !!entry,
            canStart: canStartEpic(state, next.id),
            // Within a system epics run one after another (Peace & Integrity: war first, then corruption).
            waitingFor: epicUnlocked(state, next.id) ? undefined : previousEpic(next.id)?.title
          }
        };
      })
    };
  });

  /** The control panel of an active product card (programs, protests, upgrade). */
  private panel(state: LaunchedGame, productId: string) {
    const released = product(state, productId);
    const cardPrograms = programs.filter(program => program.product === productId);
    if (!released?.active || !cardPrograms.length) return null;
    const problem = cardPrograms[0]!.problem;
    const boost = programBoost(state, productId);
    return {
      problemName: worldProblems.find(entry => entry.id === problem)?.name ?? problem,
      progress: state.worldProgress[problem],
      frozen: integrityBlocked(state),
      protestRisk: Math.round(protestChance(state) * 1000) / 10,
      resistanceGrowth: Math.round(resistanceGrowth(state) * 10) / 10,
      robots: robotsOnSite(state),
      robotPower,
      boostPercent: Math.round((boost - 1) * 100),
      upgradeCost: upgradeCost(state, productId),
      canUpgrade: !integrityBlocked(state) && state.budget >= upgradeCost(state, productId),
      programs: cardPrograms.map(program => {
        const running = state.programs.find(entry => entry.id === program.id);
        return {
          program,
          rate: Math.round(program.rate * boost * 100000) / 100000,
          running: !!running,
          protest: !!running && inProtest(running),
          clicksLeft: running ? Math.ceil(running.resistance) : 0,
          unfunded: !!running && !inProtest(running) && !programFunded(state, program.id),
          blocker: running ? null : programBlocker(state, program.id)
        };
      })
    };
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

  /** 75 → "1:15". */
  protected clock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
}
