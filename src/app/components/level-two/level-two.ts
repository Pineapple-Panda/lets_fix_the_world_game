import { Component, computed, input, output } from '@angular/core';
import {
  actionBoost, addedServers, addServerPerk, addServerPerkId, budgetBoost, focusPower, budgetInterval, budgetPerAction, canStartEpic, epicDone, epicUnlocked,
  goalComplete, goalEpics, launchedPerkUnlocked, openLaunchedPerks, previousEpic, product, productForGoal, productTitle,
  networkOnline, runningEpics, serverLoad, serverOnline
} from '../../game/launched';
import { launchedPerks, products, worldGoals } from '../../game/launched-content';
import type { LaunchedGame } from '../../models/launched.model';

/** Level 2: a 3×2 grid of cards. The development card sits bottom centre; the others unlock over time. */
@Component({
  selector: 'app-level-two',
  templateUrl: './level-two.html'
})
export class LevelTwoComponent {
  readonly state = input.required<LaunchedGame>();
  readonly perkActivated = output<string>();
  readonly epicStarted = output<string>();
  readonly productActivated = output<string>();
  readonly focusChanged = output<number>();

  protected readonly view = computed(() => {
    const state = this.state();
    return {
      nextPayout: budgetInterval - (state.seconds % budgetInterval),
      payoutRate: Math.round(budgetPerAction * budgetBoost(state) * 10) / 10,
      activePerks: [
        ...launchedPerks.filter(perk => state.perks.includes(perk.id)),
        // Add Server can be taken many times; show it once with its count.
        ...(addedServers(state) > 0
          ? [{ ...addServerPerk(state), name: `Add Server ×${addedServers(state)}`, description: `${state.serverSlots} server slots in total.` }]
          : [])
      ],
      openPerks: openLaunchedPerks(state).map(perk => ({
        perk,
        unlocked: launchedPerkUnlocked(state, perk) && (perk.id !== addServerPerkId || serverOnline(state))
      })),
      // Top row of the grid, left to right. Each card stays locked until its product is released.
      productCards: products.map(definition => {
        const released = product(state, definition.id);
        return { definition, released, title: released ? productTitle(released) : '' };
      }),
      actionBoost: Math.round((actionBoost(state) - 1) * 100),
      budgetBoost: Math.round((budgetBoost(state) - 1) * 100),
      // Every Add Server doubles the slider effect.
      focusPower: focusPower(state),
      networkOnline: networkOnline(state),
      serverOnline: serverOnline(state),
      load: Math.round(serverLoad(state) * 100),
      running: runningEpics(state),
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
            epic: next,
            progress: entry ? Math.min(entry.progress, next.duration) : 0,
            running: !!entry,
            canStart: canStartEpic(state, next.id),
            // Within a system epics run one after another (Peace & Integrity: war first, then corruption).
            waitingFor: epicUnlocked(state, next.id) ? undefined : previousEpic(next.id)?.title
          }
        };
      })
    };
  });

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
