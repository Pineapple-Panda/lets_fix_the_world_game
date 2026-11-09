import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';
import type { LevelSummary } from '../../models/launched.model';

/** Level 3 is won: every utopia bar reached 100%. */
@Component({
  selector: 'app-utopia-won',
  template: `
    <dialog #dialog class="intro-dialog" aria-labelledby="utopia-won-title" aria-describedby="utopia-won-text" (close)="dismissed.emit()">
      <h1 id="utopia-won-title">Utopia achieved 🌱</h1>
      <p id="utopia-won-text">Everyone has work worth doing, a home and enough to eat. MegaCorp is writing an angry press release.
        Nobody reads it.</p>
      <div class="final-summary">
        @for (level of summary(); track level.level) {
          <section>
            <h2>{{ level.title }}</h2>
            <dl class="victory-facts">
              @for (fact of level.facts; track fact.label) {
                <div><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
              }
            </dl>
          </section>
        }
      </div>
      <button class="intro-button" type="button" autofocus (click)="close()">Enjoy the view</button>
    </dialog>
  `
})
export class UtopiaWonComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly summary = input.required<LevelSummary[]>();
  readonly dismissed = output<void>();

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
