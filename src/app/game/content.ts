import type { Item } from '../models/item.model.ts';
import { initialBacklog } from './initial-backlog.ts';

export const improvements = [
  {
    title: 'Find the evidence that matters',
    detail: 'Help people locate relevant documents when researching a problem or response.',
    tasks: [
      { title: 'Make evidence searchable', detail: 'Index document text and metadata for efficient queries.' },
      { title: 'Build a search people can use', detail: 'Let people enter search terms and review matching documents.' }
    ]
  },
  {
    title: 'Keep sensitive evidence safe',
    detail: 'Give people access to documents only when their role permits it.',
    tasks: [
      { title: 'Define who can do what', detail: 'Assign roles and permissions to document operations.' },
      { title: 'Check access before every change', detail: 'Enforce permissions before serving or modifying documents.' }
    ]
  },
  {
    title: 'Remember how evidence changed',
    detail: 'Keep earlier document versions available so reviewers can follow the record.',
    tasks: [
      { title: 'Save each document revision', detail: 'Store a revision whenever a document changes.' },
      { title: 'Let reviewers explore earlier versions', detail: 'List earlier revisions and let people inspect them.' }
    ]
  },
  {
    title: 'Make the record accountable',
    detail: 'Keep a reviewable trail of document activity to support accountability.',
    tasks: [
      { title: 'Record who changed what', detail: 'Capture the actor, action and time for document changes.' },
      { title: 'Open the activity record', detail: 'Show document activity in a searchable audit view.' }
    ]
  },
  {
    title: 'Keep contributors in the loop',
    detail: 'Let people know when relevant documents need their attention.',
    tasks: [
      { title: 'Send updates about document activity', detail: 'Create notifications for relevant document events.' },
      { title: 'Build an inbox for updates', detail: 'List notifications and let people mark them as read.' }
    ]
  }
];

let taskNumber = 0;
export const blueprint: Omit<Item, 'progress' | 'done' | 'inTest'>[] = [
  ...initialBacklog.flatMap((story, index): Omit<Item, 'progress' | 'done' | 'inTest'>[] => {
    const id = `S-${String(index + 1).padStart(2, '0')}`;
    return [
      ...story.tasks.map(task => ({
        id: `T-${String(++taskNumber).padStart(2, '0')}`,
        type: 'task' as const,
        ...task,
        required: 10 + index * 5,
        parent: id
      })),
      { id, type: 'story', title: story.title, detail: story.detail, required: 0 }
    ];
  })
];

export const dependencies: Record<string, string> = {
  'S-02': 'S-01',
  'S-03': 'S-02',
  'S-04': 'S-03',
  'S-05': 'S-03'
};

export const bugTemplates = [
  {
    story: 'S-02',
    title: 'Database connection fails',
    detail: 'Fix the backend database connection so the application can access its schema.'
  },
  {
    story: 'S-02',
    title: 'Server API fails to start',
    detail: 'Fix the backend server configuration so its API entry point starts correctly.'
  },
  {
    story: 'S-02',
    title: 'Frontend configuration is incorrect',
    detail: 'Fix the frontend development configuration so it can reach the backend.'
  },
  {
    story: 'S-03',
    title: 'Login rejects valid credentials',
    detail: 'Fix the login service so valid credentials create an authenticated session.'
  },
  {
    story: 'S-03',
    title: 'Login screen hides sign-in errors',
    detail: 'Show authentication errors on the login screen when sign-in fails.'
  },
  {
    story: 'S-04',
    title: 'Document workflow transition fails',
    detail: 'Fix the workflow engine so documents can move between their configured states.'
  },
  {
    story: 'S-05',
    title: 'Document preview is missing',
    detail: 'Fix the document browser preview so it displays the selected document contents.'
  },
  {
    story: 'S-05',
    title: 'File explorer omits folders',
    detail: 'Fix the document browser file explorer so users can navigate folders.'
  }
];
