import { Component, output } from '@angular/core';

/** Level 3 is lost: the screen fades to black, then the verdict appears. */
@Component({
  selector: 'app-game-over',
  template: `
    <div class="game-over" role="alertdialog" aria-labelledby="game-over-title" aria-describedby="game-over-text">
      <div class="game-over-content">
        <h1 id="game-over-title">Game Over</h1>
        <p id="game-over-text">You achieved so much and changed nothing…</p>
        <button class="intro-button game-over-retry" type="button" (click)="retry.emit()">Try again</button>
      </div>
    </div>
  `
})
export class GameOverComponent {
  readonly retry = output<void>();
}
