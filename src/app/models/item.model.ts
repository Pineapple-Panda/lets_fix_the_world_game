export interface Item {
  id: string;
  type: 'task' | 'story' | 'bug';
  title: string;
  detail: string;
  required: number;
  parent?: string;
  progress: number;
  done: boolean;
  inTest: boolean;
}
