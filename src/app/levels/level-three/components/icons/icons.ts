import { Component } from '@angular/core';

/** A coin, a circle with a dollar sign in the line style of the cart: the credits of the card shop. Sized by the font size around it. */
@Component({
  selector: 'app-coin-icon',
  host: { class: 'coin-icon', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="16" cy="16" r="13" />
      <path d="M16 7.5 V24.5" />
      <path d="M20.5 11.5 C20.5 9.5 11.5 9.2 11.5 13 C11.5 16.5 20.5 15.5 20.5 19.2 C20.5 22.8 11.5 22.5 11.5 20.5" />
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
