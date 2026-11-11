/**
 * Level 3 content and balance: the campaign, the corporations with their cards, your cards and the battle rules.
 * Everything you might want to tune lives here.
 */
import type { BattleCard, Corporation, PlayerCard, Stage } from '../models/utopia.model.ts';

/** Working title of the alliance of EdisonX, Mississippi Corp and Bananas Inc. */
export const megaCorpName = 'MegaCorp';

export const battleRules = {
  /** Your life. */
  maxCredibility: 100,
  /** Cards in your hand. */
  handSize: 5,
  /** Cards you (and a corporation) may combine in one attack. */
  maxCards: 3,
  /** Credibility you get back after a won battle. */
  healAfterWin: 25,
  /** Credits for the card shop: per won battle, a bonus for winning with more than `highCredibility`, per countered
   * instant card of the corporation, for beating a corporation completely, and per lost battle. */
  credits: { win: 1, highCredibility: 50, highCredibilityBonus: 1, counter: 1, corporationBeaten: 2, loss: 0 },
  /** Share of an instant battle card that strikes back when the opponent has the counter. */
  recoilShare: 0.5,
  /** Blocks stack up to this many percent. */
  maxBlock: 80,
  /** Attacks kept in the log. */
  logLength: 6
};

/**
 * The campaign, in order. More corporations or a final boss are just more entries (with `boss: true` for the last
 * one); a corporation needs an entry in `corporations` below. Every corporation has 100 power, like your 100
 * credibility; later battles get harder through `damage` (or `powerStep`, for more power per battle).
 */
export const campaign: Stage[] = [
  { corpId: 'bananas', battles: 2, power: 100, powerStep: 0, damage: 1, damageStep: 0.1 },
  { corpId: 'mississippi', battles: 4, power: 100, powerStep: 0, damage: 1.2, damageStep: 0.1 },
  { corpId: 'edison', battles: 6, power: 100, powerStep: 0, damage: 1.4, damageStep: 0.1 }
];

/** Cards every corporation plays, on top of its own. */
export const megacorpCards: BattleCard[] = [
  { id: 'propaganda', name: 'Propaganda Flood', description: 'Floods social media with propaganda against you.',
    effects: [{ kind: 'damage', amount: 8 }], cooldown: 1 },
  { id: 'lobbyists', name: 'Army of Lobbyists', description: 'Lawmakers suddenly find your plans “unrealistic”.',
    effects: [{ kind: 'block', percent: 40 }], cooldown: 2 },
  { id: 'insider-trading', name: 'Insider Trading', description: 'A little trading between friends refills the war chest.',
    effects: [{ kind: 'heal', amount: 10 }], cooldown: 3 },
  // Counter cards: played like any card, they wait for your next attack and answer one instant battle card.
  { id: 'like-a-cow', name: 'How appropriate. You fight like a cow.', description: 'The comeback. Your insult bounces right back.',
    effects: [{ kind: 'counter', of: 'dairy-farmer' }], cooldown: 2 },
  { id: 'i-hate-snakes', name: 'I hate snakes', description: 'Nobody sells a jacket to someone who hates snakes.',
    effects: [{ kind: 'counter', of: 'leather-jackets' }], cooldown: 2 }
];

