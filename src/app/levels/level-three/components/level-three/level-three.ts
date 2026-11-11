import { Component, computed, input, output, signal } from '@angular/core';
import { CardArtComponent } from '../card-art/card-art';
import { CardShopComponent } from '../card-shop/card-shop';
import {
  buyBlocker, cardCategory, cardLimit, cardSummary, inheritedCards, corporation, learnableCards, currentStage, enemyCard, enemyDeck, enemyStrength, ownedCards, playerCard, playerTurn, shopCards
} from '../../game/utopia';
import { battleRules, corporations, megaCorpName } from '../../game/utopia-content';
import type { Attack, BattleCard, CardCategory, UtopiaGame } from '../../models/utopia.model';

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
  protected readonly categoryLabel: Record<string, string> = { damage: 'Damage', block: 'Block', heal: 'Heal', instant: 'Instant battle', counter: 'Counter', combo: 'Combo', special: 'Special' };
  protected readonly megaCorpName = megaCorpName;

  protected readonly view = computed(() => {
    const state = this.state();
    const stage = currentStage(state);
    const corp = corporation(state.enemy.corpId);
    const strength = stage ? enemyStrength(stage, state.battle) : 1;
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
          // Instant cards it took over from an earlier corporation.
          from: inheritedCards(state.enemy.corpId).find(entry => entry.card.id === card.id)?.from.name ?? null
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
      // Cards you may play this turn (more after a special card).
      maxCards: cardLimit(state),
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
      log: state.log.map(entry => this.describe(entry)),
      // The battle card: the corporation's latest attack in this battle on top, yours below.
      stageEnemy: this.stage(state, state.log.find(entry => entry.by === 'enemy' && entry.corpId === state.enemy.corpId)),
      stagePlayer: this.stage(state, state.log.find(entry => entry.by === 'player')),
      newest: state.log[0]?.id ?? 0
    };
  });

  /** Order in which played cards are applied on the battle card. */
  private static readonly applyOrder: Record<CardCategory, number> = { block: 0, counter: 0, combo: 1, damage: 2, instant: 3, heal: 4, special: 5 };

  /**
   * An attack for the battle card: its cards in the order they are applied, and what it did. Counter cards the
   * opponent's next attack did not need (no matching instant card) are marked `wasted`.
   */
  private stage(state: UtopiaGame, latest: Attack | undefined) {
    if (!latest) return null;
    // The opponent's attack right after this one (the log is newest first).
    const answer = state.log.slice(0, state.log.indexOf(latest)).filter(entry => entry.by !== latest.by).pop();
    const factor = latest.by === 'enemy' ? (currentStage(state) ? enemyStrength(currentStage(state)!, state.battle) : 1) : 1;
    const cards = latest.cards
      .map(id => latest.by === 'player' ? playerCard(id) : enemyCard(latest.corpId, id))
      .filter((card): card is BattleCard => !!card)
      .map(card => ({
        card, category: cardCategory(card), summary: cardSummary(card, factor, latest.by === 'player' ? state.wins : 0),
        wasted: !!answer && card.effects.some(effect => effect.kind === 'counter') && answer.counteredBy !== card.id
      }))
      .sort((a, b) => LevelThreeComponent.applyOrder[a.category] - LevelThreeComponent.applyOrder[b.category]);
    const results = [
      latest.shield ? { kind: 'block', text: `🛡 Block ${latest.shield}%` } : null,
      latest.blocked ? { kind: 'blocked', text: `🛡 Blocked ${latest.blocked}` } : null,
      latest.damage ? { kind: 'damage', text: `💥 Damage −${latest.damage}` } : null,
      latest.recoil ? { kind: 'recoil', text: `↩ Countered −${latest.recoil}` } : null,
      latest.healed ? { kind: 'heal', text: `♥ Healed +${latest.healed}` } : null,
      ...(latest.notes ?? []).map((note, index) => ({ kind: 'note' + index, text: note })),
      ...(latest.learned ?? []).map(id => ({ kind: 'learned-' + id, text: `learned “${playerCard(id)?.name ?? id}”` }))
    ].filter((chip): chip is { kind: string; text: string } => !!chip);
    return {
      id: latest.id, mine: latest.by === 'player', by: corporation(latest.corpId)?.name ?? latest.corpId,
      // Wasted counters grey out once the answering cards are applied.
      wait: answer?.cards.length ?? 0,
      names: cards.map(entry => entry.card.name).join(', '), cards, results
    };
  }

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
