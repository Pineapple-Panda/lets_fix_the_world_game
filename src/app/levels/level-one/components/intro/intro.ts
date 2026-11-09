import { afterNextRender, Component, ElementRef, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.html'
})
export class IntroComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('intro');
  readonly dismissed = output<void>();

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
