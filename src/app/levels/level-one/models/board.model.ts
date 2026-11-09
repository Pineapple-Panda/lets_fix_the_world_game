import type { Item } from './item.model.ts';

export interface BoardColumn {
  name: string;
  items: Item[];
}

export interface Board {
  name: string;
  columns: BoardColumn[];
}
