/**
 * Level 3 content and balance. Everything you might want to tune lives here: bars, corporations, battle moves,
 * attacks, initiatives and the effects of winning or losing a battle.
 */
import type { BattleMove, Corporation, Initiative, MetricDefinition, UtopiaMetric } from '../models/utopia.model.ts';

/** Working title of the alliance of EdisonX, Mississippi Corp and Bananas Inc. */
export const megaCorpName = 'MegaCorp';

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
      { name: 'Bananas Inc. sues your vertical farms for “unfair photosynthesis”', effects: { food: 2, housing: 1 } }
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
      { name: 'Mississippi Corp buys every empty building “for storage”', effects: { housing: 4 } }
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
      { name: 'EdisonX posts that your AI “wants to steal your job” — 400 million views', effects: { employment: 2, housing: 1, food: 1 } },
      { name: 'EdisonX sues you for building homes in the path of its future launch pads', effects: { housing: 3 } }
    ]
  }
];

/** What your AI system can do for the utopia. */
export const initiatives: Initiative[] = [
  { id: 'career-match', name: 'AI Career Matchmaker', description: 'Finds every person a job the AI cannot do: care, craft, art, repair.', metric: 'employment', gain: 3, cooldown: 10 },
  { id: 'housing-printer', name: 'Modular Housing Printer', description: 'Prints a neighbourhood a day. Ugly, warm, dry.', metric: 'housing', gain: 3, cooldown: 10 },
  { id: 'vertical-farms', name: 'Vertical Farms', description: 'Lettuce on the 40th floor. The pigeons are thrilled.', metric: 'food', gain: 3, cooldown: 10 }
];
