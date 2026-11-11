import { Component, computed, input, output, signal } from '@angular/core';
import { ModalDialog } from '../../../../shared/components/modal-dialog';
import type { CardCategory, PlayerCard } from '../../models/utopia.model';
import { CardArtComponent } from '../card-art/card-art';

/** One card in the shop: what it does, its price, and why it cannot be bought (or null). */
export interface ShopEntry {
  card: PlayerCard;
  category: CardCategory;
  summary: string;
  blocker: string | null;
  owned: boolean;
}

/** A counter card you learn from a corporation: known, or still hidden with a hint where it comes from. */
export interface LearnEntry {
  card: PlayerCard;
  category: CardCategory;
  summary: string;
  known: boolean;
  hint: string;
}

/** The card shop: cards for credits (one credit per won battle). */
@Component({
  selector: 'app-card-shop',
  imports: [CardArtComponent],
  template: `
    <dialog #dialog class="intro-dialog shop-dialog" aria-labelledby="shop-title" (close)="closed.emit()">
      <header class="shop-header">
        <h1 id="shop-title">Card shop</h1>
        <span class="shop-credits" aria-live="polite">🪙 {{ credits() }} {{ credits() === 1 ? 'credit' : 'credits' }}</span>
      </header>
      <p>Credits: {{ earnRules() }}. Bought cards join your deck for good.</p>
      <div class="shop-filters" role="group" aria-label="Filter the cards">
        @for (option of filters; track option.id) {
          <button type="button" class="shop-filter" [attr.data-category]="option.id" [class.active]="filter() === option.id"
                  [attr.aria-pressed]="filter() === option.id" (click)="filter.set(option.id)">{{ option.label }}</button>
        }
      </div>
      <div class="shop-grid">
        @for (entry of shown(); track entry.card.id) {
          <article class="play-card shop-card" [class.owned]="entry.owned" [attr.data-category]="entry.category">
            <span class="card-chip">{{ labels[entry.category] }}</span>
            <app-card-art [id]="entry.card.id" [category]="entry.category" />
            <strong>{{ entry.card.name }}</strong>
            <small>{{ entry.card.description }}</small>
            <span class="play-card-effect">{{ entry.summary }}</span>
            <span class="play-card-rest">{{ entry.card.cooldown ? 'rests ' + entry.card.cooldown + (entry.card.cooldown === 1 ? ' turn' : ' turns') : 'no rest' }}</span>
            @if (entry.owned) {
              <span class="shop-owned">✓ In your deck</span>
            } @else {
              <button class="intro-button shop-buy" type="button" [disabled]="!!entry.blocker" [attr.aria-label]="'Buy ' + entry.card.name + ' for ' + entry.card.price + ' credits'"
                      (click)="bought.emit(entry.card.id)">🪙 {{ entry.card.price }} · Buy</button>
              @if (entry.blocker) { <small class="shop-blocker">{{ entry.blocker }}</small> }
            }
          </article>
        } @empty {
          <p class="shop-none">No cards here.</p>
        }
      </div>
      <h2 class="shop-subheading">Learned counters</h2>
      <p>Never for sale: when a corporation's instant card hits you, you learn the answer.</p>
      <div class="shop-grid">
        @for (entry of learnable(); track entry.card.id) {
          @if (entry.known) {
            <article class="play-card shop-card" [attr.data-category]="entry.category">
              <span class="card-chip">{{ labels[entry.category] }}</span>
              <app-card-art [id]="entry.card.id" [category]="entry.category" />
              <strong>{{ entry.card.name }}</strong>
              <small>{{ entry.card.description }}</small>
              <span class="play-card-effect">{{ entry.summary }}</span>
              <span class="shop-owned">✓ In your deck</span>
            </article>
          } @else {
            <article class="play-card shop-card shop-unknown">
              <span class="card-chip">???</span>
              <strong>Unknown answer</strong>
              <small>{{ entry.hint }}</small>
            </article>
          }
        }
      </div>
      <button class="intro-button event-decline shop-close" type="button" autofocus (click)="closed.emit()">Close</button>
    </dialog>
  `
})
export class CardShopComponent extends ModalDialog {
  readonly entries = input.required<ShopEntry[]>();

  /** Shop order: blockers, damage, heal, combo, instant battle; cheapest first within a kind. */
  private static readonly order: Record<CardCategory, number> = { block: 0, counter: 0, damage: 1, heal: 2, combo: 3, instant: 4 };
  protected readonly filters: { id: CardCategory | 'all' | 'affordable'; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'block', label: 'Block' }, { id: 'damage', label: 'Damage' }, { id: 'heal', label: 'Heal' },
    { id: 'combo', label: 'Combo' }, { id: 'instant', label: 'Instant battle' }, { id: 'affordable', label: 'Affordable' }
  ];
  protected readonly filter = signal<CardCategory | 'all' | 'affordable'>('all');
  protected readonly shown = computed(() => {
    const filter = this.filter();
    return [...this.entries()]
      .filter(entry => filter === 'all' || (filter === 'affordable' ? !entry.blocker && !entry.owned : entry.category === filter))
      .sort((a, b) => CardShopComponent.order[a.category] - CardShopComponent.order[b.category] || a.card.price - b.card.price);
  });
  readonly credits = input.required<number>();
  /** How credits are earned, in a few words. */
  readonly earnRules = input('');
  readonly learnable = input<LearnEntry[]>([]);
  readonly bought = output<string>();
  readonly closed = output<void>();
  protected readonly labels: Record<CardCategory, string> = { damage: 'Damage', block: 'Block', heal: 'Heal', instant: 'Instant battle', counter: 'Counter', combo: 'Combo' };
}
