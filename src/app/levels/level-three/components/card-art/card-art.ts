import { Component, input } from '@angular/core';
import type { CardCategory } from '../../models/utopia.model';

/**
 * The illustration of a card: a small line drawing per card id, drawn in the colour of its category (`currentColor`
 * for the lines, `.art-fill` for the tinted areas). Unknown cards get the symbol of their category.
 */
@Component({
  selector: 'app-card-art',
  host: { class: 'card-art', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      @switch (id()) {
        @case ('antitrust') {
          <!-- a gavel -->
          <g transform="rotate(-35 32 30)">
            <rect class="art-fill" x="16" y="10" width="30" height="13" rx="3" />
            <line x1="31" y1="23" x2="31" y2="48" />
          </g>
          <rect class="art-fill" x="10" y="50" width="44" height="7" rx="2" />
        }
        @case ('fact-check') {
          <!-- a magnifying glass with a check mark -->
          <circle class="art-fill" cx="27" cy="27" r="16" />
          <line x1="39" y1="39" x2="54" y2="54" stroke-width="5" />
          <path d="M19 27 l6 6 l10 -12" />
        }
        @case ('firewall') {
          <!-- a shield made of bricks -->
          <path class="art-fill" d="M32 7 L53 15 V31 C53 45 43 54 32 58 C21 54 11 45 11 31 V15 Z" />
          <path d="M12 26 H52 M12 38 H50 M22 15 V26 M42 15 V26 M32 26 V38 M22 38 V50 M42 38 V50" stroke-width="2" />
        }
        @case ('press-conference') {
          <!-- a microphone -->
          <rect class="art-fill" x="23" y="6" width="18" height="30" rx="9" />
          <path d="M15 28 C15 47 49 47 49 28" />
          <line x1="32" y1="45" x2="32" y2="56" />
          <line x1="22" y1="57" x2="42" y2="57" />
        }
        @case ('protest-march') {
          <!-- a protest sign -->
          <rect class="art-fill" x="10" y="8" width="44" height="26" rx="3" />
          <line x1="32" y1="34" x2="32" y2="58" stroke-width="4" />
          <path d="M18 18 H46 M22 25 H42" stroke-width="2.5" />
        }
        @case ('leak') {
          <!-- an envelope that drips -->
          <rect class="art-fill" x="8" y="14" width="46" height="32" rx="3" />
          <path d="M8 17 L31 34 L54 17" />
          <path class="art-fill" d="M48 50 C48 46 52 44 52 40 C52 44 56 46 56 50 A4 4 0 0 1 48 50 Z" stroke-width="2" />
        }
        @case ('community-kitchens') {
          <!-- a steaming pot -->
          <path class="art-fill" d="M12 30 H52 V43 C52 51 46 56 38 56 H26 C18 56 12 51 12 43 Z" />
          <line x1="7" y1="30" x2="57" y2="30" />
          <path d="M24 23 C21 19 27 16 24 10 M32 23 C29 19 35 16 32 10 M40 23 C37 19 43 16 40 10" stroke-width="2.5" />
        }
        @case ('shut-it-down') {
          <!-- a stop sign -->
          <path class="art-fill" d="M22 7 H42 L57 22 V42 L42 57 H22 L7 42 V22 Z" />
          <rect x="18" y="28" width="28" height="8" rx="2" />
        }
        @case ('investigative-desk') {
          <!-- a newspaper -->
          <rect class="art-fill" x="8" y="10" width="42" height="44" rx="3" />
          <path d="M50 20 H55 V48 A5 5 0 0 1 45 48" />
          <path d="M14 18 H44 M14 27 H27 M14 35 H27 M14 43 H44" stroke-width="2.5" />
          <rect x="32" y="26" width="12" height="11" stroke-width="2.5" />
        }
        @case ('pop-up-homes') {
          <!-- a house going up -->
          <path d="M8 30 L32 11 L56 30" />
          <rect class="art-fill" x="15" y="27" width="34" height="28" />
          <rect x="27" y="39" width="10" height="16" />
          <path d="M50 8 V18 M45 13 H55" stroke-width="2.5" />
        }

        @case ('dairy-farmer') {
          <!-- two crossed swords and a sharp tongue -->
          <path d="M12 12 L42 42 M52 12 L22 42" stroke-width="4" />
          <path class="art-fill" d="M38 46 L46 38 L52 44 L44 52 Z M26 46 L18 38 L12 44 L20 52 Z" />
          <path d="M8 8 L14 10 L10 14 Z M56 8 L50 10 L54 14 Z" stroke-width="2" />
          <path d="M24 56 Q32 62 40 56" stroke-width="2.5" />
        }
        @case ('like-a-cow') {
          <!-- a speech bubble with horns: the comeback -->
          <path class="art-fill" d="M10 18 H54 V44 H30 L20 54 V44 H10 Z" />
          <path d="M16 18 C10 10 14 6 20 8 M48 18 C54 10 50 6 44 8" />
          <circle cx="24" cy="31" r="2.5" stroke-width="2" />
          <circle cx="40" cy="31" r="2.5" stroke-width="2" />
          <path d="M28 37 Q32 40 36 37" stroke-width="2" />
        }
        @case ('propaganda') {
          <!-- a megaphone -->
          <path class="art-fill" d="M13 25 L41 13 V51 L13 39 Z" />
          <rect x="7" y="25" width="7" height="14" rx="1" />
          <path d="M47 24 C51 28 51 36 47 40 M52 18 C60 26 60 38 52 46" stroke-width="2.5" />
        }
        @case ('lobbyists') {
          <!-- a briefcase -->
          <rect class="art-fill" x="8" y="21" width="48" height="32" rx="3" />
          <path d="M23 21 V14 H41 V21" />
          <line x1="8" y1="34" x2="56" y2="34" />
          <rect x="28" y="30" width="8" height="8" rx="1" stroke-width="2" />
        }
        @case ('insider-trading') {
          <!-- a chart that only goes up -->
          <path d="M8 56 H56" />
          <rect class="art-fill" x="12" y="44" width="8" height="12" stroke-width="2" />
          <rect class="art-fill" x="26" y="34" width="8" height="22" stroke-width="2" />
          <rect class="art-fill" x="40" y="26" width="8" height="30" stroke-width="2" />
          <path d="M10 38 L24 26 L34 31 L52 12" />
          <path d="M43 12 H52 V21" />
        }
        @case ('banana-blockade') {
          <!-- a banana across the harbour -->
          <path class="art-fill" d="M12 16 C12 44 40 56 56 44 C41 46 25 38 22 14 Z" />
          <path d="M12 16 L19 11" />
          <path d="M6 58 C14 54 18 58 26 56 C34 54 38 58 46 56 C52 55 54 57 58 56" stroke-width="2" />
        }
        @case ('banana-influencers') {
          <!-- a phone full of likes -->
          <rect class="art-fill" x="19" y="6" width="26" height="52" rx="5" />
          <line x1="28" y1="51" x2="36" y2="51" />
          <path d="M32 37 C22 30 22 22 28 21 C30 21 32 23 32 25 C32 23 34 21 36 21 C42 22 42 30 32 37 Z" stroke-width="2.5" />
        }
        @case ('robot-night-shift') {
          <!-- a robot under the moon -->
          <rect class="art-fill" x="13" y="22" width="34" height="30" rx="6" />
          <circle cx="24" cy="36" r="3.5" />
          <circle cx="36" cy="36" r="3.5" />
          <line x1="30" y1="22" x2="30" y2="13" />
          <circle cx="30" cy="11" r="2" />
          <path d="M50 6 A9 9 0 1 0 58 18 A7 7 0 0 1 50 6 Z" stroke-width="2.5" />
        }
        @case ('same-day-smear') {
          <!-- a parcel with a smear on it -->
          <path class="art-fill" d="M10 20 L32 10 L54 20 V46 L32 56 L10 46 Z" />
          <path d="M10 20 L32 30 L54 20 M32 30 V56" />
          <path d="M38 38 C42 34 48 38 46 42 C50 44 46 50 42 47 C38 50 34 44 38 38 Z" stroke-width="2" />
        }
        @case ('warehouse-fortress') {
          <!-- a warehouse with battlements -->
          <path class="art-fill" d="M8 26 L32 12 L56 26 V55 H8 Z" />
          <path d="M18 55 V38 H46 V55 M18 44 H46 M18 50 H46" stroke-width="2.5" />
        }
        @case ('viral-smear') {
          <!-- a virus -->
          <circle class="art-fill" cx="32" cy="32" r="14" />
          <path d="M32 18 V9 M32 46 V55 M18 32 H9 M46 32 H55 M22 22 L16 16 M42 42 L48 48 M42 22 L48 16 M22 42 L16 48" />
          <circle cx="27" cy="29" r="2.5" stroke-width="2" />
          <circle cx="37" cy="35" r="2.5" stroke-width="2" />
        }
        @case ('satellite-blackout') {
          <!-- a satellite switching off the signal -->
          <rect class="art-fill" x="25" y="25" width="14" height="14" transform="rotate(45 32 32)" />
          <rect class="art-fill" x="5" y="26" width="15" height="12" stroke-width="2.5" />
          <rect class="art-fill" x="44" y="26" width="15" height="12" stroke-width="2.5" />
          <path d="M20 32 H23 M41 32 H44" />
          <path d="M24 48 L18 56 M40 48 L46 56 M26 52 L38 60" stroke-width="2" />
        }
        @case ('rocket-pr') {
          <!-- a rocket launch -->
          <path class="art-fill" d="M32 5 C45 15 45 34 40 44 H24 C19 34 19 15 32 5 Z" />
          <circle cx="32" cy="23" r="4.5" />
          <path d="M24 38 L15 49 L24 47 M40 38 L49 49 L40 47" />
          <path d="M27 48 Q32 60 37 48" stroke-width="2.5" />
        }

        @default {
          @switch (category()) {
            @case ('damage') { <path class="art-fill" d="M36 6 L14 36 H30 L26 58 L50 26 H34 Z" /> }
            @case ('block') { <path class="art-fill" d="M32 7 L53 15 V31 C53 45 43 54 32 58 C21 54 11 45 11 31 V15 Z" /> }
            @case ('heal') { <path class="art-fill" d="M32 54 C10 38 8 24 16 16 C22 10 30 12 32 18 C34 12 42 10 48 16 C56 24 54 38 32 54 Z" /> }
            @case ('instant') { <path d="M12 12 L52 52 M52 12 L12 52" stroke-width="5" /> }
            @case ('counter') { <path class="art-fill" d="M44 14 A20 20 0 1 0 52 34 M44 6 V16 H34" /> }
            @default { <path class="art-fill" d="M32 6 L39 24 L58 25 L43 37 L48 56 L32 45 L16 56 L21 37 L6 25 L25 24 Z" /> }
          }
        }
      }
    </svg>
  `
})
export class CardArtComponent {
  readonly id = input.required<string>();
  readonly category = input<CardCategory>('damage');
}
