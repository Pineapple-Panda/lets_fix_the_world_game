import { Component, input, output } from '@angular/core';
import { FactsListComponent } from '../../../../shared/components/facts-list';
import { ModalDialog } from '../../../../shared/components/modal-dialog';
import type { Fact } from '../../../../shared/models/shared.model';

/** Modal after a won battle of level 3: what the win paid and who comes next. The only way on is the next battle. */
@Component({
  selector: 'app-battle-won',
  imports: [FactsListComponent],
  template: `
    <dialog #dialog class="intro-dialog launch-dialog battle-won-dialog" aria-labelledby="battle-won-title" (cancel)="$event.preventDefault()">
      <h1 id="battle-won-title">YOU WON</h1>
      <dl appFactsList [facts]="facts()"></dl>
      <button class="intro-button launch-button" type="button" autofocus (click)="next()">Next battle</button>
    </dialog>
  `
})
export class BattleWonComponent extends ModalDialog {
  /** The beaten corporation, the reward, your credibility and the next opponent. */
  readonly facts = input<Fact[]>([]);
  readonly nextBattle = output<void>();

  next(): void {
    this.close();
    this.nextBattle.emit();
  }
}
