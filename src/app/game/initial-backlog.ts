/** A task in the backlog; `unlockAt` is the number of total coding actions (TCA) it needs to appear. */
export interface TaskTemplate {
  title: string;
  detail: string;
  required: number;
  unlockAt: number;
}

/** The first release: tasks unlock step by step as total coding actions grow. */
export const initialBacklog: TaskTemplate[] = [
  { title: 'Sketch the evidence model', detail: 'Define records for people, issues, documents and the fields needed to describe them.', required: 10, unlockAt: 0 },
  { title: 'Connect people, evidence and action', detail: 'Map how users, documents and workflow records relate to one another.', required: 10, unlockAt: 0 },
  { title: 'Chart a path from report to review', detail: 'Describe the states and transitions a document follows as it is reviewed.', required: 10, unlockAt: 0 },
  { title: 'Plan the evidence and status screens', detail: 'Outline views for browsing documents and tracking their review status.', required: 10, unlockAt: 0 },
  { title: 'Design forms that ask the right questions', detail: 'Specify fields and validation for entering and updating evidence.', required: 10, unlockAt: 0 },
  { title: 'Set up the community-facing app', detail: 'Create the frontend and configure its development environment.', required: 15, unlockAt: 50 },
  { title: 'Set up the platform server', detail: 'Create the backend and configure its API entry point.', required: 15, unlockAt: 50 },
  { title: 'Give evidence a database', detail: 'Connect the backend to a database and prepare the initial schema.', required: 15, unlockAt: 50 },
  { title: 'Protect the server door', detail: 'Configure backend authentication for protected requests.', required: 15, unlockAt: 50 },
  { title: 'Check credentials and start sessions', detail: 'Validate credentials and establish an authenticated session.', required: 20, unlockAt: 110 },
  { title: 'Create a clear sign-in screen', detail: 'Provide credential inputs and show helpful errors when sign-in fails.', required: 20, unlockAt: 110 },
  { title: 'Set up the review workflow engine', detail: 'Configure the engine to manage document states and transitions.', required: 25, unlockAt: 150 },
  { title: 'Build the first review pathway', detail: 'Implement the initial document workflow states and transitions.', required: 25, unlockAt: 150 },
  { title: 'Show the selected document', detail: 'Display the contents of a selected document in the browser.', required: 30, unlockAt: 150 },
  { title: 'Navigate the evidence library', detail: 'List files and folders so people can navigate and select documents.', required: 30, unlockAt: 150 }
];