/** The corporations with their own cards. */
export const corporations: Corporation[] = [
  {
    id: 'bananas',
    name: 'Bananas Inc.',
    description: 'Owns half the world’s plantations and the other half’s politicians.',
    icon: '🍌',
    cards: [
      { id: 'banana-blockade', name: 'Banana Blockade', description: 'Blocks the ports until the world buys only bananas.',
        effects: [{ kind: 'damage', amount: 12 }], cooldown: 2 },
      { id: 'banana-influencers', name: 'Influencer Campaign', description: 'Influencers call your utopia “a banana-free dictatorship”.',
        effects: [{ kind: 'damage', amount: 6 }], cooldown: 0 },
      { id: 'banana-republic', name: 'Banana Republic', description: 'Buys a government. The receipt is in bananas.',
        effects: [{ kind: 'heal', amount: 20 }], cooldown: 4 },
      { id: 'plan-is-bananas', name: 'Your plan is bananas', description: 'And we would know. We own all of them.',
        effects: [{ kind: 'instant', amount: 8, counter: 'not-monoculture' }], cooldown: 2 }
    ]
  },
  {
    id: 'mississippi',
    name: 'Mississippi Corp',
    description: 'The everything store, now also selling the idea that humans are optional.',
    icon: '📦',
    cards: [
      { id: 'robot-night-shift', name: 'Robot Night Shift', description: 'Replaces 10,000 warehouse workers with robots overnight.',
        effects: [{ kind: 'damage', amount: 14 }], cooldown: 2 },
      { id: 'same-day-smear', name: 'Same-Day Smear', description: 'Delivers a hit piece about you to every doorstep before noon.',
        effects: [{ kind: 'damage', amount: 7 }], cooldown: 0 },
      { id: 'warehouse-fortress', name: 'Warehouse Fortress', description: 'Hides behind a billion square feet of concrete.',
        effects: [{ kind: 'block', percent: 50 }], cooldown: 3 },
      { id: 'prime-lockdown', name: 'Prime Lockdown', description: 'One of your plans is stuck in a warehouse. Delivery: tomorrow, maybe.',
        effects: [{ kind: 'lock', count: 1 }], cooldown: 3 },
      { id: 'also-bought-robots', name: 'Customers who liked you also bought our robots', description: 'A recommendation you cannot refuse.',
        effects: [{ kind: 'instant', amount: 10, counter: 'return-robot' }], cooldown: 2 }
    ]
  },
  {
    id: 'edison',
    name: 'EdisonX',
    description: 'Rockets, robots, and a social network to tell everyone how great they are.',
    icon: '🚀',
    cards: [
      { id: 'viral-smear', name: 'Viral Smear', description: 'Posts that your AI “wants to steal your job”.',
        effects: [{ kind: 'damage', amount: 10 }], cooldown: 1 },
      { id: 'satellite-blackout', name: 'Satellite Blackout', description: 'Switches off the internet over your servers. Oops.',
        effects: [{ kind: 'damage', amount: 20 }], cooldown: 3 },
      { id: 'rocket-pr', name: 'Rocket Launch PR', description: 'A rocket launch nobody can look away from.',
        effects: [{ kind: 'heal', amount: 15 }], cooldown: 3 },
      { id: 'algorithm-change', name: 'Algorithm Change', description: 'Your feed is different now. So is your hand.',
        effects: [{ kind: 'shuffle' }], cooldown: 3 },
      { id: 'bigger-rocket', name: 'My rocket is bigger than your utopia', description: 'Posted at 3 a.m., in all caps.',
        effects: [{ kind: 'instant', amount: 12, counter: 'compensating' }], cooldown: 2 }
    ]
  }
];

/**
 * Your cards: the ones with price 0 from the start, the others in the card shop for `price` credits. Counter cards
 * marked `learned` are never sold: you learn one when the corporation's matching instant card hits you.
 */
