import { Component, input } from '@angular/core';
import type { GameStats } from '../../models/stats.model';

@Component({
  selector: 'app-stats',
  template: `
    <section class="stats" aria-label="Sprint statistics">
      <div title="Total coding actions"><span>Actions</span><strong id="actions">{{ stats().actions }}</strong></div>
      <div title="Work items shipped"><span>Done</span><strong id="completed">{{ stats().completed }}<em>/{{ stats().total }}</em></strong></div>
      <div title="Current automated output"><span>Auto</span><strong id="automation">{{ stats().automationRate }}<em>/s</em></strong></div>
      <div [class.alarm]="stats().openBugs > 0" [attr.title]="stats().openBugs ? 'Needs your attention' : 'All clear'">
        <span>Bugs</span><strong id="bugs">{{ stats().openBugs }}</strong></div>
      <div class="budget" title="Earned by deploying"><span>Budget</span><strong id="budget">{{ stats().budget }}</strong></div>
    </section>
  `
})
export class StatsComponent {
  readonly stats = input.required<GameStats>();
}
