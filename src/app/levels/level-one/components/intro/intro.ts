import { Component, output } from '@angular/core';
import { ModalDialog } from '../../../../shared/components/modal-dialog';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.html'
})
export class IntroComponent extends ModalDialog {
  readonly dismissed = output<void>();
}
