/**
 * Level 3 content and balance. Everything you might want to tune lives here: start values, bars, corporations,
 * action cards, counter initiatives, initiatives and perks.
 */
import type { ActionCard, Corporation, CounterInitiative, Initiative, MetricDefinition, UtopiaMetric, UtopiaPerk } from '../models/utopia.model.ts';

/** Working title of the alliance of EdisonX, Mississippi Corp and Bananas Inc. */
export const megaCorpName = 'MegaCorp';

/**
 * Starting values when level 3 is not reached from level 2. Otherwise TCA, budget and integrity carry over, and so
 * do the average actions and budget per second level 2 ended with: they keep TCA and budget running.
 */
export const utopiaStart = { actions: 280000000, budget: 20000000, integrity: 50, actionRate: 13000, budgetRate: 13000 };

/** Level 3 is won once every utopia bar reaches `win`, and lost once `loseWhen` bars drop to `lose` ('any' or 'all'). */
export const outcomeRules = { win: 100, lose: 0, loseWhen: 'all' as 'any' | 'all' };

/** The utopia's bars, in display order. */
export const metrics: MetricDefinition[] = [
  { id: 'employment', name: 'Employment', hint: 'The AI does the work. Humans need new jobs worth doing.', start: 65, drift: -0.01 },
  { id: 'housing', name: 'Housing', hint: 'People per home. Everyone stays alive now, so the world keeps getting fuller.', start: 70, drift: -0.012 },
  { id: 'food', name: 'Food', hint: 'Meals per person. More people, same fields.', start: 75, drift: -0.008 }
];

/**
 * Level 3 perks: two open the Utopia and MegaCorp cards, one each unlocks a locked action card. More perks can use
 * the other effect kinds (initiativeGain, attackShield, driftShield, upkeep). `actionsRequired` is total TCA, as in level 2.
 */
export const utopiaPerks: UtopiaPerk[] = [
  { id: 'utopia-blueprint', name: 'Blueprint for Utopia', description: 'Your AI drafts a plan for a world where everyone has a job, a home and a full plate. Opens the Utopia card.', icon: 'BU',
    actionsRequired: 250000000, cost: 0, effect: { kind: 'unlock', card: 'utopia' } },
  { id: 'opposition-research', name: 'Opposition Research', description: 'Somebody is buying up farmland, warehouses and influencers. Find out who. Opens the MegaCorp card, and MegaCorp starts fighting back.', icon: 'OR',
    actionsRequired: 260000000, cost: 0, effect: { kind: 'unlock', card: 'megacorp' } },
  { id: 'hyper-scaling', name: 'Hyper-Scaling', description: 'Every server, every process, every intern at full throttle. TCA and budget per second ×10.', icon: 'HS',
    actionsRequired: 310000000, cost: 5000000, effect: { kind: 'rateBoost', value: 10 } },
  // One perk per locked action card.
  { id: 'housing-policy', name: 'Housing Policy Desk', description: 'Unlocks the move "Cut Rent Taxes": Housing +0.1%/s and Credibility +0.5/s for 15s.', icon: 'HP',
    actionsRequired: 285000000, cost: 2000000, effect: { kind: 'unlockAction', action: 'rent-tax-cut' } },
  { id: 'kitchen-network', name: 'Kitchen Network', description: 'Unlocks the move "Community Kitchens": Food +3 at once.', icon: 'KN',
    actionsRequired: 300000000, cost: 3000000, effect: { kind: 'unlockAction', action: 'community-kitchens' } },
  { id: 'investigative-desk', name: 'Investigative Desk', description: 'Unlocks the move "Leak the Emails": −3% power for every corporation and Credibility +2.', icon: 'ID',
    actionsRequired: 320000000, cost: 5000000, effect: { kind: 'unlockAction', action: 'leak' } }
];

/**
 * When MegaCorp plays its next card: every 10 seconds while your bars average 70%, 0.2 seconds sooner per point
 * above that (later below it), between 3 and 20 seconds.
 */
export const attackRules = {
  baseInterval: 10,
  referenceLevel: 70,
  secondsPerPoint: 0.2,
  minInterval: 3,
  maxInterval: 20,
  /** Lines kept in the log of MegaCorp's moves. */
  logLength: 5
};

/**
 * Duels: a bar starts at 50%. Each click on the button adds 1.2%, and it drains by 5% per second (in small steps).
 * At 100% you win and every corporation loses 5% power; at 0% you lose 5 credibility. MegaCorp starts a duel instead
 * of playing a card with a 15% chance. After a duel, the next one can start after 30 seconds.
 */
export const duelRules = {
  start: 50,
  clickGain: 1.2,
  drainPerSecond: 5,
  /** Milliseconds between two drain steps in the dialog. */
  stepMs: 100,
  winPowerLoss: 5,
  lossCredibility: 5,
  megacorpChance: 0.15,
  cooldown: 30
};

