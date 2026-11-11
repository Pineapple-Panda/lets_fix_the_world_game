import { Component, computed, input, output, signal } from '@angular/core';
import { CardArtComponent } from '../card-art/card-art';
import { CardShopComponent } from '../card-shop/card-shop';
import {
  buyBlocker, cardCategory, cardSummary, corporation, learnableCards, currentStage, enemyCard, enemyDeck, enemyStrength, ownedCards, playerCard, playerTurn, shopCards
} from '../../game/utopia';
import { battleRules, corporations, megaCorpName } from '../../game/utopia-content';
import type { Attack, UtopiaGame } from '../../models/utopia.model';

/** Level 3: a card game against the corporations, one after another. */
@Component({
  selector: 'app-level-three',
  imports: [CardArtComponent, CardShopComponent],
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
  /** How credits are earned, for the shop. */
  protected readonly earnRules = [
    `${battleRules.credits.win} per win`,
    `+${battleRules.credits.highCredibilityBonus} when you win with more than ${battleRules.credits.highCredibility} credibility`,
    `+${battleRules.credits.counter} per countered instant card`,
    `+${battleRules.credits.corporationBeaten} for beating a corporation completely`,
    ...(battleRules.credits.loss ? [`+${battleRules.credits.loss} per lost battle`] : [])
  ].join(', ');
  /** Label of each colour scheme. */
  protected readonly categoryLabel: Record<string, string> = { damage: 'Damage', block: 'Block', heal: 'Heal', instant: 'Instant battle', counter: 'Counter', combo: 'Combo' };
  protected readonly megaCorpName = megaCorpName;

  protected readonly view = computed(() => {
    const state = this.state();
    const stage = currentStage(state);
    const corp = corporation(state.enemy.corpId);
    const strength = stage ? enemyStrength(stage, state.battle) : 1;
    // The cards of its latest attack in this battle (the log is newest first).
    const lastAttack = state.log.find(entry => entry.by === 'enemy' && entry.corpId === state.enemy.corpId);
    const playedLast = lastAttack && state.log.indexOf(lastAttack) <= 1 ? lastAttack.cards : [];
    return {
      enemy: {
        corp,
        boss: !!stage?.boss,
        battle: state.battle + 1,
        battles: stage?.battles ?? 0,
        // One pip per battle against this corporation: beaten ones filled.
        beaten: state.outcome === 'won' ? stage?.battles ?? 0 : state.battle,
        pips: Array.from({ length: stage?.battles ?? 0 }, (_, battle) => state.outcome === 'won' || battle < state.battle),
        power: Math.round(state.enemy.power),
        maxPower: state.enemy.maxPower,
        percent: state.enemy.power / state.enemy.maxPower * 100,
        block: state.enemy.block,
        blockAttacks: state.enemy.blockAttacks,
        // Counter cards it played last turn, waiting for your next attack.
        counters: state.enemy.counters.map(id => enemyCard(state.enemy.corpId, id)?.name ?? id),
        // Its cards, with the turns they still rest.
        deck: enemyDeck(state.enemy.corpId).map(card => ({
          card, category: cardCategory(card), summary: cardSummary(card, strength), resting: state.enemy.cooldowns[card.id] ?? 0,
          played: playedLast.includes(card.id)
        }))
      },
      credibility: Math.round(state.credibility),
      credibilityPercent: state.credibility / battleRules.maxCredibility * 100,
      block: state.block,
      blockAttacks: state.blockAttacks,
      // Healing over time: per attack, and for how many more of its attacks.
      regen: state.regen.length ? { amount: state.regen.reduce((total, entry) => total + entry.amount, 0), turns: Math.max(...state.regen.map(entry => entry.turns)) } : null,
      counters: state.counters.map(id => playerCard(id)?.name ?? id),
      yourTurn: playerTurn(state),
      hand: state.hand.map(id => playerCard(id)).filter(card => !!card).map(card => ({
        card, category: cardCategory(card), summary: cardSummary(card, 1, state.wins), selected: state.selected.includes(card.id),
        locked: state.locked.includes(card.id)
      })),
      selectedCount: state.selected.length,
      resting: ownedCards(state).filter(card => (state.cooldowns[card.id] ?? 0) > 0)
        .map(card => ({ card, turns: state.cooldowns[card.id]! })),
      deckSize: ownedCards(state).length,
      wins: state.wins,
      losses: state.losses,
      credits: state.credits,
      lastReward: state.lastReward ?? null,
      learnable: learnableCards(state).map(({ card, known }) => {
        const counter = card.effects.find(effect => effect.kind === 'counter');
        const source = counter?.kind === 'counter' ? corporations.map(corp => ({ corp, card: corp.cards.find(entry => entry.id === counter.of) })).find(entry => entry.card) : undefined;
        return {
          card, category: cardCategory(card), summary: cardSummary(card), known,
          hint: source ? `Get hit by “${source.card!.name}” (${source.corp.name}) to learn it.` : 'Learned from a corporation.'
        };
      }),
      shop: shopCards().map(card => ({ card, category: cardCategory(card), summary: cardSummary(card, 1, state.wins), blocker: buyBlocker(state, card.id), owned: state.owned.includes(card.id) })),
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
      entry.shield ? `block ${entry.shield}%` : '',
      ...(entry.notes ?? []),
      entry.learned?.length ? `you learned ${entry.learned.map(id => `“${playerCard(id)?.name ?? id}”`).join(', ')}` : '',
      entry.recoil ? `countered by “${(entry.by === 'player' ? enemyCard(entry.corpId, entry.counteredBy ?? '') : playerCard(entry.counteredBy ?? ''))?.name ?? 'a counter'}”, ${entry.recoil} back` : ''
    ].filter(part => part);
    return { id: entry.id, mine: entry.by === 'player', by: corporation(entry.corpId)?.name ?? entry.corpId, cards: names.join(' + '), result: parts.join(' · ') || 'no effect' };
  }
}
