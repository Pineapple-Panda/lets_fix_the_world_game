import { Component, output } from '@angular/core';
import { ModalDialog } from '../../../../shared/components/modal-dialog';

/** Modal shown once Earl reaches 100% coverage; the only way out is launching the application. */
@Component({
  selector: 'app-launch',
  template: `
    <dialog #dialog class="intro-dialog" aria-labelledby="launch-title" aria-describedby="launch-text"
            (cancel)="$event.preventDefault()">
      <h1 id="launch-title">Ready for launch</h1>
      <p id="launch-text">Earl reports 100% test coverage. The platform is stable enough to go live.</p>
      <button class="intro-button" type="button" autofocus (click)="launch()">Launch Application</button>
    </dialog>
  `
})
export class LaunchComponent extends ModalDialog {
  readonly launched = output<void>();

  launch(): void {
    this.close();
    this.launched.emit();
  }
}
