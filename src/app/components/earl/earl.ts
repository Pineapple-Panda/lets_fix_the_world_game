import { Component, input, output } from '@angular/core';
import type { EarlView } from '../../models/earl-view.model';

/** Formats coverage units (1/1000 percentage point) as percentage points. */
function points(units: number): string {
  return (units / 1000).toFixed(3);
}

@Component({
  selector: 'app-earl',
  templateUrl: './earl.html'
})
export class EarlComponent {
  readonly view = input.required<EarlView>();
  readonly coverageImproved = output<void>();
  readonly manualUpgraded = output<void>();
  readonly autoUpgraded = output<void>();

  protected readonly points = points;
}
