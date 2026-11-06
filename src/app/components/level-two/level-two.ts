import { Component, computed, input, output } from '@angular/core';
import { epics } from '../../game/launched-content';
import {
  addedServers, addServerPerk, addServerPerkId, budgetInterval, budgetPerAction, canStartEpic, launchedPerkUnlocked,
  openLaunchedPerks, runningEpics, serverLoad, serverOnline
} from '../../game/launched';
import { launchedPerks } from '../../game/launched-content';
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
      epics: epics.map(epic => {
        const entry = state.epics.find(candidate => candidate.id === epic.id);
        return {
          epic,
          progress: entry ? Math.min(entry.progress, epic.duration) : 0,
          status: entry ? (entry.done ? 'done' : 'running') : 'open',
          canStart: canStartEpic(state, epic.id)
        };
      })
    };
  });

  protected format(value: number): string {
    return value.toLocaleString('en-US');
  }
}
