import { afterNextRender, Component, ElementRef, output, viewChild } from '@angular/core';

/** Level 3 is won: every utopia bar reached 100%. */
@Component({
  selector: 'app-utopia-won',
  template: `
    <dialog #dialog class="intro-dialog" aria-labelledby="utopia-won-title" aria-describedby="utopia-won-text" (close)="dismissed.emit()">
      <h1 id="utopia-won-title">Utopia achieved 🌱</h1>
      <p id="utopia-won-text">Everyone has work worth doing, a home and enough to eat. MegaCorp is writing an angry press release.
        Nobody reads it.</p>
      <button class="intro-button" type="button" autofocus (click)="close()">Enjoy the view</button>
    </dialog>
  `
})
export class UtopiaWonComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly dismissed = output<void>();

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
