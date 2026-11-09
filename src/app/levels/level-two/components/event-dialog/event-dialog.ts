import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';
import type { SpecialEvent } from '../../models/launched.model';

/** A special event: a modal with two answers. It can only be closed by picking one. */
@Component({
  selector: 'app-event-dialog',
  template: `
    <dialog #dialog class="intro-dialog event-dialog" aria-labelledby="event-title" aria-describedby="event-text"
            (cancel)="$event.preventDefault()">
      <h1 id="event-title">{{ event().title }}</h1>
      <p id="event-text">{{ event().text }}</p>
      <div class="event-choices">
        <button class="intro-button" type="button" [disabled]="!canAccept()" (click)="answer(true)">
          {{ event().accept }}<small>{{ event().acceptEffect }}</small>
        </button>
        <button class="intro-button event-decline" type="button" (click)="answer(false)">
          {{ event().decline }}<small>{{ event().declineEffect }}</small>
        </button>
      </div>
      @if (!canAccept()) {
        <p class="event-hint">You cannot afford that right now.</p>
      }
    </dialog>
  `
})
export class EventDialogComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly event = input.required<SpecialEvent>();
  readonly canAccept = input(true);
  readonly answered = output<boolean>();

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  answer(accept: boolean): void {
    this.dialog().nativeElement.close();
    this.answered.emit(accept);
  }
}
