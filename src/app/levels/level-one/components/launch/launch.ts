import { Component, input, output } from '@angular/core';
import { FactsListComponent } from '../../../../shared/components/facts-list';
import { ModalDialog } from '../../../../shared/components/modal-dialog';
import type { Fact } from '../../../../shared/models/shared.model';

/**
 * Modal shown once Earl reaches 100% coverage: a few numbers about level 1, then the only way out is launching the
 * application.
 */
@Component({
  selector: 'app-launch',
  imports: [FactsListComponent],
  template: `
    <dialog #dialog class="intro-dialog launch-dialog" aria-labelledby="launch-title" (cancel)="$event.preventDefault()">
      <h1 id="launch-title">Ready to launch</h1>
      <dl appFactsList [facts]="facts()"></dl>
      @if (nextLevelEnabled()) {
        <button class="intro-button launch-button" type="button" autofocus aria-describedby="launch-next" (click)="launch()">Launch</button>
        <p id="launch-next" class="launch-next">Continue to Level 2</p>
      } @else {
        <p class="victory-teaser launch-next">The launch is coming soon. Thanks for playing!</p>
      }
    </dialog>
  `
})
export class LaunchComponent extends ModalDialog {
  /** How level 1 went: time, version, deployments, bugs and so on. */
  readonly facts = input<Fact[]>([]);
  /** False while level 2 is disabled in the game config: the dialog then ends the game here. */
  readonly nextLevelEnabled = input(true);
  readonly launched = output<void>();

  launch(): void {
    this.close();
    this.launched.emit();
  }
}
