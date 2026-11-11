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
  /** Percent of the next enemy attack your blockers absorb. */
  block: number;
  /** Whose move it is. The corporation moves one second after you. */
  turn: 'player' | 'enemy';
  /** The latest attacks, newest first. */
  log: Attack[];
  /** Battles won and lost, over all attempts. */
  wins: number;
  losses: number;
  /** Earned with wins (one each), spent in the card shop. */
  credits: number;
  /** Cards bought in the shop; the starter cards are always yours. */
  owned: string[];
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
  /** Percent of your next attack its blockers absorb. */
  block: number;
  /** Its turns until each of its cards can be played again. */
  cooldowns: Record<string, number>;
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
}

export interface UtopiaStats {
  cardsPlayed: number;
  damageDealt: number;
  damageTaken: number;
  attempts: number;
}

/** What a card does. Damage hits the opponent (minus its block); block and heal help the one who plays it. */
export type CardEffect =
  | { kind: 'damage'; amount: number }
  | { kind: 'block'; percent: number }
  | { kind: 'heal'; amount: number };

/** A card in your deck or a corporation's deck. */
export interface BattleCard extends Described {
  effects: CardEffect[];
  /** Own turns the card rests after it was played; 0 means it can come back right away. */
  cooldown: number;
}

/** One of your cards: a starter card (price 0), or one to buy in the card shop for credits. */
export interface PlayerCard extends BattleCard {
  price: number;
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
