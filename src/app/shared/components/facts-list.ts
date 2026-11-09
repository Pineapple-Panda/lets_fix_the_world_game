import { Component, input } from '@angular/core';
import type { Fact } from '../models/shared.model';

/** A list of labelled values, e.g. the summary of a level: `<dl appFactsList [facts]="..."></dl>`. */
@Component({
  selector: 'dl[appFactsList]',
  host: { class: 'facts-list' },
  template: `
    @for (fact of facts(); track fact.label) {
      <div><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
    }
  `
})
export class FactsListComponent {
  readonly facts = input.required<Fact[]>();
}
