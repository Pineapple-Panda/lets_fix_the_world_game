import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';

/** A few facts about how the level was played, shown when every world problem is solved. */
export interface VictorySummary {
  facts: { label: string; value: string }[];
  /** One line about the player's conscience. */
  verdict: string;
}

/** Modal shown once all five world problems reach 100%. */
@Component({
  selector: 'app-victory',
  template: `
    <dialog #dialog class="intro-dialog victory-dialog" aria-labelledby="victory-title" aria-describedby="victory-text"
            (close)="dismissed.emit()">
      <h1 id="victory-title">You fixed the world 🌍</h1>
      <p id="victory-text">Congratulations: climate, war, hunger, poverty and corruption are solved. Every single one.</p>
      <dl class="victory-facts">
        @for (fact of summary().facts; track fact.label) {
          <div><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
        }
      </dl>
      <p class="victory-verdict">{{ summary().verdict }}</p>
      <p class="victory-teaser">Level 3 is on its way. Something big is brewing.</p>
      <div class="victory-actions">
        <button class="intro-button" type="button" autofocus (click)="close()">Enjoy the view</button>
        <button class="intro-button event-decline" type="button" (click)="restartLevelOne.emit()">
          Restart at Level 1<small>Start with 10,000 TCA</small>
        </button>
        <button class="intro-button event-decline" type="button" (click)="restartLevelTwo.emit()">
          Restart at Level 2<small>Start with 10,000,000 TCA and 20,000,000 budget</small>
        </button>
      </div>
    </dialog>
  `
})
export class VictoryComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly summary = input.required<VictorySummary>();
  readonly dismissed = output<void>();
  /** A new run: the dialog disappears with the old game, so it is not closed (closing would mark the new run as seen). */
  readonly restartLevelOne = output<void>();
  readonly restartLevelTwo = output<void>();

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
