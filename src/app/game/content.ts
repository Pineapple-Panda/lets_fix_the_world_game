import type { Item } from '../models/item.model.ts';
import { initialBacklog } from './initial-backlog.ts';

/**
 * Pool of tasks for every release after the first. Each release draws a random selection of
 * `minReleaseTasks`–`maxReleaseTasks` distinct tasks from it; all of them are available at once.
 */
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
  { title: 'Build an inbox for updates', detail: 'List notifications and let people mark them as read.' },
  { title: 'Translate the interface', detail: 'Extract UI strings and add translations for the most requested languages.' },
  { title: 'Make every screen accessible', detail: 'Fix contrast, focus order and screen reader labels across the app.' },
  { title: 'Ship a mobile layout', detail: 'Make the main views usable on small screens and slow connections.' },
  { title: 'Let documents work offline', detail: 'Cache recent documents so field teams can read them without a connection.' },
  { title: 'Import evidence in bulk', detail: 'Upload spreadsheets and archives and map them to evidence records.' },
  { title: 'Export reports as PDF', detail: 'Render review results into shareable, printable reports.' },
  { title: 'Publish a public API', detail: 'Expose read-only endpoints with API keys and rate limits.' },
  { title: 'Add two-factor sign-in', detail: 'Protect accounts with one-time codes from an authenticator app.' },
  { title: 'Encrypt sensitive records', detail: 'Encrypt personal data at rest and rotate the keys regularly.' },
  { title: 'Detect duplicate evidence', detail: 'Flag documents that are likely copies of existing records.' },
  { title: 'Tag evidence by topic', detail: 'Let reviewers tag records with war, hunger, poverty, corruption or climate.' },
  { title: 'Show impact on a map', detail: 'Plot reports and actions on an interactive map.' },
  { title: 'Build a dashboard for coordinators', detail: 'Summarise open reviews, response times and blockers in one view.' },
  { title: 'Speed up slow queries', detail: 'Add indexes and caching for the busiest database queries.' },
  { title: 'Add structured logging', detail: 'Log requests with correlation ids so incidents can be traced.' },
  { title: 'Set up error monitoring', detail: 'Capture frontend and backend exceptions with alerts for spikes.' },
  { title: 'Back up the database', detail: 'Schedule encrypted backups and test that restores actually work.' },
  { title: 'Upgrade outdated dependencies', detail: 'Bump libraries with known vulnerabilities and fix breaking changes.' },
  { title: 'Moderate abusive content', detail: 'Let moderators hide abusive comments and block repeat offenders.' },
  { title: 'Invite partner organisations', detail: 'Let organisations onboard their teams with shared workspaces.' }
];

/** Bounds for the random number of tasks in each release after the first. */
export const minReleaseTasks = 3;
export const maxReleaseTasks = 25;

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
