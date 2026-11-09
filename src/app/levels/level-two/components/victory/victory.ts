import { Component, input, output } from '@angular/core';
import { FactsListComponent } from '../../../../shared/components/facts-list';
import { ModalDialog } from '../../../../shared/components/modal-dialog';
import type { Fact } from '../../../../shared/models/shared.model';
import type { GameConfig } from '../../../../game.config';

/** A few facts about how the level was played, shown when every world problem is solved. */
export interface VictorySummary {
  facts: Fact[];
  /** One line about the player's conscience. */
  verdict: string;
}

/** Modal shown once all five world problems reach 100%. */
@Component({
  selector: 'app-victory',
  imports: [FactsListComponent],
  template: `
    <dialog #dialog class="intro-dialog victory-dialog" aria-labelledby="victory-title" aria-describedby="victory-text"
            (close)="dismissed.emit()">
      <h1 id="victory-title">You fixed the world 🌍</h1>
      <p id="victory-text">Congratulations: climate, war, hunger, poverty and corruption are solved. Every single one.</p>
      <dl appFactsList [facts]="summary().facts"></dl>
      <p class="victory-verdict">{{ summary().verdict }}</p>
      @if (levels().levelThreeEnabled) {
        <p class="victory-teaser">But a fixed world is bad for business. Somebody is about to fight back.</p>
      }
      <div class="victory-actions">
        @if (levels().levelThreeEnabled) {
          <button class="intro-button" type="button" autofocus (click)="startLevelThree.emit()">
            Continue to Level 3<small>Build a utopia. MegaCorp will not like it.</small>
          </button>
        }
        <button class="intro-button event-decline" type="button" (click)="close()">Enjoy the view</button>
        @if (levels().levelOneEnabled) {
          <button class="intro-button event-decline" type="button" (click)="restartLevelOne.emit()">
            Restart at Level 1<small>Start with 10,000 TCA</small>
          </button>
        }
        @if (levels().levelTwoEnabled) {
          <button class="intro-button event-decline" type="button" (click)="restartLevelTwo.emit()">
            Restart at Level 2<small>Start with 10,000,000 TCA and 20,000,000 budget</small>
          </button>
        }
      </div>
    </dialog>
  `
})
export class VictoryComponent extends ModalDialog {
  readonly summary = input.required<VictorySummary>();
  /** Which levels can be played: buttons for disabled levels are hidden. */
  readonly levels = input.required<GameConfig>();
  readonly dismissed = output<void>();
  /** A new run: the dialog disappears with the old game, so it is not closed (closing would mark the new run as seen). */
  readonly restartLevelOne = output<void>();
  readonly restartLevelTwo = output<void>();
  readonly startLevelThree = output<void>();
}
