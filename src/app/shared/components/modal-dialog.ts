import { afterNextRender, Directive, ElementRef, viewChild } from '@angular/core';

/**
 * Base for every modal of the game: the template holds a `<dialog #dialog>`, which opens as a modal as soon as the
 * component is rendered. Subclasses only add their inputs, outputs and template.
 */
@Directive()
export abstract class ModalDialog {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  /** Closes the modal; its `(close)` handler runs. */
  close(): void {
    this.dialog().nativeElement.close();
  }
}
