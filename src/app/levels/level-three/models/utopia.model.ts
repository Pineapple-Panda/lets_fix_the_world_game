import type { Described, LevelSummary } from '../../../shared/models/shared.model.ts';

/**
 * Level 3: a card game. You fight the corporations one after another; each attack is a few cards from your hand, then
 * the corporation answers with its own cards. Credibility is your life and carries over from battle to battle.
 */
export interface UtopiaGame {
  /** Seconds played in level 3. */
  seconds: number;
  /** Your life in points (0 to `maxCredibility`); carries over from battle to battle. */
  credibility: number;
  /** Index of the current station of the campaign. */
  stage: number;
  /** Battle within the current station, counted from 0. */
  battle: number;
  /** The corporation you are fighting right now. */
  enemy: Opponent;
  /** Card ids in your hand. */
  hand: string[];
  /** Cards of your hand picked for the next attack. */
  selected: string[];
  /** Your turns until each card can be drawn again. */
  cooldowns: Record<string, number>;
  /** Percent of the corporation's attacks your blockers absorb, and for how many more of its attacks. */
  block: number;
  blockAttacks: number;
  /** Counter cards you played last turn: they answer the corporation's next attack. */
  counters: string[];
  /** Healing over time: credibility you get back after each of the corporation's attacks, for `turns` more attacks. */
  regen: { amount: number; turns: number }[];
  /** Cards of your hand the corporation locked: they cannot be picked this turn. */
  locked: string[];
  /** Extra cards you may play this turn, on top of `maxCards` (from a special card last turn). */
  extraCards?: number;
  /** Whose move it is. The corporation answers `enemyWait` ticks after your attack (time for the animation). */
  turn: 'player' | 'enemy';
  enemyWait?: number;
  /** The latest attacks, newest first. */
  log: Attack[];
  /** Battles won and lost, over all attempts. */
  wins: number;
  losses: number;
  /** Earned in battle (see `battleRules.credits`), spent in the card shop. */
  credits: number;
  /** Cards bought in the shop or learned from the corporations; the starter cards are always yours. */
  owned: string[];
  /** What the last won battle paid, for the display. */
  lastReward?: Reward | null;
  /** How level 3 ended: every station beaten (won), or credibility ran out (lost, until you try again). */
  outcome: 'won' | 'lost' | null;
  /** True once the player closed the "utopia achieved" dialog. */
  outcomeSeen: boolean;
  /** Summaries of levels 1 and 2 (as far as they were played), for the final summary. */
  history: LevelSummary[];
  /** Counters for the final summary. */
  stats: UtopiaStats;
}

/** A corporation in battle. */
export interface Opponent {
  corpId: string;
  power: number;
  maxPower: number;
  /** Percent of your attacks its blockers absorb, and for how many more of your attacks. */
  block: number;
  blockAttacks: number;
  /** Counter cards it played last turn: they answer your next attack. */
  counters: string[];
  /** Its turns until each of its cards can be played again. */
  cooldowns: Record<string, number>;
}

/** Credits a battle paid and why, e.g. 3 for "win", "credibility above 50", "corporation beaten". */
export interface Reward {
  credits: number;
  reasons: string[];
}

/** One attack: who played which cards, and what it did. */
export interface Attack {
  /** Running number, for the display. */
  id: number;
  by: 'player' | 'enemy';
  /** The corporation of that battle (the log carries over from battle to battle). */
  corpId: string;
  cards: string[];
  /** Damage after blocking. */
  damage: number;
  /** Damage the defender's blockers absorbed. */
  blocked: number;
  /** Credibility or power restored. */
  healed: number;
  /** Block the attacker built up for the next incoming attack, in percent. */
  shield: number;
  /** Instant battle: damage that struck back at the attacker, and the counter card that did it. */
  recoil?: number;
  counteredBy?: string | null;
  /** Counter cards you learned because this attack's instant cards hit you. */
  learned?: string[];
  /** Anything else that happened, in a few words (a block removed, a card locked, …). */
  notes?: string[];
}

export interface UtopiaStats {
  cardsPlayed: number;
  damageDealt: number;
  damageTaken: number;
  attempts: number;
}

/**
 * What a card does. Damage hits the opponent (minus its block); block and heal help the one who plays it.
 * Instant battle: `amount` hits the opponent (no block helps) unless the opponent played the `counter` card in its last
 * turn; then half of it strikes back at you. A counter card, once played, waits for the opponent's next attack (like a
 * block) and answers the instant card `of`.
 */
export type CardEffect =
  /** `perWin`: more damage for every battle you have won (your cards). */
  | { kind: 'damage'; amount: number; perWin?: number }
  /** `attacks`: the block lasts for this many of the opponent's attacks (default 1). */
  | { kind: 'block'; percent: number; attacks?: number }
  | { kind: 'heal'; amount: number }
  /** Removes the opponent's block before the damage. */
  | { kind: 'strip' }
  /** Costs the one who plays it. */
  | { kind: 'selfDamage'; amount: number }
  /** Heals `amount` after each of the opponent's next `turns` attacks (your cards). */
  | { kind: 'regen'; amount: number; turns: number }
  /** The opponent's strongest resting card (or strongest card) rests `turns` longer (your cards). */
  | { kind: 'delay'; turns: number }
  /** Locks `count` random cards of your hand for your next turn (the corporations' cards). */
  | { kind: 'lock'; count: number }
  /** Draws your hand afresh (the corporations' cards). */
  | { kind: 'shuffle' }
  /** Special: you may play `count` more cards in your next turn (your cards). */
  | { kind: 'extraCards'; count: number }
  | { kind: 'instant'; amount: number; counter: string }
  | { kind: 'counter'; of: string };

/** The colour scheme of a card: what it does, or 'combo' for cards with more than one kind of effect. */
export type CardCategory = 'damage' | 'block' | 'heal' | 'instant' | 'counter' | 'combo' | 'special';

/** A card in your deck or a corporation's deck. */
export interface BattleCard extends Described {
  effects: CardEffect[];
  /** Own turns the card rests after it was played; 0 means it can come back right away. */
  cooldown: number;
}

/**
 * One of your cards: a starter card (price 0), one to buy in the card shop for credits, or a counter card you learn
 * (`learned`) when the corporations' instant card hits you; learned cards are never sold.
 */
export interface PlayerCard extends BattleCard {
  price: number;
  learned?: boolean;
}

export interface Corporation extends Described {
  icon: string;
  /** The corporation's own cards; the shared MegaCorp cards come on top. */
  cards: BattleCard[];
}

/**
 * A station of the campaign: a corporation to beat `battles` times. Every battle starts with `power`, and each
 * further one adds `powerStep`; its damage is multiplied by `damage` + `damageStep` per battle.
 */
export interface Stage {
  corpId: string;
  battles: number;
  power: number;
  powerStep: number;
  damage: number;
  damageStep: number;
  /** The final opponent: shown as such. */
  boss?: boolean;
}
