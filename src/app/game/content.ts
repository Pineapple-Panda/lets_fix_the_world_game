import type { Item } from '../models/item.model.ts';
import { initialBacklog } from './initial-backlog.ts';

/** A task of a later release; `required` is its coding effort. */
export interface RoadmapTask {
  title: string;
  detail: string;
  required: number;
}

/**
 * The product roadmap after the MVP, in a realistic order. Releases work through it from top to
 * bottom; each release takes the next 3–25 entries.
 */
export const roadmap: RoadmapTask[] = [
  // Collaboration on reports
  { title: 'Add comments on reports', detail: 'Let reviewers discuss evidence without 40-message email threads.', required: 25 },
  { title: 'Send email notifications', detail: 'Tell people when a report needs them. Respect the unsubscribe link.', required: 25 },
  { title: 'Build the notification inbox', detail: 'One place for all updates, with a satisfying “mark all as read”.', required: 20 },
  { title: 'Record an audit trail', detail: 'Who changed what and when. Accountability starts at home.', required: 30 },
  { title: 'Version every document', detail: 'Keep each revision, so nobody can quietly rewrite history.', required: 30 },
  { title: 'Detect duplicate reports', detail: 'The same video forwarded 400 times should count as one report.', required: 35 },
  { title: 'Tag reports by cause', detail: 'War, hunger, poverty, corruption, climate and the inevitable “other”.', required: 20 },
  { title: 'Add full-text search', detail: 'Index documents so results arrive before the coffee gets cold.', required: 40 },
  { title: 'Show reports on a map', detail: 'Plot verified reports so patterns become visible at a glance.', required: 40 },
  { title: 'Build the coordinator dashboard', detail: 'Open reviews, response times and blockers in one view.', required: 35 },
  // Security and privacy
  { title: 'Add two-factor authentication', detail: 'One-time codes for everyone, especially for the people who said “I don’t need it”.', required: 25 },
  { title: 'Encrypt sensitive data at rest', detail: 'Encrypt personal data and rotate the keys before someone asks how.', required: 30 },
  { title: 'Anonymise whistleblower submissions', detail: 'Strip metadata so sources stay safe. This one really matters.', required: 40 },
  { title: 'Run a GDPR review', detail: 'Retention rules, deletion requests and a privacy policy written by an actual human.', required: 20 },
  { title: 'Commission a penetration test', detail: 'Pay someone to break in before someone else does it for free.', required: 25 },
  { title: 'Fix the pentest findings', detail: 'Turns out “admin/admin” on staging counts as a finding.', required: 40 },
  // From evidence to action
  { title: 'Invite partner organisations', detail: 'Let NGOs onboard their teams without sending spreadsheets around.', required: 30 },
  { title: 'Add shared workspaces', detail: 'Each organisation gets its own space with its own people and permissions.', required: 35 },
  { title: 'Assign actions to responders', detail: 'Turn verified reports into actions with an owner and a deadline.', required: 25 },
  { title: 'Track actions to completion', detail: 'Follow up until the action is done, not until everyone forgot about it.', required: 30 },
  { title: 'Link evidence to outcomes', detail: 'Show which reports led to real change. Funders will love this chart.', required: 35 },
  // Reach more people
  { title: 'Translate the interface', detail: 'Extract all strings, add languages and discover that every button breaks in German.', required: 30 },
  { title: 'Make every screen accessible', detail: 'Fix contrast, focus order and screen reader labels across the app.', required: 35 },
  { title: 'Ship a mobile-friendly layout', detail: 'Most reporters are on a phone with a cracked screen and 2% battery.', required: 35 },
  { title: 'Support offline reporting', detail: 'Queue reports on the device until the connection comes back.', required: 45 },
  { title: 'Accept reports via SMS', detail: 'Not everyone has a smartphone, but almost everyone can send an SMS.', required: 40 },
  { title: 'Import data from partners', detail: 'Map CSV exports from five different tools onto one data model. Good luck.', required: 35 },
  { title: 'Export reports as PDF', detail: 'Because the ministry only accepts printed paper.', required: 20 },
  { title: 'Publish an open data API', detail: 'Read-only endpoints with API keys, rate limits and documentation.', required: 40 },
  // Scale and operations
  { title: 'Add structured logging', detail: 'Log requests with correlation ids instead of console.log("here").', required: 20 },
  { title: 'Set up error monitoring', detail: 'Get alerted about exceptions before users tweet about them.', required: 20 },
  { title: 'Add uptime alerts', detail: 'Get paged at 3 a.m. so the users do not have to tell you.', required: 15 },
  { title: 'Automate database backups', detail: 'And actually test a restore. Untested backups are just hope.', required: 20 },
  { title: 'Load-test the platform', detail: 'Simulate a news headline sending 100,000 visitors at once.', required: 30 },
  { title: 'Cache hot queries', detail: 'The dashboard should not run the same query 600 times a minute.', required: 30 },
  { title: 'Move file processing to a queue', detail: 'Virus scans and thumbnails run in the background, not in the request.', required: 35 },
  { title: 'Set up a staging environment', detail: 'A place to break things that is not production.', required: 25 },
  { title: 'Introduce feature flags', detail: 'Ship code dark and switch features on when they are ready.', required: 25 },
  { title: 'Autoscale the API', detail: 'Add servers when traffic spikes and remove them before the invoice does.', required: 35 },
  // Launch
  { title: 'Write the user guide', detail: 'Explain the platform in words a tired field worker understands at midnight.', required: 20 },
  { title: 'Build onboarding for new reporters', detail: 'A short guided tour instead of a 40-page PDF.', required: 25 },
  { title: 'Run usability tests with field teams', detail: 'Watch real people use the app and try very hard not to explain it.', required: 25 },
  { title: 'Redesign the landing page', detail: 'Third time is the charm.', required: 20 },
  { title: 'Publish a transparency report', detail: 'Show who funds the platform, what data it keeps and who asked for it.', required: 30 },
  { title: 'Prepare the launch announcement', detail: 'Press kit, blog post and a demo that definitely works on stage.', required: 15 }
];

