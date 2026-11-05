export interface Item {
  id: string;
  type: 'task' | 'bug';
  title: string;
  detail: string;
  required: number;
  /** Total coding actions needed before this task becomes available (first release only). */
  unlockAt?: number;
  progress: number;
  done: boolean;
  inTest: boolean;
}