export const playerCards: PlayerCard[] = [
  { id: 'antitrust', name: 'Antitrust Lawsuit', description: 'Sues them for being a monopoly. Which they are.',
    effects: [{ kind: 'damage', amount: 12 }], cooldown: 1, price: 0 },
  { id: 'fact-check', name: 'Fact Check', description: 'Politely points out what is not true.',
    effects: [{ kind: 'damage', amount: 8 }], cooldown: 0, price: 0 },
  { id: 'firewall', name: 'Stronger Firewalls', description: 'Hardens your systems and channels.',
    effects: [{ kind: 'block', percent: 50 }], cooldown: 2, price: 0 },
  { id: 'press-conference', name: 'Press Conference', description: 'Calm, honest answers. People like that.',
    effects: [{ kind: 'heal', amount: 8 }], cooldown: 2, price: 0 },
  { id: 'protest-march', name: 'Protest March', description: 'A million people on the streets, with good signs.',
    effects: [{ kind: 'damage', amount: 6 }, { kind: 'block', percent: 20 }], cooldown: 1, price: 0 },
  { id: 'leak', name: 'Leak the Emails', description: 'Publishes how they really talk about their customers.',
    effects: [{ kind: 'damage', amount: 18 }, { kind: 'heal', amount: 3 }], cooldown: 2, price: 2 },
  { id: 'community-kitchens', name: 'Community Kitchens', description: 'A kitchen on every corner. Nobody eats alone.',
    effects: [{ kind: 'heal', amount: 15 }], cooldown: 3, price: 2 },
  { id: 'shut-it-down', name: 'Shut It Down', description: 'Lawyers and fact-checkers stop their next move cold.',
    effects: [{ kind: 'block', percent: 80 }], cooldown: 3, price: 3 },
  { id: 'investigative-desk', name: 'Investigative Desk', description: 'A year of research, one devastating article.',
    effects: [{ kind: 'damage', amount: 25 }], cooldown: 3, price: 4 },
  { id: 'pop-up-homes', name: 'Pop-Up Homes', description: 'Prefab homes in every empty lot. Hard to argue with.',
    effects: [{ kind: 'heal', amount: 10 }, { kind: 'block', percent: 20 }], cooldown: 2, price: 3 },
  { id: 'dairy-farmer', name: 'You fight like a dairy farmer', description: 'An insult so sharp it cuts. Unless they know the comeback.',
    effects: [{ kind: 'instant', amount: 10, counter: 'like-a-cow' }], cooldown: 1, price: 2 },
  { id: 'leather-jackets', name: 'I sell those fine leather jackets', description: 'A sales pitch so smooth it hurts. Unless they hate snakes.',
    effects: [{ kind: 'instant', amount: 10, counter: 'i-hate-snakes' }], cooldown: 1, price: 2 },
  { id: 'whistleblower', name: 'Whistleblower Hotline', description: 'Somebody inside talks. Their defences crumble.',
    effects: [{ kind: 'strip' }, { kind: 'damage', amount: 6 }], cooldown: 2, price: 2 },
  { id: 'open-source', name: 'Open Source Release', description: 'You give the code away. Everybody wins, except them.',
    effects: [{ kind: 'damage', amount: 5 }, { kind: 'heal', amount: 5 }], cooldown: 1, price: 2 },
  { id: 'viral-petition', name: 'Viral Petition', description: 'Every win brings more signatures.',
    effects: [{ kind: 'damage', amount: 4, perWin: 1 }], cooldown: 2, price: 3 },
  { id: 'general-strike', name: 'General Strike', description: 'Everything stops. It hurts them a lot. It hurts you a bit.',
    effects: [{ kind: 'damage', amount: 25 }, { kind: 'selfDamage', amount: 10 }], cooldown: 3, price: 3 },
  { id: 'fact-check-marathon', name: 'Fact Check Marathon', description: 'A team that checks everything they say, for days.',
    effects: [{ kind: 'block', percent: 30, attacks: 2 }], cooldown: 3, price: 2 },
  { id: 'union-contract', name: 'Union Contract', description: 'Fair pay, every week. Things get better slowly.',
    effects: [{ kind: 'regen', amount: 4, turns: 3 }], cooldown: 4, price: 3 },
  { id: 'tax-audit', name: 'Tax Audit', description: 'Their best move is stuck in paperwork.',
    effects: [{ kind: 'delay', turns: 2 }], cooldown: 3, price: 2 },
  // Learned: the answers to the corporations' instant cards.
  { id: 'not-monoculture', name: 'At least it’s not a monoculture', description: 'Learned the hard way from Bananas Inc.',
    effects: [{ kind: 'counter', of: 'plan-is-bananas' }], cooldown: 2, price: 0, learned: true },
  { id: 'return-robot', name: 'I’d like to return that robot', description: 'Learned the hard way from Mississippi Corp.',
    effects: [{ kind: 'counter', of: 'also-bought-robots' }], cooldown: 2, price: 0, learned: true },
  { id: 'compensating', name: 'Compensating for something?', description: 'Learned the hard way from EdisonX.',
    effects: [{ kind: 'counter', of: 'bigger-rocket' }], cooldown: 2, price: 0, learned: true }
];
