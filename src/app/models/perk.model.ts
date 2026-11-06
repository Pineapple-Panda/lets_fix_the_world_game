export type PerkId =
  | 'stack-overflow'
  | 'build-pipeline'
  | 'code-assistant'
  | 'multi-agent'
  | 'ram-upgrade'
  | 'ai-subscription'
  | 'auto-assigner'
  | 'bug-fix-agent'
  | 'earl'
  | 'testing-skills'
  | 'auto-testing'
  | 'ai-testing-subscription'
  | 'auto-deploy';

export interface Perk {
  id: PerkId;
  name: string;
  description: string;
  icon: string;
  kind: 'simple' | 'upgradeable';
  rate?: number;
  actionsRequired: number;
}

export const perks: Perk[] = [
  {
    id: 'stack-overflow',
    name: 'Stack Overflow',
    description: 'Copy-paste code snippets straight from the internet. What could possibly go wrong?',
    icon: '{}',
    kind: 'simple',
    rate: 1,
    actionsRequired: 50
  },
  {
    id: 'build-pipeline',
    name: 'CI Pipeline',
    description: 'Let the pipeline build, lint and package everything you can barely be bothered with.',
    icon: '↗',
    kind: 'simple',
    rate: 1,
    actionsRequired: 200
  },
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    description: 'Ask a chatbot vague questions and get code that is either sloppy or wildly over-engineered.',
    icon: '✳',
    kind: 'upgradeable',
    actionsRequired: 700
  },
  {
    id: 'multi-agent',
    name: 'Multi-Agent Mode',
    description: 'Assign each assistant to its own task.',
    icon: '+',
    kind: 'simple',
    actionsRequired: 1000
  },
  {
    id: 'ram-upgrade',
    name: 'Sell an Organ for More RAM',
    description: 'Get enough memory to keep your IDE, Docker and 40 browser tabs running at once.',
    icon: '▣',
    kind: 'simple',
    rate: 2,
    actionsRequired: 2000
  },
  {
    id: 'ai-subscription',
    name: 'AI Pro Plan',
    description: 'Double the output of every assistant.',
    icon: 'AI',
    kind: 'simple',
    actionsRequired: 4000
  },
  {
    id: 'auto-assigner',
    name: 'Auto-Assigner',
    description: 'Automatically assign idle assistants to open tasks (requires Multi-Agent Mode).',
    icon: 'A+',
    kind: 'simple',
    actionsRequired: 6000
  },
  {
    id: 'bug-fix-agent',
    name: 'Bug-Fix Agent',
    description: 'Automatically fix the oldest open bug at 1 action/sec.',
    icon: 'B+',
    kind: 'simple',
    actionsRequired: 10000
  },
  {
    id: 'earl',
    name: 'Install Earl',
    description: 'Set up Earl, an automated test suite: finished work runs through IN TEST before it ships.',
    icon: 'E',
    kind: 'upgradeable',
    actionsRequired: 17000
  },
  {
    id: 'testing-skills',
    name: 'Level Up Testing Skills',
    description: 'Each manual coverage click adds 0.005 percentage points. Unlocks manual coverage upgrades in the Earl panel.',
    icon: 'TS',
    kind: 'simple',
    actionsRequired: 20000
  },
  {
    id: 'auto-testing',
    name: 'Automate Testing',
    description: 'Earl raises coverage by 0.001 percentage points/sec on its own. Unlocks automatic coverage upgrades in the Earl panel.',
    icon: 'AT',
    kind: 'simple',
    actionsRequired: 25000
  },
  {
    id: 'ai-testing-subscription',
    name: 'AI QA Add-on',
    description: 'Every assistant fixes open bugs automatically, oldest first, before returning to its task.',
    icon: 'AB',
    kind: 'simple',
    actionsRequired: 28000
  },
  {
    id: 'auto-deploy',
    name: 'Continuous Deployment',
    description: 'Ship it! Deploy the next version automatically as soon as a release is ready.',
    icon: 'CD',
    kind: 'simple',
    actionsRequired: 32000
  }
];
