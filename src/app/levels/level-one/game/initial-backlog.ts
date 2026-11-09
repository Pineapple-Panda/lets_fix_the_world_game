/** A task in the backlog; `unlockAt` is the number of total coding actions (TCA) it needs to appear. */
export interface TaskTemplate {
  title: string;
  detail: string;
  required: number;
  unlockAt: number;
}

/**
 * The first release (the MVP), in the order a real team would tackle it:
 * discovery first, then the technical foundation, then accounts, then the core features.
 */
export const initialBacklog: TaskTemplate[] = [
  // Discovery: talk to people before writing code.
  { title: 'Interview NGOs and field teams', detail: 'Find out what people on the ground actually need, not what would look cool in a pitch deck.', required: 10, unlockAt: 0 },
  { title: 'Write the product vision', detail: 'One page, no buzzwords. Okay, “impact” may appear twice.', required: 10, unlockAt: 0 },
  { title: 'Sketch the evidence data model', detail: 'Define reports, sources, documents and the people behind them.', required: 10, unlockAt: 0 },
  { title: 'Draft the review workflow', detail: 'From “submitted” to “verified” to “acted upon”, plus the inevitable “needs more info”.', required: 10, unlockAt: 0 },
  { title: 'Wireframe the core screens', detail: 'Boxes and arrows on a whiteboard, photographed at a terrible angle.', required: 10, unlockAt: 0 },
  // Foundation: the boring bits everything else stands on.
  { title: 'Set up the repository and CI', detail: 'Linting, tests and a pipeline that is green at least once.', required: 15, unlockAt: 50 },
  { title: 'Scaffold the frontend', detail: 'Pick a framework and resist the urge to rewrite it next week.', required: 15, unlockAt: 50 },
  { title: 'Scaffold the API server', detail: 'The health check returns 200. Enjoy this moment of pure joy.', required: 15, unlockAt: 50 },
  { title: 'Provision the database', detail: 'Schema migrations, seed data and a backup you will forget exists.', required: 15, unlockAt: 50 },
  // Accounts: nobody gets in without them.
  { title: 'Implement sign-up and login', detail: 'Hash the passwords, issue sessions and immediately need “forgot password”.', required: 20, unlockAt: 110 },
  { title: 'Add roles and permissions', detail: 'Reporters submit, reviewers verify, admins regret making everyone an admin.', required: 20, unlockAt: 110 },
  // Core features: the reason the platform exists.
  { title: 'Build report submission', detail: 'A form for evidence with attachments, location and source.', required: 25, unlockAt: 150 },
  { title: 'Store uploaded documents', detail: 'Put files in object storage and scan them for malware first.', required: 25, unlockAt: 150 },
  { title: 'Build the review queue', detail: 'Reviewers pick up reports, check the sources and make a call.', required: 30, unlockAt: 150 },
  { title: 'Build the evidence browser', detail: 'Search, filter and open documents without a degree in library science.', required: 30, unlockAt: 150 }
];