/**
 * Everyday maintenance. Once the roadmap is used up, releases are filled from this pool at random,
 * so the game can go on forever.
 */
export const maintenanceTasks: RoadmapTask[] = [
  { title: 'Upgrade outdated dependencies', detail: 'npm audit found 3 critical issues and 127 opinions.', required: 25 },
  { title: 'Refactor the legacy report module', detail: 'It is only two releases old, but it is already legacy.', required: 40 },
  { title: 'Pay down tech debt', detail: 'Resolve the TODOs that are older than the intern.', required: 35 },
  { title: 'Rotate secrets', detail: 'Replace API keys and passwords, including the one in the README.', required: 15 },
  { title: 'Fix flaky tests', detail: 'They pass on the second try. That is not a fix.', required: 25 },
  { title: 'Clean up feature flags', detail: 'Delete flags that have been “temporary” since launch.', required: 15 },
  { title: 'Shrink the frontend bundle', detail: 'The app loads three date libraries. Pick one.', required: 25 },
  { title: 'Triage the support inbox', detail: 'Sort real bugs from “it doesn’t work” emails with no details.', required: 20 },
  { title: 'Update the documentation', detail: 'Make the docs describe the app that actually exists.', required: 15 },
  { title: 'Review access permissions', detail: 'Remove accounts of people who left the project two years ago.', required: 15 },
  { title: 'Rename things properly', detail: 'There are only two hard things in computer science, and this is one of them.', required: 10 },
  { title: 'Reduce cloud costs', detail: 'Find the forgotten test cluster that has been running since spring.', required: 25 },
  { title: 'Improve slow pages', detail: 'Profile the slowest screens and stop loading everything up front.', required: 30 },
  { title: 'Patch the security advisory', detail: 'A library you have never heard of has a CVE with a logo and a website.', required: 20 },
  { title: 'Hold a retrospective', detail: 'Talk about what went wrong, then write action items nobody will read.', required: 10 }
];

/** Bounds for the random number of tasks in each release after the first. */
export const minReleaseTasks = 3;
export const maxReleaseTasks = 25;

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
    task: 'T-03',
    title: 'Reports lose their source',
    detail: 'Saving a report drops the source field. Fix the model before a journalist notices.'
  },
  {
    task: 'T-04',
    title: 'Reports stuck in “needs more info”',
    detail: 'The workflow has no way back from “needs more info”. Add the missing transition.'
  },
  {
    task: 'T-06',
    title: 'CI is red on main',
    detail: 'Someone pushed on a Friday afternoon. Get the pipeline green again.'
  },
  {
    task: 'T-07',
    title: 'Frontend cannot reach the API',
    detail: 'CORS says no. Configure the frontend and the API so they can talk to each other.'
  },
  {
    task: 'T-08',
    title: 'API crashes on startup',
    detail: 'A missing environment variable takes the whole server down. Fail gracefully and document it.'
  },
  {
    task: 'T-09',
    title: 'Database migration fails',
    detail: 'Migration 0007 only works on one laptop. Make it reproducible.'
  },
  {
    task: 'T-10',
    title: 'Login rejects valid passwords',
    detail: 'Fix the hash comparison so valid credentials create a session again.'
  },
  {
    task: 'T-11',
    title: 'Reporters can approve their own reports',
    detail: 'The review endpoint forgot to check permissions. Close the loophole.'
  },
  {
    task: 'T-12',
    title: 'Uploads over 10 MB fail silently',
    detail: 'Raise the limit and show a helpful error instead of an endless spinner.'
  },
  {
    task: 'T-13',
    title: 'Uploaded PDFs show up empty',
    detail: 'Store files with the right content type so documents render again.'
  },
  {
    task: 'T-14',
    title: 'Two reviewers approve the same report',
    detail: 'Lock a report while someone is reviewing it.'
  },
  {
    task: 'T-15',
    title: 'Search ignores accents',
    detail: 'Normalise text so “São Paulo” also finds “Sao Paulo”.'
  }
];
