import { Component, computed, input, output, signal } from '@angular/core';
import { CardShopComponent } from '../card-shop/card-shop';
import {
  buyBlocker, cardSummary, corporation, currentStage, enemyCard, enemyDeck, enemyStrength, ownedCards, playerCard, playerTurn, shopCards
} from '../../game/utopia';
import { battleRules, campaign, megaCorpName } from '../../game/utopia-content';
import type { Attack, UtopiaGame } from '../../models/utopia.model';

/** Level 3: a card game against the corporations, one after another. */
@Component({
  selector: 'app-level-three',
  imports: [CardShopComponent],
  templateUrl: './level-three.html'
})
export class LevelThreeComponent {
  readonly state = input.required<UtopiaGame>();
  readonly cardToggled = output<string>();
  readonly attacked = output<void>();
  readonly cardBought = output<string>();
  /** The card shop dialog is open. */
  protected readonly shopOpen = signal(false);

  protected readonly rules = battleRules;
  protected readonly megaCorpName = megaCorpName;

  protected readonly view = computed(() => {
    const state = this.state();
    const stage = currentStage(state);
    const corp = corporation(state.enemy.corpId);
    const strength = stage ? enemyStrength(stage, state.battle) : 1;
    return {
      stations: campaign.map((entry, index) => {
        // One pip per battle: beaten ones filled.
        const pips = Array.from({ length: entry.battles }, (_, battle) =>
          index < state.stage || state.outcome === 'won' || (index === state.stage && battle < state.battle));
        return {
          corp: corporation(entry.corpId),
          boss: !!entry.boss,
          current: index === state.stage && state.outcome !== 'won',
          pips,
          beaten: pips.filter(done => done).length
        };
      }),
      enemy: {
        corp,
        boss: !!stage?.boss,
        battle: state.battle + 1,
        battles: stage?.battles ?? 0,
        power: Math.round(state.enemy.power),
        maxPower: state.enemy.maxPower,
        percent: state.enemy.power / state.enemy.maxPower * 100,
        block: state.enemy.block,
        // Its cards, with the turns they still rest.
        deck: enemyDeck(state.enemy.corpId).map(card => ({
          card, summary: cardSummary(card, strength), resting: state.enemy.cooldowns[card.id] ?? 0
        }))
      },
      credibility: Math.round(state.credibility),
      credibilityPercent: state.credibility / battleRules.maxCredibility * 100,
      block: state.block,
      yourTurn: playerTurn(state),
      hand: state.hand.map(id => playerCard(id)).filter(card => !!card).map(card => ({
        card, summary: cardSummary(card), selected: state.selected.includes(card.id)
      })),
      selectedCount: state.selected.length,
      resting: ownedCards(state).filter(card => (state.cooldowns[card.id] ?? 0) > 0)
        .map(card => ({ card, turns: state.cooldowns[card.id]! })),
      deckSize: ownedCards(state).length,
      wins: state.wins,
      losses: state.losses,
      credits: state.credits,
      shop: shopCards().map(card => ({ card, summary: cardSummary(card), blocker: buyBlocker(state, card.id), owned: state.owned.includes(card.id) })),
      // Something in the shop you can afford: the shop button shows a dot.
      affordable: shopCards().some(card => !buyBlocker(state, card.id)),
      log: state.log.map(entry => this.describe(entry))
    };
  });

  /** One line per attack, e.g. "You: Antitrust Lawsuit + Fact Check → 20 damage (5 blocked)". */
  private describe(entry: Attack) {
    const names = entry.cards.map(id => (entry.by === 'player' ? playerCard(id) : enemyCard(entry.corpId, id))?.name ?? id);
    const parts = [
      entry.damage || entry.blocked ? `${entry.damage} damage${entry.blocked ? ` (${entry.blocked} blocked)` : ''}` : '',
      entry.healed ? `+${entry.healed} ${entry.by === 'player' ? 'credibility' : 'power'}` : '',
      entry.shield ? `block ${entry.shield}%` : ''
    ].filter(part => part);
    return { id: entry.id, mine: entry.by === 'player', by: corporation(entry.corpId)?.name ?? entry.corpId, cards: names.join(' + '), result: parts.join(' · ') || 'no effect' };
  }
}
