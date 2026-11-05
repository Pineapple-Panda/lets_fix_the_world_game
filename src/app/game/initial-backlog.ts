export const initialBacklog = [
  {
    title: 'Map the work that matters',
    detail: 'Plan a shared home for evidence and action on war, hunger, poverty, corruption and climate change.',
    tasks: [
      { title: 'Sketch the evidence model', detail: 'Define records for people, issues, documents and the fields needed to describe them.' },
      { title: 'Connect people, evidence and action', detail: 'Map how users, documents and workflow records relate to one another.' },
      { title: 'Chart a path from report to review', detail: 'Describe the states and transitions a document follows as it is reviewed.' },
      { title: 'Plan the evidence and status screens', detail: 'Outline views for browsing documents and tracking their review status.' },
      { title: 'Design forms that ask the right questions', detail: 'Specify fields and validation for entering and updating evidence.' }
    ]
  },
  {
    title: 'Lay the platform foundations',
    detail: 'Set up the application, server and database with basic protection for accounts.',
    tasks: [
      { title: 'Set up the community-facing app', detail: 'Create the frontend and configure its development environment.' },
      { title: 'Set up the platform server', detail: 'Create the backend and configure its API entry point.' },
      { title: 'Give evidence a database', detail: 'Connect the backend to a database and prepare the initial schema.' },
      { title: 'Protect the server door', detail: 'Configure backend authentication for protected requests.' }
    ]
  },
  {
    title: 'Welcome people back safely',
    detail: 'Let contributors sign in to the platform and understand when sign-in fails.',
    tasks: [
      { title: 'Check credentials and start sessions', detail: 'Validate credentials and establish an authenticated session.' },
      { title: 'Create a clear sign-in screen', detail: 'Provide credential inputs and show helpful errors when sign-in fails.' }
    ]
  },
  {
    title: 'Move evidence toward review',
    detail: 'Give documents a clear path through the review process.',
    tasks: [
      { title: 'Set up the review workflow engine', detail: 'Configure the engine to manage document states and transitions.' },
      { title: 'Build the first review pathway', detail: 'Implement the initial document workflow states and transitions.' }
    ]
  },
  {
    title: 'Put evidence within reach',
    detail: 'Help people find their way through files and inspect the documents behind a report.',
    tasks: [
      { title: 'Show the selected document', detail: 'Display the contents of a selected document in the browser.' },
      { title: 'Navigate the evidence library', detail: 'List files and folders so people can navigate and select documents.' }
    ]
  }
];
