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
  { title: 'Prepare the launch announcement', detail: 'Press kit, blog post and a demo that definitely works on stage.', required: 15 },
  // After launch: the first real users have opinions
  { title: 'Fix the launch-day hotfixes', detail: 'Everything that broke while the CEO was giving an interview.', required: 30 },
  { title: 'Add a feedback button', detail: 'Collect complaints in one place instead of in everyone’s DMs.', required: 15 },
  { title: 'Introduce product analytics', detail: 'Learn which features people use, without tracking them like an ad network.', required: 25 },
  { title: 'Run the first A/B test', detail: 'Green button versus blue button. The internet will be divided.', required: 20 },
  { title: 'Add saved searches', detail: 'Let reviewers subscribe to new reports that match a query.', required: 25 },
  { title: 'Build a weekly digest email', detail: 'One summary per week instead of 300 notifications a day.', required: 20 },
  { title: 'Add bulk actions to the review queue', detail: 'Approve, reject or reassign fifty reports without fifty clicks.', required: 25 },
  { title: 'Support video evidence', detail: 'Upload, transcode and stream videos without melting the server.', required: 45 },
  { title: 'Transcribe audio reports', detail: 'Turn voice messages from the field into searchable text.', required: 40 },
  { title: 'Translate reports automatically', detail: 'Machine-translate submissions so reviewers can read every language, then double-check the important ones.', required: 35 },
  { title: 'Verify media authenticity', detail: 'Check metadata and reverse-search images to spot recycled or doctored evidence.', required: 45 },
  { title: 'Score source reliability', detail: 'Track how often a source was right, without turning it into a popularity contest.', required: 35 },
  { title: 'Add case files', detail: 'Group related reports, documents and actions into one investigation.', required: 35 },
  { title: 'Build a timeline view', detail: 'Show how a case developed day by day.', required: 30 },
  { title: 'Export evidence for courts', detail: 'Package documents with hashes and a chain of custody that lawyers accept.', required: 40 },
  // Growing up
  { title: 'Add single sign-on for partners', detail: 'Large NGOs want SAML. Nobody knows why, but they all want SAML.', required: 30 },
  { title: 'Offer a self-hosted edition', detail: 'For partners who cannot trust any cloud, including ours.', required: 45 },
  { title: 'Split the monolith (a little)', detail: 'Extract the file service. Only the file service. Step away from the Kubernetes docs.', required: 40 },
  { title: 'Replicate across regions', detail: 'Keep the platform up when an entire data centre decides to take a nap.', required: 40 },
  { title: 'Set up disaster recovery drills', detail: 'Practise restoring everything while nothing is actually on fire.', required: 25 },
  { title: 'Get a security certification', detail: 'Spend three months writing policies that describe what you already do.', required: 35 },
  { title: 'Open-source the core', detail: 'Clean up the code, pick a licence and remove the swear words from the comments.', required: 30 },
  { title: 'Launch a public bug bounty', detail: 'Invite hackers to find bugs and pay them in money instead of T-shirts.', required: 20 },
  { title: 'Build a plugin system', detail: 'Let partners extend the platform without forking it.', required: 45 },
  { title: 'Plan version 2.0', detail: 'Collect every idea that was “out of scope” and argue about it for a week.', required: 15 }
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
  { title: 'Hold a retrospective', detail: 'Talk about what went wrong, then write action items nobody will read.', required: 10 },
  { title: 'Upgrade the framework', detail: 'The new major version is out. The migration guide is 80 pages long.', required: 40 },
  { title: 'Bump the Node.js version', detail: 'The current one reaches end of life next month. Again.', required: 15 },
  { title: 'Renew the TLS certificates', detail: 'Before they expire on a Sunday night, like last time.', required: 10 },
  { title: 'Migrate off the deprecated API', detail: 'The map provider is shutting down v2. Of course it is.', required: 30 },
  { title: 'Clean up the database', detail: 'Drop the columns called “old_status_2” and “do_not_use”.', required: 25 },
  { title: 'Archive old reports', detail: 'Move closed cases to cold storage, following the retention policy.', required: 20 },
  { title: 'Handle data deletion requests', detail: 'Process the GDPR requests that piled up in the shared inbox.', required: 15 },
  { title: 'Fix the cookie banner', detail: 'It currently asks for consent on every single page.', required: 10 },
  { title: 'Improve error messages', detail: 'Replace “Something went wrong” with something that actually helps.', required: 15 },
  { title: 'Fix time zone handling', detail: 'Reports from Fiji appear to arrive from the future.', required: 25 },
  { title: 'Support right-to-left languages', detail: 'Arabic and Hebrew users deserve a layout that is not mirrored by accident.', required: 30 },
  { title: 'Fix broken links in emails', detail: 'Every link in the weekly digest points to localhost.', required: 10 },
  { title: 'Polish the dark mode', detail: 'Some icons are still black on black. Nobody noticed, which is the problem.', required: 15 },
  { title: 'Speed up the CI pipeline', detail: 'A build takes 40 minutes. Developers have started a sourdough habit.', required: 25 },
  { title: 'Add missing database indexes', detail: 'One query scans 12 million rows to show a counter.', required: 20 },
  { title: 'Reduce alert noise', detail: 'On-call got 300 alerts last week; three of them mattered.', required: 20 },
  { title: 'Write a runbook', detail: 'Document what to do when the queue backs up, so it is not just in Dave’s head.', required: 15 },
  { title: 'Practise an incident drill', detail: 'Simulate an outage and see who actually reads the pager.', required: 15 },
  { title: 'Write a post-mortem', detail: 'Explain last week’s outage honestly and without blaming the intern.', required: 10 },
  { title: 'Audit third-party scripts', detail: 'Find out why the landing page loads four analytics tools.', required: 15 },
  { title: 'Review logging for personal data', detail: 'Logs should not contain passwords, names or home addresses.', required: 20 },
  { title: 'Rebuild the search index', detail: 'Search results drifted after the last migration. Reindex everything overnight.', required: 25 },
  { title: 'Tune the spam filter', detail: 'Crypto bots keep submitting “evidence” of guaranteed returns.', required: 20 },
  { title: 'Fix the flaky upload on slow networks', detail: 'Resume uploads instead of starting from zero on every dropped connection.', required: 30 },
  { title: 'Upgrade the design system', detail: 'Three slightly different shades of blue are now officially one.', required: 25 },
  { title: 'Refresh the screenshots in the docs', detail: 'The docs still show the UI from two redesigns ago.', required: 10 },
  { title: 'Answer partner integration questions', detail: 'Explain the API to a partner for the fourth time, then improve the docs.', required: 15 },
  { title: 'Onboard a new developer', detail: 'Get the dev setup working on a fresh laptop in under a week.', required: 20 },
  { title: 'Write tests for the importer', detail: 'The CSV importer has zero tests and handles everyone’s data.', required: 25 },
  { title: 'Remove dead code', detail: 'Delete the features nobody has used since the last redesign.', required: 15 },
  { title: 'Fix accessibility regressions', detail: 'The new modal traps keyboard focus forever.', required: 20 },
  { title: 'Profile memory leaks', detail: 'The API slowly eats memory until it gets restarted every Tuesday.', required: 30 },
  { title: 'Optimise image delivery', detail: 'Serve resized images instead of 12 MB phone photos.', required: 20 },
  { title: 'Clean up the backlog', detail: 'Close tickets from 2019 that start with “quick idea:”.', required: 10 },
  { title: 'Sync with partner NGOs', detail: 'A call to make sure the roadmap still solves their actual problems.', required: 10 }
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
