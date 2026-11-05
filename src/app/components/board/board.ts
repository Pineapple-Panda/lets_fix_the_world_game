import { Component, input, output } from '@angular/core';
import type { Board } from '../../models/board.model.ts';
import type { Item } from '../../models/item.model.ts';
import { CardComponent } from '../card/card';

@Component({
  selector: 'app-board',
  imports: [CardComponent],
  templateUrl: './board.html'
})
export class BoardComponent {
  readonly boards = input.required<Board[]>();
  readonly selectedId = input.required<string | null>();
  readonly waitingForBugs = input.required<ReadonlySet<string>>();
  readonly bugCount = input.required<number>();
  readonly multiAgent = input.required<boolean>();
  readonly agentTargets = input.required<(string | null)[]>();
  readonly itemSelected = output<Item>();
  readonly agentAssigned = output<string>();
}
