import type { Item } from '../models/item.model.ts';
import { initialBacklog } from './initial-backlog.ts';

/** Tasks of every release after the first; all of them are available as soon as the release starts. */
export const releaseTasks = [
  { title: 'Make evidence searchable', detail: 'Index document text and metadata for efficient queries.' },
  { title: 'Build a search people can use', detail: 'Let people enter search terms and review matching documents.' },
  { title: 'Define who can do what', detail: 'Assign roles and permissions to document operations.' },
  { title: 'Check access before every change', detail: 'Enforce permissions before serving or modifying documents.' },
  { title: 'Save each document revision', detail: 'Store a revision whenever a document changes.' },
  { title: 'Let reviewers explore earlier versions', detail: 'List earlier revisions and let people inspect them.' },
  { title: 'Record who changed what', detail: 'Capture the actor, action and time for document changes.' },
  { title: 'Open the activity record', detail: 'Show document activity in a searchable audit view.' },
  { title: 'Send updates about document activity', detail: 'Create notifications for relevant document events.' },
  { title: 'Build an inbox for updates', detail: 'List notifications and let people mark them as read.' }
];

/** Coding effort of each task in later releases. */
export const releaseTaskRequired = 30;

export function taskId(number: number): string {
  return `T-${String(number).padStart(2, '0')}`;
}

/** The items of a fresh game: the first release. */
export const blueprint: Omit<Item, 'progress' | 'done' | 'inTest'>[] = initialBacklog.map((task, index) => ({
  id: taskId(index + 1),
  type: 'task' as const,
  title: task.title,
  detail: task.detail,
  required: task.required,
  unlockAt: task.unlockAt
}));

/** Bugs belong to a task of the first release and can only appear once that task is done (or shipped). */
export const bugTemplates = [
  {
    task: 'T-01',
    title: 'Evidence records lose required fields',
    detail: 'Fix the evidence model so mandatory fields are kept when records are saved.'
  },
  {
    task: 'T-03',
    title: 'Review states contradict each other',
    detail: 'Fix the review path so every document state has a valid next step.'
  },
  {
    task: 'T-06',
    title: 'Frontend configuration is incorrect',
    detail: 'Fix the frontend development configuration so it can reach the backend.'
  },
  {
    task: 'T-07',
    title: 'Server API fails to start',
    detail: 'Fix the backend server configuration so its API entry point starts correctly.'
  },
  {
    task: 'T-08',
    title: 'Database connection fails',
    detail: 'Fix the backend database connection so the application can access its schema.'
  },
  {
    task: 'T-10',
    title: 'Login rejects valid credentials',
    detail: 'Fix the login service so valid credentials create an authenticated session.'
  },
  {
    task: 'T-11',
    title: 'Login screen hides sign-in errors',
    detail: 'Show authentication errors on the login screen when sign-in fails.'
  },
  {
    task: 'T-12',
    title: 'Document workflow transition fails',
    detail: 'Fix the workflow engine so documents can move between their configured states.'
  },
  {
    task: 'T-14',
    title: 'Document preview is missing',
    detail: 'Fix the document browser preview so it displays the selected document contents.'
  },
  {
    task: 'T-15',
    title: 'File explorer omits folders',
    detail: 'Fix the document browser file explorer so users can navigate folders.'
  }
];
