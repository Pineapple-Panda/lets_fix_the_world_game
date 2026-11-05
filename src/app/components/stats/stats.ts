import { Component, input } from '@angular/core';
import type { GameStats } from '../../models/stats.model';

@Component({
  selector: 'app-stats',
  template: `
    <section class="stats" aria-label="Sprint statistics">
      <div><span>CODING ACTIONS</span><strong id="actions">{{ stats().actions }}</strong><small>Total
        output</small></div>
      <div><span>COMPLETED</span><strong id="completed">{{ stats().completed }} <em>/ {{ stats().total }}</em></strong><small>Work
        items shipped</small></div>
      <div><span>AUTOMATION</span><strong id="automation">{{ stats().automationRate }} <em>/ sec</em></strong><small>Current
        output</small></div>
      <div><span>OPEN BUGS</span><strong id="bugs">{{ stats().openBugs }}</strong><small
        id="bug-status">{{ stats().openBugs ? 'Needs your attention' : 'All clear' }}</small></div>
      <div class="budget"><span>BUDGET</span><strong id="budget">{{ stats().budget }}</strong><small>Earned by deploying</small></div>
    </section>
  `
})
export class StatsComponent {
  readonly stats = input.required<GameStats>();
}
