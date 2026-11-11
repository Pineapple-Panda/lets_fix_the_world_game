/**
 * All perks of the game, one list per level. What a perk does is implemented in the level's game logic
 * (level-one/game/game.ts, level-two/game/launched.ts, level-three/game/utopia.ts); here are its name, text, icon,
 * unlock threshold (total coding actions) and price.
 */
import type { Perk } from '../../levels/level-one/models/perk.model.ts';
import type { LaunchedPerk } from '../../levels/level-two/models/launched.model.ts';
import type { UtopiaPerk } from '../../levels/level-three/models/utopia.model.ts';

/**
 * Level 1: unlocked by total coding actions, free. `kind: 'upgradeable'` perks can be upgraded with budget afterwards.
 */
export const levelOnePerks: Perk[] = [
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
    id: 'ai-max-plan',
    name: 'AI Max Plan',
    description: 'Double the output of every assistant again. Same models, bigger invoice, fewer rate limits.',
    icon: 'AX',
    kind: 'simple',
    actionsRequired: 12000
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

/**
 * Level 2: unlocked by total coding actions; some cost budget or need an active product. The Add Server perk is not
 * listed here: its price grows with every server (see `addServerPerk` in level-two/game/launched.ts). Level 1 perks
 * do not carry over.
 */
export const levelTwoPerks: LaunchedPerk[] = [
  {
    id: 'workflow-abstraction',
    name: 'Abstract the Automation Workflow',
    description: 'Wrap scripts, bots and pipelines into one orchestration layer. The board runs itself, so the server is free for epics.',
    icon: 'WF',
    actionsRequired: 35000
  },
  {
    id: 'data-centers',
    name: 'Migrate to Data Centers',
    description: 'Move the systems off the shared server into dedicated data centres. Every epic runs twice as fast, and the electricity bill grows accordingly.',
    icon: 'DC',
    actionsRequired: 80000,
    cost: 350000
  },
  {
    id: 'network-financing',
    name: 'Who Pays for All This?',
    description: 'Lovely platform. Shame about the invoice. Opens the Network & Financing desk to find partners and money.',
    icon: 'NF',
    actionsRequired: 250000
  },
  {
    id: 'pitch-deck',
    name: 'Pitch Deck Generator',
    description: 'Turns any idea into 40 slides with hockey-stick charts. Unlocks "Pitch to investors": every click brings in budget.',
    icon: 'PD',
    actionsRequired: 100000
  },
  {
    id: 'mediation-academy',
    name: 'Conflict Mediation Academy',
    description: 'Train mediators who listen first and talk second. Every Talk to the protesters click counts three times, and they calm protests on their own (−2 resistance per second).',
    icon: 'MA',
    actionsRequired: 45000000,
    cost: 1500000,
    requiresProducts: ['green-world']
  },
  {
    id: 'grant-proposals',
    name: 'Self-Writing Grant Proposals',
    description: 'An AI that writes grant applications in every language, format and level of desperation. Programs cost 50% less upkeep.',
    icon: 'GP',
    actionsRequired: 25000000,
    cost: 3000000
  },
  {
    id: 'premium-hosting',
    name: 'Premium Hosting Contracts',
    description: 'Same servers, new invoices: "enterprise-grade", "mission-critical", "carbon-aware". Clients pay ten times the rent.',
    icon: 'PH',
    actionsRequired: 30000000
  },
  {
    id: 'decent-lawyer',
    name: 'Decent Lawyer',
    description: 'Takes every lawsuit to court the moment it is filed. You no longer have to deal with it yourself.',
    icon: 'DL',
    actionsRequired: 100000000,
    cost: 4000000,
    requiresProducts: ['green-world', 'fair-share', 'peace-integrity']
  },
  {
    id: 'good-lawyer',
    name: 'Good Lawyer',
    description: 'Reads the files before the hearing. Court cases are won 20 percentage points more often.',
    icon: 'GL',
    actionsRequired: 150000000,
    cost: 5000000,
    requiresProducts: ['green-world', 'fair-share', 'peace-integrity']
  },
  {
    id: 'chewbacca-defense',
    name: 'Chewbacca Defense',
    description: 'Ladies and gentlemen of the jury, this does not make sense. Court cases are won with a fixed 95%.',
    icon: 'CD',
    actionsRequired: 200000000,
    cost: 6000000,
    requiresProducts: ['green-world', 'fair-share', 'peace-integrity']
  },
  {
    id: 'citizens-assembly',
    name: 'Global Citizens Assembly',
    description: 'Randomly drawn citizens from every country get a real say. Integrity never drops below 40% and nobody needs to protest any more.',
    icon: 'CA',
    actionsRequired: 300000000,
    cost: 10000000
  }
];

/**
 * Level 3: unlocked by total coding actions, bought with budget. `effect` says what a perk does: open a card,
 * multiply the rates or unlock an action card. A threshold of 0 means it is available from the start. More perks can
 * use the other effect kinds (initiativeGain, attackShield, driftShield, upkeep).
 */
export const levelThreePerks: UtopiaPerk[] = [
  { id: 'utopia-blueprint', name: 'Blueprint for Utopia', description: 'Your AI drafts a plan for a world where everyone has a job, a home and a full plate. Opens the Utopia card.', icon: 'BU',
    actionsRequired: 250000000, cost: 0, effect: { kind: 'unlock', card: 'utopia' } },
  { id: 'opposition-research', name: 'Opposition Research', description: 'Somebody is buying up farmland, warehouses and influencers. Find out who. Opens the MegaCorp card, and MegaCorp starts fighting back.', icon: 'OR',
    actionsRequired: 260000000, cost: 0, effect: { kind: 'unlock', card: 'megacorp' } },
  { id: 'hyper-scaling', name: 'Hyper-Scaling', description: 'Every server, every process, every intern at full throttle. TCA and budget per second ×10.', icon: 'HS',
    actionsRequired: 310000000, cost: 5000000, effect: { kind: 'rateBoost', value: 10 } },
  // One perk per locked action card.
  { id: 'prefab-factory', name: 'Prefab Factory', description: 'Unlocks the move "Pop-Up Homes": Housing +3%/s for 5s.', icon: 'PF',
    actionsRequired: 0, cost: 5000000, effect: { kind: 'unlockAction', action: 'pop-up-homes' } },
  { id: 'rapid-response', name: 'Rapid Response Team', description: 'Unlocks the move "Shut It Down": stops a running MegaCorp move of your choice, every 120s.', icon: 'RR',
    actionsRequired: 0, cost: 10000000, effect: { kind: 'unlockAction', action: 'shut-it-down' } },
  { id: 'rally-network', name: 'Rally Network', description: 'Unlocks the move "Battle Cry": in a battle, each push moves the bar by 2% for 15s.', icon: 'RN',
    actionsRequired: 0, cost: 10000000, effect: { kind: 'unlockAction', action: 'battle-cry' } },
  { id: 'housing-policy', name: 'Housing Policy Desk', description: 'Unlocks the move "Cut Rent Taxes": Housing +0.1%/s and Credibility +0.5/s for 15s.', icon: 'HP',
    actionsRequired: 285000000, cost: 2000000, effect: { kind: 'unlockAction', action: 'rent-tax-cut' } },
  { id: 'kitchen-network', name: 'Kitchen Network', description: 'Unlocks the move "Community Kitchens": Food +3 at once.', icon: 'KN',
    actionsRequired: 300000000, cost: 3000000, effect: { kind: 'unlockAction', action: 'community-kitchens' } },
  { id: 'investigative-desk', name: 'Investigative Desk', description: 'Unlocks the move "Leak the Emails": −3% power for every corporation and Credibility +2.', icon: 'ID',
    actionsRequired: 320000000, cost: 5000000, effect: { kind: 'unlockAction', action: 'leak' } }
];
