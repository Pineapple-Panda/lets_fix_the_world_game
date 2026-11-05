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
    description: 'Copy and paste unsafe code snippets straight from the internet.',
    icon: '{}',
    kind: 'simple',
    rate: 1,
    actionsRequired: 50
  },
  {
    id: 'build-pipeline',
    name: 'Build Pipeline',
    description: 'Make git handle all the boring stuff you are barely able to care about.',
    icon: '↗',
    kind: 'simple',
    rate: 1,
    actionsRequired: 200
  },
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    description: 'Ask vague questions to a chatbot that generates crappy or completely overengineered code.',
    icon: '✳',
    kind: 'upgradeable',
    actionsRequired: 700
  },
  {
    id: 'multi-agent',
    name: 'Multi Agent',
    description: 'Assign assistants to different tasks.',
    icon: '+',
    kind: 'simple',
    actionsRequired: 1000
  },
  {
    id: 'ram-upgrade',
    name: 'Sell some of your organs to buy more RAM',
    description: 'Get enough memory to keep your development tools running.',
    icon: '▣',
    kind: 'simple',
    rate: 2,
    actionsRequired: 2000
  },
  {
    id: 'ai-subscription',
    name: 'Upgrade AI Subscription',
    description: 'Double every assistant’s output, including upgrades.',
    icon: 'AI',
    kind: 'simple',
    actionsRequired: 4000
  },
  {
    id: 'auto-assigner',
    name: 'Auto Assigner',
    description: 'Automatically assign idle assistants to available tasks when Multi Agent is active.',
    icon: 'A+',
    kind: 'simple',
    actionsRequired: 6000
  },
  {
    id: 'bug-fix-agent',
    name: 'Bug-fix Agent',
    description: 'Automatically fix the oldest open bug at 1 bug-fixing action / sec.',
    icon: 'B+',
    kind: 'simple',
    actionsRequired: 10000
  },
  {
    id: 'earl',
    name: 'Install Earl',
    description: 'An automated testing suite for your project.',
    icon: 'E',
    kind: 'upgradeable',
    actionsRequired: 17000
  },
  {
    id: 'testing-skills',
    name: 'Improve Testing Skills',
    description: 'Manual coverage clicks add 0.005 percentage points. Unlocks manual coverage upgrades in the Earl panel.',
    icon: 'TS',
    kind: 'simple',
    actionsRequired: 20000
  },
  {
    id: 'auto-testing',
    name: 'Automate Testing',
    description: 'Earl raises coverage by 0.001 percentage points/sec. Unlocks automatic coverage upgrades in the Earl panel.',
    icon: 'AT',
    kind: 'simple',
    actionsRequired: 25000
  },
  {
    id: 'ai-testing-subscription',
    name: 'Upgrade AI Subscription for testing',
    description: 'All assistants also fix open bugs automatically, oldest bug first.',
    icon: 'AB',
    kind: 'simple',
    actionsRequired: 28000
  },
  {
    id: 'auto-deploy',
    name: 'Continuous Deployment',
    description: 'Ship it! Automatically deploys the next version as soon as a release is ready.',
    icon: 'CD',
    kind: 'simple',
    actionsRequired: 32000
  }
];
