import { Component } from '@angular/core';

/** A flat gold coin: the credits of the card shop. Sized by the font size around it. */
@Component({
  selector: 'app-coin-icon',
  host: { class: 'coin-icon', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#c8901f" />
      <circle cx="12" cy="11.2" r="10" fill="#f5c451" />
      <circle cx="12" cy="11.2" r="6.6" fill="none" stroke="#c8901f" stroke-width="1.6" />
      <path d="M14.4 8.6 A3.4 3.4 0 1 0 14.4 13.8" fill="none" stroke="#a8721a" stroke-width="2" stroke-linecap="round" />
    </svg>
  `
})
export class CoinIconComponent {}

/** A shopping cart in the line style of the card illustrations (it takes the text colour). */
@Component({
  selector: 'app-cart-icon',
  host: { class: 'cart-icon', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 5 H7 L10.5 21 H25 L28 10 H8.6" />
      <path d="M10.5 21 L9.4 25 H26" />
      <circle cx="12" cy="28" r="1.8" />
      <circle cx="23.5" cy="28" r="1.8" />
      <path d="M14 13.5 H23 M15 17 H22" stroke-width="1.6" />
    </svg>
  `
})
export class CartIconComponent {}
