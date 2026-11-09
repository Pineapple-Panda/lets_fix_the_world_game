import { Component, input, output } from '@angular/core';
import type { Item } from '../../models/item.model.ts';

@Component({
  selector: 'app-card',
  templateUrl: './card.html'
})
export class CardComponent {
  readonly item = input.required<Item>();
  readonly selected = input.required<boolean>();
  readonly bugCount = input.required<number>();
  readonly multiAgent = input.required<boolean>();
  readonly assigned = input.required<boolean>();
  readonly hasFreeAgent = input.required<boolean>();
  readonly itemSelected = output<Item>();
  readonly agentAssigned = output<string>();
}
