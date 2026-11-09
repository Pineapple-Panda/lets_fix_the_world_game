import { Component, input, output } from '@angular/core';
import { ModalDialog } from '../../../../shared/components/modal-dialog';
import { FactsListComponent } from '../../../../shared/components/facts-list';
import type { LevelSummary } from '../../../../shared/models/shared.model';

/** Level 3 is won: every utopia bar reached 100%. */
@Component({
  selector: 'app-utopia-won',
  imports: [FactsListComponent],
  template: `
    <dialog #dialog class="intro-dialog" aria-labelledby="utopia-won-title" aria-describedby="utopia-won-text" (close)="dismissed.emit()">
      <h1 id="utopia-won-title">Utopia achieved 🌱</h1>
      <p id="utopia-won-text">Everyone has work worth doing, a home and enough to eat. MegaCorp is writing an angry press release.
        Nobody reads it.</p>
      <div class="final-summary">
        @for (level of summary(); track level.level) {
          <section>
            <h2>{{ level.title }}</h2>
            <dl appFactsList [facts]="level.facts"></dl>
          </section>
        }
      </div>
      <button class="intro-button" type="button" autofocus (click)="close()">Enjoy the view</button>
    </dialog>
  `
})
export class UtopiaWonComponent extends ModalDialog {
  readonly summary = input.required<LevelSummary[]>();
  readonly dismissed = output<void>();
}
