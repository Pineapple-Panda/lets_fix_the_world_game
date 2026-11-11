import { Component, input, output } from '@angular/core';
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
      <p>Every won battle earns {{ creditsPerWin() }} {{ creditsPerWin() === 1 ? 'credit' : 'credits' }}. Bought cards join your deck for good.</p>
      <div class="shop-grid">
        @for (entry of entries(); track entry.card.id) {
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
        }
      </div>
      <button class="intro-button event-decline shop-close" type="button" autofocus (click)="closed.emit()">Close</button>
    </dialog>
  `
})
export class CardShopComponent extends ModalDialog {
  readonly entries = input.required<ShopEntry[]>();
  readonly credits = input.required<number>();
  readonly creditsPerWin = input(1);
  readonly bought = output<string>();
  readonly closed = output<void>();
  protected readonly labels: Record<CardCategory, string> = { damage: 'Damage', block: 'Block', heal: 'Heal', instant: 'Instant battle', counter: 'Counter', combo: 'Combo' };
}
