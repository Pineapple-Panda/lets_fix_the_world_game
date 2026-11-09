import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { duelStep } from '../../game/utopia';
import { duelRules, megaCorpName } from '../../game/utopia-content';
import type { Duel } from '../../models/utopia.model';

/**
 * A duel against MegaCorp: a bar starts at 50%, every click pushes it up, time drains it. At 100% you win, at 0%
 * you lose. The bar runs here in small steps; only the result goes back to the game.
 */
@Component({
  selector: 'app-duel-dialog',
  template: `
    <dialog #dialog class="intro-dialog duel-dialog" aria-labelledby="duel-title" (cancel)="$event.preventDefault()">
      <h1 id="duel-title">{{ duel().startedBy === 'megacorp' ? megaCorpName + ' challenges you!' : 'You challenge ' + megaCorpName + '!' }}</h1>
      <p>Push the bar to 100% before it drains to 0%. Win: every corporation loses {{ rules.winPowerLoss }}% power.
        Lose: {{ rules.lossCredibility }} credibility.</p>
      <div class="duel-bar" role="meter" aria-label="Duel" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="bar()">
        <div class="duel-fill" [class.low]="bar() < 25" [class.high]="bar() > 75" [style.width.%]="bar()"></div>
        <span class="duel-value">{{ bar().toFixed(1) }}%</span>
      </div>
      @if (duel().result; as result) {
        <p class="duel-result" [class.won]="result === 'won'" role="status">
          {{ result === 'won' ? 'You won! ' + megaCorpName + ' loses power.' : 'You lost. Your credibility takes the hit.' }}
        </p>
        <button class="intro-button" type="button" autofocus (click)="closed.emit()">Close</button>
      } @else {
        <button class="intro-button duel-push" type="button" autofocus (click)="push()">Push back! (+{{ clickGain() }}%)</button>
        @for (boost of boosts(); track boost.id) {
          <button class="intro-button duel-boost" type="button" [disabled]="!!boost.blocker" (click)="boosted.emit(boost.id)">
            {{ boost.name }}<small>{{ boost.blocker ?? boost.summary }}</small>
          </button>
        }
      }
    </dialog>
  `
})
export class DuelDialogComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly duel = input.required<Duel>();
  /** Points one push moves the bar right now. */
  readonly clickGain = input(duelRules.clickGain);
  /** Your boost moves (Battle Cry) with what they do, or why they are not ready. */
  readonly boosts = input<{ id: string; name: string; summary: string; blocker: string | null }[]>([]);
  readonly boosted = output<string>();
  readonly finished = output<boolean>();
  readonly closed = output<void>();

  protected readonly rules = duelRules;
  protected readonly megaCorpName = megaCorpName;
  protected readonly bar = signal(duelRules.start);

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
    const timer = setInterval(() => this.step(0, duelRules.stepMs / 1000), duelRules.stepMs);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected push(): void {
    this.step(1, 0);
  }

  private step(clicks: number, seconds: number): void {
    if (this.duel().result) return;
    const next = duelStep(this.bar(), clicks, seconds, this.clickGain());
    this.bar.set(next.bar);
    if (next.result) this.finished.emit(next.result === 'won');
  }
}
