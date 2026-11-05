import type { Board } from './board.model';
import type { EarlView } from './earl-view.model';
import type { Item } from './item.model';
import type { Perk } from './perk.model';
import type { PerksView } from './perks-view.model';
import type { GameStats } from './stats.model';

export interface AppView {
  bugs: Item[];
  regressions: boolean;
  selected: Item | undefined;
  won: boolean;
  multiAgent: boolean;
  storiesDone: number;
  appVersion: string;
  releaseVersion: string;
  deploymentBudget: number;
  availablePerks: Perk[];
  waitingForBugs: ReadonlySet<string>;
  stats: GameStats;
  perks: PerksView;
  /** Earl panel state; null until Earl is installed. */
  earl: EarlView | null;
  boards: Board[];
}