/** MegaCorp's cards. A random corporation (weighted by power) plays a random one of those it may play. */
export const megacorpCards: ActionCard[] = [
  { id: 'propaganda', actor: 'megacorp', category: 'damage', name: 'Propaganda Flood',
    description: 'Floods social media with propaganda against you.', effects: [{ kind: 'credibility', amount: -2 }] },
  { id: 'warehouse-grab', actor: 'megacorp', category: 'damage', name: 'Warehouse Grab', duration: 30,
    description: 'Buys up apartment buildings and turns them into factories and warehouses.', effects: [{ kind: 'metric', metric: 'housing', amount: -1 }] },
  { id: 'insider-trading', actor: 'megacorp', category: 'powerup', name: 'Insider Trading',
    description: 'Manipulates the stock market for some trading between friends.', effects: [{ kind: 'corpPower', target: 'self', amount: 5 }] },
  { id: 'bribery', actor: 'megacorp', category: 'powerup', name: 'Government Bribe', duration: 60,
    description: 'Pays the government to protect MegaCorp from any loss of power.', effects: [{ kind: 'powerShield' }] },
  { id: 'gig-app', actor: 'megacorp', category: 'damage', name: 'Gig App Launch', duration: 20,
    description: 'An app that turns every job into five worse ones. Employment statistics collapse.', effects: [{ kind: 'metric', metric: 'employment', amount: -0.3 }] },
  { id: 'banana-blockade', actor: 'megacorp', category: 'damage', name: 'Banana Blockade', corpId: 'bananas',
    description: 'Blocks the ports until the world buys only bananas.', effects: [{ kind: 'metric', metric: 'food', amount: -3 }] },
  { id: 'job-thief-post', actor: 'megacorp', category: 'damage', name: 'Viral Smear', corpId: 'edison',
    description: 'EdisonX posts that your AI “wants to steal your job”.', effects: [{ kind: 'credibility', amount: -2 }] },
  { id: 'banana-free-dictatorship', actor: 'megacorp', category: 'damage', name: 'Influencer Campaign', corpId: 'bananas',
    description: 'Bananas Inc. pays influencers to call your utopia “a banana-free dictatorship”.', effects: [{ kind: 'credibility', amount: -2 }] },
  { id: 'robot-night-shift', actor: 'megacorp', category: 'damage', name: 'Robot Night Shift', corpId: 'mississippi',
    description: 'Mississippi Corp replaces 10,000 warehouse workers with robots overnight.', effects: [{ kind: 'metric', metric: 'employment', amount: -2 }] }
];

/**
 * Your cards. Antitrust Lawsuit and Stronger Firewalls are available from the start; the others (`locked`) come with a
 * perk each. They will get a price later; until then a cooldown keeps them from being spammed.
 */
export const playerCards: ActionCard[] = [
  { id: 'rent-tax-cut', actor: 'player', category: 'powerup', name: 'Cut Rent Taxes', duration: 15, cooldown: 30, locked: true,
    description: 'Cuts the taxes on renting out apartments.', effects: [{ kind: 'metric', metric: 'housing', amount: 0.1 }, { kind: 'credibility', amount: 0.5 }] },
  { id: 'firewall', actor: 'player', category: 'powerup', name: 'Stronger Firewalls', duration: 60, cooldown: 90,
    description: 'Hardens your systems and channels against MegaCorp.', effects: [{ kind: 'firewall', factor: 0.5 }] },
  { id: 'antitrust', actor: 'player', category: 'damage', name: 'Antitrust Lawsuit', cooldown: 60,
    description: 'Sues the strongest corporation for being a monopoly. Which it is.', effects: [{ kind: 'corpPower', target: 'strongest', amount: -10 }] },
  { id: 'leak', actor: 'player', category: 'damage', name: 'Leak the Emails', cooldown: 90, locked: true,
    description: 'Publishes how MegaCorp really talks about its customers.', effects: [{ kind: 'corpPower', target: 'all', amount: -3 }, { kind: 'credibility', amount: 2 }] },
  { id: 'community-kitchens', actor: 'player', category: 'powerup', name: 'Community Kitchens', cooldown: 45, locked: true,
    description: 'Opens a kitchen on every corner. Nobody eats alone.', effects: [{ kind: 'metric', metric: 'food', amount: 3 }] }
];

/** Power every corporation starts with, in percent. Counter initiatives are scaled by power. */
export const corpStartPower = 75;

/** The three corporations, in display order. */
export const corporations: Corporation[] = [
  {
    id: 'bananas',
    name: 'Bananas Inc.',
    description: 'Owns half the world’s plantations and the other half’s politicians.',
    icon: '🍌'
  },
  {
    id: 'mississippi',
    name: 'Mississippi Corp',
    description: 'The everything store, now also selling the idea that humans are optional.',
    icon: '📦'
  },
  {
    id: 'edison',
    name: 'EdisonX',
    description: 'Rockets, robots, and a social network to tell everyone how great they are.',
    icon: '🚀'
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
    metric: 'employment', cost: 1000000, buildTime: 30, upkeep: 1000, rate: 0.3 },
  { id: 'housing-printer', name: 'Modular Housing Printer', description: 'Prints a neighbourhood a day. Ugly, warm, dry.',
    metric: 'housing', cost: 1000000, buildTime: 30, upkeep: 1000, rate: 0.3 },
  { id: 'vertical-farms', name: 'Vertical Farms', description: 'Lettuce on the 40th floor. The pigeons are thrilled.',
    metric: 'food', cost: 1000000, buildTime: 30, upkeep: 1000, rate: 0.3 }
];
