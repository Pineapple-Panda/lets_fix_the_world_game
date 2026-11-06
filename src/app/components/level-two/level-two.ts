import { Component, computed, input, output } from '@angular/core';
import {
  addedServers, addServerPerk, addServerPerkId, budgetInterval, budgetPerAction, canStartEpic, epicDone, goalComplete,
  goalEpics, launchedPerkUnlocked, openLaunchedPerks, runningEpics, serverLoad, serverOnline
} from '../../game/launched';
import { launchedPerks, worldGoals } from '../../game/launched-content';
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

  protected readonly view = computed(() => {
    const state = this.state();
    return {
      nextPayout: budgetInterval - (state.seconds % budgetInterval),
      payoutRate: budgetPerAction,
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
      serverOnline: serverOnline(state),
      load: Math.round(serverLoad(state) * 100),
      running: runningEpics(state),
      slots: state.serverSlots,
      // One block per world goal that has epics: finished epics, then the next one in the chain.
      goals: worldGoals.filter(goal => goalEpics(goal.id).length).map(goal => {
        const chain = goalEpics(goal.id);
        const next = chain.find(epic => !epicDone(state, epic.id));
        const entry = next && state.epics.find(candidate => candidate.id === next.id);
        return {
          goal,
          total: chain.length,
          shipped: chain.filter(epic => epicDone(state, epic.id)),
          complete: goalComplete(state, goal.id),
          next: next && {
            epic: next,
            progress: entry ? Math.min(entry.progress, next.duration) : 0,
            running: !!entry,
            canStart: canStartEpic(state, next.id)
          }
        };
      })
    };
  });

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
