/**
 * Level 3 content and balance. Everything you might want to tune lives here: bars, corporations, battle moves,
 * attacks, initiatives and the effects of winning or losing a battle.
 */
import type { BattleMove, Corporation, Initiative, MetricDefinition, UtopiaMetric, UtopiaPerk } from '../models/utopia.model.ts';

/** Working title of the alliance of EdisonX, Mississippi Corp and Bananas Inc. */
export const megaCorpName = 'MegaCorp';

/**
 * Starting values when level 3 is not reached from level 2. Otherwise TCA, budget and integrity carry over, and so
 * do the average actions and budget per second level 2 ended with: they keep TCA and budget running.
 */
export const utopiaStart = { actions: 10000000, budget: 20000000, integrity: 50, actionRate: 175, budgetRate: 175 };

/** Integrity change after a battle. */
export const integrityRules = { battleWon: 5, battleLost: -10 };

/** The utopia's bars, in display order. */
export const metrics: MetricDefinition[] = [
  { id: 'employment', name: 'Employment', hint: 'The AI does the work. Humans need new jobs worth doing.', start: 65, drift: -0.01 },
  { id: 'housing', name: 'Housing', hint: 'People per home. Everyone stays alive now, so the world keeps getting fuller.', start: 70, drift: -0.012 },
  { id: 'food', name: 'Food', hint: 'Meals per person. More people, same fields.', start: 75, drift: -0.008 }
];

export const battleRules = {
  /** Hit points of both sides at the start of a battle. */
  playerHp: 100,
  corpHp: 100,
  /** Power a corporation loses when you win (percentage points). */
  winPowerLoss: 25,
  /** Percentage points every listed bar loses when you lose. */
  lossPenalty: { employment: 25, housing: 25, food: 25 } as Partial<Record<UtopiaMetric, number>>,
  /** A corporation hits with (minimum + power share) of its damage: at 100% power ×1, at 25% power ×0.625. */
  minimumStrength: 0.5,
  /** Lines kept in the battle log. */
  logLength: 6
};

/**
 * Level 3 perks, shown at most five at a time (available ones first). `actionsRequired` counts the coding actions
 * gained in level 3, so the thresholds work however many actions level 2 ended with.
 */
export const utopiaPerks: UtopiaPerk[] = [
  { id: 'utopia-blueprint', name: 'Blueprint for Utopia', description: 'Your AI drafts a plan for a world where everyone has a job, a home and a full plate. Opens the Utopia card.', icon: 'BU',
    actionsRequired: 50000, cost: 1000000, effect: { kind: 'unlock', card: 'utopia' } },
  { id: 'opposition-research', name: 'Opposition Research', description: 'Somebody is buying up farmland, warehouses and influencers. Find out who. Opens the MegaCorp card, and MegaCorp starts fighting back.', icon: 'OR',
    actionsRequired: 250000, cost: 2000000, effect: { kind: 'unlock', card: 'megacorp' } },
  { id: 'counter-lobby', name: 'Counter-Lobby Network', description: 'Ex-lobbyists who switched sides. Your battle attacks deal +5 damage.', icon: 'CL',
    actionsRequired: 1000000, cost: 3000000, effect: { kind: 'battleDamage', value: 5 } },
  { id: 'open-source-ai', name: 'Open-Source Initiatives', description: 'Anyone can improve your AI initiatives. They raise their bar twice as much.', icon: 'OS',
    actionsRequired: 2000000, cost: 5000000, effect: { kind: 'initiativeGain', value: 2 } },
  { id: 'fact-checkers', name: 'Global Fact-Checker Guild', description: 'Every MegaCorp claim is checked within minutes. Their attacks hit half as hard.', icon: 'FC',
    actionsRequired: 4000000, cost: 8000000, effect: { kind: 'attackShield', value: 0.5 } },
  { id: 'basic-services', name: 'Universal Basic Services', description: 'Homes, food and training as a right, not a product. The bars erode half as fast.', icon: 'UB',
    actionsRequired: 6000000, cost: 12000000, effect: { kind: 'driftShield', value: 0.5 } },
  { id: 'ai-scheduler', name: 'AI Task Scheduler', description: 'Your AI plans the next initiative while the last one runs. Cooldowns are halved.', icon: 'TS',
    actionsRequired: 8000000, cost: 15000000, effect: { kind: 'cooldown', value: 0.5 } }
];

