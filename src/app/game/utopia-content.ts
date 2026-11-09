/**
 * Level 3 content and balance. Everything you might want to tune lives here: start values, bars, corporations,
 * attacks, counter initiatives, initiatives and perks.
 */
import type { Corporation, CounterInitiative, Initiative, MetricDefinition, UtopiaMetric, UtopiaPerk } from '../models/utopia.model.ts';

/** Working title of the alliance of EdisonX, Mississippi Corp and Bananas Inc. */
export const megaCorpName = 'MegaCorp';

/**
 * Starting values when level 3 is not reached from level 2. Otherwise TCA, budget and integrity carry over, and so
 * do the average actions and budget per second level 2 ended with: they keep TCA and budget running.
 */
export const utopiaStart = { actions: 280000000, budget: 20000000, integrity: 50, actionRate: 13000, budgetRate: 13000 };

/** The utopia's bars, in display order. */
export const metrics: MetricDefinition[] = [
  { id: 'employment', name: 'Employment', hint: 'The AI does the work. Humans need new jobs worth doing.', start: 65, drift: -0.01 },
  { id: 'housing', name: 'Housing', hint: 'People per home. Everyone stays alive now, so the world keeps getting fuller.', start: 70, drift: -0.012 },
  { id: 'food', name: 'Food', hint: 'Meals per person. More people, same fields.', start: 75, drift: -0.008 }
];

/**
 * Level 3 perks: for now only the two that open the Utopia and MegaCorp cards. More perks can use the other effect
 * kinds (initiativeGain, attackShield, driftShield, upkeep). `actionsRequired` is total TCA, as in level 2.
 */
export const utopiaPerks: UtopiaPerk[] = [
  { id: 'utopia-blueprint', name: 'Blueprint for Utopia', description: 'Your AI drafts a plan for a world where everyone has a job, a home and a full plate. Opens the Utopia card.', icon: 'BU',
    actionsRequired: 250000000, cost: 0, effect: { kind: 'unlock', card: 'utopia' } },
  { id: 'opposition-research', name: 'Opposition Research', description: 'Somebody is buying up farmland, warehouses and influencers. Find out who. Opens the MegaCorp card, and MegaCorp starts fighting back.', icon: 'OR',
    actionsRequired: 260000000, cost: 0, effect: { kind: 'unlock', card: 'megacorp' } }
];

export const attackRules = {
  /** Seconds between MegaCorp attacks. */
  interval: 45,
  /** Lines kept in the attack log. */
  logLength: 5
};

/** Power every corporation starts with, in percent. Attacks and counter initiatives are scaled by power. */
export const corpStartPower = 75;

/** The three corporations, in display order. */
export const corporations: Corporation[] = [
  {
    id: 'bananas',
    name: 'Bananas Inc.',
    description: 'Owns half the world’s plantations and the other half’s politicians.',
    icon: '🍌',
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
    attacks: [
      { name: 'EdisonX posts that your AI “wants to steal your job” — 400 million views', effects: { employment: 2, housing: 1, food: 1 }, integrity: 3 },
      { name: 'EdisonX sues you for building homes in the path of its future launch pads', effects: { housing: 3 } }
    ]
  }
];

/**
 * MegaCorp's counter initiatives: they launch one after another once MegaCorp shows itself and push a bar down every
 * second: their rate × their corporation's power (0.2 × 75% = 0.15%/s at the start). A defeated corporation's
 * counter initiative stops.
 */
export const counterInitiatives: CounterInitiative[] = [
  { id: 'monoculture', corpId: 'bananas', name: 'Monoculture Land Grab', description: 'Every field becomes a banana plantation. Bananas for everyone, nothing else for anyone.',
    metric: 'food', rate: 0.2, launchAfter: 30 },
  { id: 'lights-out', corpId: 'mississippi', name: 'Lights-Out Warehouses', description: 'Fully automated warehouses, no humans, no lights, no jobs.',
    metric: 'employment', rate: 0.2, launchAfter: 90 },
  { id: 'mars-hype', corpId: 'edison', name: 'Mars Colony Real Estate', description: 'Buys up homes on Earth as “collateral” for apartments on Mars. Opening 2090, probably.',
    metric: 'housing', rate: 0.2, launchAfter: 150 }
];

/**
 * Your initiatives: first initialized (paid, then built for `buildTime` seconds), then started and stopped freely.
 * While running they pay their upkeep and raise their bar by rate × credibility every second.
 */
export const initiatives: Initiative[] = [
  { id: 'career-match', name: 'AI Career Matchmaker', description: 'Finds every person a job the AI cannot do: care, craft, art, repair.',
    metric: 'employment', cost: 1000000, buildTime: 30, upkeep: 1000, rate: 0.02 },
  { id: 'housing-printer', name: 'Modular Housing Printer', description: 'Prints a neighbourhood a day. Ugly, warm, dry.',
    metric: 'housing', cost: 1000000, buildTime: 30, upkeep: 1000, rate: 0.02 },
  { id: 'vertical-farms', name: 'Vertical Farms', description: 'Lettuce on the 40th floor. The pigeons are thrilled.',
    metric: 'food', cost: 1000000, buildTime: 30, upkeep: 1000, rate: 0.02 }
];
