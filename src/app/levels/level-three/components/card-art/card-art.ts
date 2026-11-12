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
        @case ('not-your-buddy') {
          <!-- two speech bubbles shouting at each other -->
          <path class="art-fill" d="M6 10 H32 V30 H18 L12 36 V30 H6 Z" />
          <path class="art-fill" d="M58 28 H32 V48 H46 L52 54 V48 H58 Z" />
          <path d="M14 20 H24 M40 38 H50" stroke-width="2.5" />
          <path d="M20 44 L26 50 M26 44 L20 50" stroke-width="2" />
        }
        @case ('not-your-guy') {
          <!-- the same two bubbles, the other way round: it never ends -->
          <path class="art-fill" d="M58 10 H32 V30 H46 L52 36 V30 H58 Z" />
          <path class="art-fill" d="M6 28 H32 V48 H18 L12 54 V48 H6 Z" />
          <path d="M40 20 H50 M14 38 H24" stroke-width="2.5" />
          <path d="M38 44 A6 6 0 1 0 50 44" stroke-width="2" />
        }
        @case ('polite-apes') {
          <!-- an ape with a monocle -->
          <circle class="art-fill" cx="32" cy="32" r="20" />
          <circle cx="13" cy="30" r="5" stroke-width="2.5" />
          <circle cx="51" cy="30" r="5" stroke-width="2.5" />
          <circle cx="25" cy="27" r="2.5" stroke-width="2" />
          <circle cx="39" cy="27" r="5" stroke-width="2" />
          <path d="M44 31 L48 46" stroke-width="1.5" />
          <path d="M24 40 Q32 45 40 40" stroke-width="2.5" />
          <path d="M22 8 H42 L40 13 H24 Z" stroke-width="2" />
        }
        @case ('family-reunion') {
          <!-- a family photo of apes -->
          <rect class="art-fill" x="6" y="12" width="52" height="40" rx="3" />
          <circle cx="20" cy="28" r="6" stroke-width="2.5" />
          <circle cx="44" cy="28" r="6" stroke-width="2.5" />
          <circle cx="32" cy="36" r="4" stroke-width="2.5" />
          <path d="M12 48 Q20 40 28 48 M36 48 Q44 40 52 48" stroke-width="2" />
        }
        @case ('handkerchief') {
          <!-- a waving handkerchief and a sword -->
          <path class="art-fill" d="M10 12 Q22 6 30 14 Q38 22 48 14 L44 36 Q34 44 26 36 Q18 28 8 34 Z" />
          <path d="M10 12 L6 56" stroke-width="3" />
          <path d="M40 58 L58 40 M54 36 L62 44" stroke-width="3" />
        }
        @case ('janitor-job') {
          <!-- a mop and a bucket -->
          <path d="M40 6 L26 40" stroke-width="3" />
          <path class="art-fill" d="M18 38 H36 L40 46 H14 Z" />
          <path d="M16 46 L14 54 M22 46 L21 55 M28 46 L28 55 M34 46 L35 55 M40 46 L42 54" stroke-width="2" />
          <path class="art-fill" d="M44 34 H60 L57 58 H47 Z" />
        }
        @case ('like-a-cow') {
          <!-- a speech bubble with horns: the comeback -->
          <path class="art-fill" d="M10 18 H54 V44 H30 L20 54 V44 H10 Z" />
          <path d="M16 18 C10 10 14 6 20 8 M48 18 C54 10 50 6 44 8" />
          <circle cx="24" cy="31" r="2.5" stroke-width="2" />
          <circle cx="40" cy="31" r="2.5" stroke-width="2" />
          <path d="M28 37 Q32 40 36 37" stroke-width="2" />
        }
        @case ('leather-jackets') {
          <!-- a leather jacket with a price tag -->
          <path class="art-fill" d="M22 8 L32 14 L42 8 L54 16 L50 30 L46 28 V56 H18 V28 L14 30 L10 16 Z" />
          <path d="M32 14 V56 M26 22 L32 30 L38 22" stroke-width="2.5" />
          <path d="M48 40 L58 36 L60 42 L50 46 Z" stroke-width="2" />
          <circle cx="51" cy="42" r="1" stroke-width="2" />
        }
        @case ('i-hate-snakes') {
          <!-- a snake, crossed out -->
          <path class="art-fill" d="M14 50 C14 40 30 42 30 34 C30 26 16 28 16 20 C16 12 28 10 34 14 L40 10 L42 18 C36 18 26 16 26 21 C26 26 42 24 42 34 C42 46 24 44 24 50 Z" stroke-width="2.5" />
          <circle cx="36" cy="14" r="1" stroke-width="2" />
          <circle cx="32" cy="32" r="26" stroke-width="3" />
          <line x1="14" y1="14" x2="50" y2="50" stroke-width="3" />
        }
        @case ('plan-is-bananas') {
          <!-- a banana with a question mark -->
          <path class="art-fill" d="M10 22 C10 46 34 56 50 46 C36 46 22 38 20 20 Z" />
          <path d="M10 22 L16 17" />
          <path d="M38 10 C38 4 50 4 50 11 C50 16 44 16 44 22 M44 28 V29" stroke-width="3" />
        }
        @case ('not-monoculture') {
          <!-- many different plants -->
          <path d="M6 54 H58" />
          <path class="art-fill" d="M14 54 V40 M14 40 C6 38 6 30 14 30 C22 30 22 38 14 40 Z" />
          <path class="art-fill" d="M32 54 V34 M32 34 L24 26 L32 18 L40 26 Z" />
          <path class="art-fill" d="M50 54 V44 M44 44 H56 L50 34 Z" />
        }
        @case ('also-bought-robots') {
          <!-- a shopping cart with a robot in it -->
          <path class="art-fill" d="M12 26 H54 L48 44 H18 Z" />
          <path d="M4 16 H10 L18 44 M20 52 A3 3 0 1 0 20 53 M44 52 A3 3 0 1 0 44 53" />
          <rect x="26" y="10" width="14" height="12" rx="3" stroke-width="2.5" />
          <path d="M31 16 V16 M35 16 V16" stroke-width="3" />
        }
        @case ('return-robot') {
          <!-- a parcel going back -->
          <path class="art-fill" d="M16 24 L36 14 L56 24 V46 L36 56 L16 46 Z" />
          <path d="M16 24 L36 34 L56 24 M36 34 V56" stroke-width="2.5" />
          <path d="M14 10 H4 V20 M4 10 C10 4 20 4 26 12" stroke-width="3" />
        }
        @case ('bigger-rocket') {
          <!-- a huge rocket next to a tiny house -->
          <path class="art-fill" d="M40 4 C52 14 52 34 48 46 H32 C28 34 28 14 40 4 Z" />
          <circle cx="40" cy="22" r="4" />
          <path d="M32 40 L24 50 L32 48 M48 40 L56 50 L48 48" />
          <path d="M6 56 L13 49 L20 56 Z M8 56 V60 H18 V56" stroke-width="2" />
        }
        @case ('compensating') {
          <!-- a ruler with a raised eyebrow -->
          <rect class="art-fill" x="6" y="34" width="52" height="14" rx="2" />
          <path d="M14 34 V40 M22 34 V44 M30 34 V40 M38 34 V44 M46 34 V40 M54 34 V44" stroke-width="2" />
          <path d="M20 18 Q28 10 36 16" />
          <circle cx="28" cy="24" r="2.5" stroke-width="2.5" />
          <circle cx="44" cy="24" r="2.5" stroke-width="2.5" />
          <path d="M40 14 L48 16" />
        }
        @case ('whistleblower') {
          <!-- a whistle with sound waves -->
          <path class="art-fill" d="M8 30 H34 A12 12 0 1 1 22 42 H8 Z" />
          <circle cx="34" cy="42" r="4" stroke-width="2.5" />
          <path d="M42 18 L48 10 M50 24 L58 20 M36 14 L38 6" stroke-width="2.5" />
        }
        @case ('open-source') {
          <!-- code brackets around a heart -->
          <path d="M20 16 L8 32 L20 48 M44 16 L56 32 L44 48" stroke-width="4" />
          <path class="art-fill" d="M32 44 C22 37 22 29 27 28 C30 27.5 32 30 32 31 C32 30 34 27.5 37 28 C42 29 42 37 32 44 Z" stroke-width="2.5" />
        }
        @case ('viral-petition') {
          <!-- a clipboard full of signatures -->
          <rect class="art-fill" x="12" y="10" width="40" height="48" rx="3" />
          <rect x="24" y="6" width="16" height="8" rx="2" stroke-width="2.5" />
          <path d="M18 24 C22 20 24 28 28 24 M18 34 C22 30 24 38 28 34 M18 44 C22 40 24 48 28 44" stroke-width="2" />
          <path d="M34 24 H46 M34 34 H46 M34 44 H46" stroke-width="2" />
        }
        @case ('general-strike') {
          <!-- a raised fist -->
          <path class="art-fill" d="M20 30 V18 A4 4 0 0 1 28 18 V14 A4 4 0 0 1 36 14 V16 A4 4 0 0 1 44 18 V40 C44 50 38 54 32 54 H28 C22 54 18 48 18 42 V34 A4 4 0 0 1 20 30 Z" />
          <path d="M28 18 V28 M36 16 V28 M20 30 C24 30 28 32 28 36" stroke-width="2.5" />
          <path d="M24 60 H40" />
        }
        @case ('fact-check-marathon') {
          <!-- a stopwatch with a check mark -->
          <circle class="art-fill" cx="32" cy="36" r="20" />
          <path d="M26 6 H38 M32 6 V16 M48 18 L52 14" />
          <path d="M23 36 L30 43 L42 29" />
        }
        @case ('union-contract') {
          <!-- a contract with a seal -->
          <path class="art-fill" d="M12 6 H42 L52 16 V58 H12 Z" />
          <path d="M42 6 V16 H52 M20 22 H40 M20 30 H44 M20 38 H32" stroke-width="2.5" />
          <circle cx="42" cy="46" r="7" stroke-width="2.5" />
          <path d="M38 52 L36 60 L42 57 L48 60 L46 52" stroke-width="2" />
        }
        @case ('tax-audit') {
          <!-- a calculator with a percent sign -->
          <rect class="art-fill" x="14" y="6" width="36" height="52" rx="4" />
          <rect x="20" y="12" width="24" height="12" rx="2" stroke-width="2.5" />
          <path d="M24 48 L40 32" stroke-width="2.5" />
          <circle cx="25" cy="33" r="3" stroke-width="2.5" />
          <circle cx="39" cy="47" r="3" stroke-width="2.5" />
        }
        @case ('banana-republic') {
          <!-- a flag with a banana -->
          <line x1="12" y1="6" x2="12" y2="60" />
          <path class="art-fill" d="M12 8 H54 L46 20 L54 32 H12 Z" />
          <path d="M22 14 C22 26 34 30 42 26 C35 26 28 22 27 13 Z" stroke-width="2" />
        }
        @case ('prime-lockdown') {
          <!-- a padlock on a parcel -->
          <path class="art-fill" d="M10 30 H54 V58 H10 Z" />
          <path d="M20 30 V20 A12 12 0 0 1 44 20 V30" />
          <circle cx="32" cy="42" r="4" stroke-width="2.5" />
          <path d="M32 46 V52" stroke-width="2.5" />
        }
        @case ('algorithm-change') {
          <!-- shuffle arrows -->
          <path d="M6 18 H20 C34 18 30 46 44 46 H56 M50 40 L56 46 L50 52" />
          <path d="M6 46 H20 C26 46 28 40 30 34 M36 24 C38 20 40 18 44 18 H56 M50 12 L56 18 L50 24" />
          <circle class="art-fill" cx="32" cy="32" r="5" stroke-width="2" />
        }
        @case ('respect-my-authority') {
          <!-- a sheriff's star -->
          <path class="art-fill" d="M32 4 L38 20 L56 20 L42 31 L47 49 L32 39 L17 49 L22 31 L8 20 L26 20 Z" />
          <circle cx="32" cy="27" r="6" stroke-width="2.5" />
          <path d="M20 56 H44 M24 60 H40" stroke-width="2.5" />
        }
        @case ('free-shipping') {
          <!-- a parcel with an asterisk -->
          <path class="art-fill" d="M8 22 L28 12 L48 22 V46 L28 56 L8 46 Z" />
          <path d="M8 22 L28 32 L48 22 M28 32 V56" stroke-width="2.5" />
          <path d="M54 8 V20 M48 11 L60 17 M60 11 L48 17" stroke-width="2.5" />
        }
        @case ('coupon-spam') {
          <!-- a stack of coupons -->
          <path class="art-fill" d="M8 20 H56 V30 A4 4 0 0 0 56 38 V48 H8 V38 A4 4 0 0 0 8 30 Z" />
          <path d="M24 20 V48" stroke-dasharray="3 3" stroke-width="2" />
          <path d="M34 28 L46 40 M46 28 L34 40" stroke-width="2.5" />
          <path d="M12 14 H52" stroke-width="2" />
        }
        @case ('mystery-box') {
          <!-- a box with a question mark -->
          <rect class="art-fill" x="10" y="20" width="44" height="36" rx="3" />
          <path d="M10 30 H54 M32 20 V56" stroke-width="2" />
          <path d="M24 14 C24 6 40 6 40 13 C40 18 34 18 34 22" stroke-width="2.5" />
        }
        @case ('sponsored-result') {
          <!-- a search bar with a dollar sign -->
          <rect class="art-fill" x="6" y="22" width="52" height="16" rx="8" />
          <circle cx="16" cy="30" r="4" stroke-width="2.5" />
          <path d="M19 33 L22 36" stroke-width="2.5" />
          <path d="M40 24 V36 M44 26 C44 24 36 24 36 27 C36 30 44 30 44 33 C44 36 36 36 36 34" stroke-width="2" />
          <path d="M12 46 H52 M12 52 H40" stroke-width="2" />
        }
        @case ('cookie-banner') {
          <!-- a cookie with a bite missing -->
          <path class="art-fill" d="M50 22 A20 20 0 1 1 42 12 A6 6 0 0 0 50 22 Z" />
          <circle cx="24" cy="28" r="2.5" stroke-width="2.5" />
          <circle cx="34" cy="40" r="2.5" stroke-width="2.5" />
          <circle cx="22" cy="44" r="2.5" stroke-width="2.5" />
          <circle cx="40" cy="28" r="2" stroke-width="2.5" />
        }
        @case ('ad-auction') {
          <!-- a bidding paddle -->
          <circle class="art-fill" cx="30" cy="24" r="16" />
          <path d="M30 40 V58" stroke-width="5" />
          <path d="M24 24 H36 M30 18 V30" stroke-width="2.5" />
          <path d="M48 14 L54 10 M50 24 H58" stroke-width="2.5" />
        }
        @case ('give-us-your-data') {
          <!-- a search bar that autocompletes -->
          <rect class="art-fill" x="6" y="12" width="52" height="16" rx="8" />
          <circle cx="16" cy="20" r="4" stroke-width="2.5" />
          <path d="M26 20 H48" stroke-width="2.5" />
          <path d="M10 36 H54 V56 H10 Z" stroke-width="2" />
          <path d="M16 42 H44 M16 48 H38" stroke-width="2" />
        }
        @case ('did-you-mean-no') {
          <!-- a speech bubble that says no -->
          <path class="art-fill" d="M8 12 H56 V42 H26 L14 54 V42 H8 Z" />
          <path d="M18 34 V20 L28 34 V20 M36 27 A6 7 0 1 0 48 27 A6 7 0 1 0 36 27" stroke-width="2.5" />
        }
        @case ('supreme-court') {
          <!-- a courthouse with a falling gavel -->
          <path class="art-fill" d="M8 24 L32 10 L56 24 Z" />
          <path d="M12 28 V50 M22 28 V50 M42 28 V50 M52 28 V50" stroke-width="3" />
          <path d="M6 54 H58" stroke-width="3" />
          <path class="art-fill" d="M26 34 L36 30 L39 37 L29 41 Z" />
          <path d="M33 39 L38 50" stroke-width="2.5" />
        }
        @case ('global-solidarity') {
          <!-- a globe held by hands, with a heart -->
          <circle class="art-fill" cx="32" cy="26" r="16" />
          <path d="M16 26 H48 M32 10 C24 18 24 34 32 42 C40 34 40 18 32 10" stroke-width="2" />
          <path d="M6 46 Q14 44 20 50 L28 54 M58 46 Q50 44 44 50 L36 54" stroke-width="2.5" />
          <path d="M32 58 L28 54 A2.5 2.5 0 0 1 32 51 A2.5 2.5 0 0 1 36 54 Z" stroke-width="2" />
        }
        @case ('toshiba-handybook') {
          <!-- an open notebook computer, full of notes -->
          <path class="art-fill" d="M12 12 H52 V40 H12 Z" />
          <path d="M6 46 H58 L54 52 H10 Z" stroke-width="2.5" />
          <path d="M18 20 H40 M18 26 H46 M18 32 H34" stroke-width="2" />
          <path d="M50 4 V12 M46 8 H54" stroke-width="2" />
        }
        @case ('turntables') {
          <!-- a turntable with arrows going round -->
          <circle class="art-fill" cx="30" cy="34" r="20" />
          <circle cx="30" cy="34" r="4" stroke-width="2.5" />
          <path d="M54 10 L48 30" stroke-width="2.5" />
          <path d="M14 18 A22 22 0 0 1 40 12 M40 12 L36 8 M40 12 L35 15" stroke-width="2" />
          <path d="M46 50 A22 22 0 0 1 20 56 M20 56 L24 60 M20 56 L25 53" stroke-width="2" />
        }
        @case ('all-hands-on-deck') {
          <!-- a fan of cards -->
          <rect class="art-fill" x="10" y="16" width="20" height="30" rx="3" transform="rotate(-18 20 46)" />
          <rect class="art-fill" x="22" y="12" width="20" height="30" rx="3" />
          <rect class="art-fill" x="34" y="16" width="20" height="30" rx="3" transform="rotate(18 44 46)" />
          <path d="M28 20 L36 20 M28 26 L36 26" stroke-width="2" />
          <path d="M16 56 H48" stroke-width="2.5" />
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
            @case ('special') { <path class="art-fill" d="M10 46 L14 18 L24 30 L32 12 L40 30 L50 18 L54 46 Z" /> }
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