/** Your AI system's moves in battle. */
export const playerMoves: BattleMove[] = [
  { id: 'fact-check', name: 'Fact-check', description: 'Debunk their latest claim, line by line.', damage: [16, 24] },
  { id: 'open-data', name: 'Open Data Leak', description: 'Publish their internal numbers. Devastating, if it lands.', damage: [30, 44], accuracy: 0.6 },
  { id: 'community', name: 'Rally the Community', description: 'Millions of people vouch for you.', heal: 20 }
];

export const attackRules = {
  /** Seconds between MegaCorp attacks. */
  interval: 45,
  /** Lines kept in the attack log. */
  logLength: 5
};

/** The three corporations, in display order. */
export const corporations: Corporation[] = [
  {
    id: 'bananas',
    name: 'Bananas Inc.',
    description: 'Owns half the world’s plantations and the other half’s politicians.',
    icon: '🍌',
    moves: [
      { id: 'lobbyists', name: 'Lobbyist Swarm', description: '', damage: [12, 20] },
      { id: 'peel', name: 'Banana Peel Lawsuit', description: '', damage: [20, 30], accuracy: 0.7 }
    ],
    attacks: [
      { name: 'Bananas Inc. buys up farmland to grow only bananas', effects: { food: 4 } },
      { name: 'Bananas Inc. sues your vertical farms for “unfair photosynthesis”', effects: { food: 2, housing: 1 }, integrity: 1 },
      { name: 'Bananas Inc. pays influencers to call your utopia “a banana-free dictatorship”', effects: {}, integrity: 4 }
    ]
  },
  {
    id: 'mississippi',
    name: 'Mississippi Corp',
    description: 'The everything store, now also selling the idea that humans are optional.',
    icon: '📦',
    moves: [
      { id: 'smear', name: 'Same-Day Smear', description: '', damage: [12, 20] },
      { id: 'blackout', name: 'Cloud Blackout', description: '', damage: [22, 32], accuracy: 0.65 }
    ],
    attacks: [
      { name: 'Mississippi Corp replaces 10,000 warehouse workers with robots overnight', effects: { employment: 4 } },
      { name: 'Mississippi Corp buys every empty building “for storage”', effects: { housing: 4 } },
      { name: 'Mississippi Corp’s product reviews suddenly rate your AI one star', effects: { employment: 1 }, integrity: 3 }
    ]
  },
  {
    id: 'edison',
    name: 'EdisonX',
    description: 'Rockets, robots, and a social network to tell everyone how great they are.',
    icon: '🚀',
    moves: [
      { id: 'tweetstorm', name: 'Midnight Tweetstorm', description: '', damage: [10, 24] },
      { id: 'hyperloop', name: 'Hyperloop of Lies', description: '', damage: [25, 35], accuracy: 0.6 }
    ],
    attacks: [
      { name: 'EdisonX posts that your AI “wants to steal your job” — 400 million views', effects: { employment: 2, housing: 1, food: 1 }, integrity: 3 },
      { name: 'EdisonX sues you for building homes in the path of its future launch pads', effects: { housing: 3 } }
    ]
  }
];

/** What your AI system can do for the utopia. */
export const initiatives: Initiative[] = [
  { id: 'career-match', name: 'AI Career Matchmaker', description: 'Finds every person a job the AI cannot do: care, craft, art, repair.', metric: 'employment', gain: 3, cooldown: 10, cost: 250000 },
  { id: 'housing-printer', name: 'Modular Housing Printer', description: 'Prints a neighbourhood a day. Ugly, warm, dry.', metric: 'housing', gain: 3, cooldown: 10, cost: 250000 },
  { id: 'vertical-farms', name: 'Vertical Farms', description: 'Lettuce on the 40th floor. The pigeons are thrilled.', metric: 'food', gain: 3, cooldown: 10, cost: 250000 }
];
