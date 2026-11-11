import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import { blend, shifted, tickMs, type Smoothing, type Values } from './smoothing';

/** How far (0–1) the time is between the last game tick and the next one. Shared by all levels. */
export class TickClock {
  private startedAt = performance.now();
  private readonly now = signal(this.startedAt);
  readonly progress: Signal<number> = computed(() => Math.min(1, Math.max(0, (this.now() - this.startedAt) / tickMs)));

  /** A frame is drawn: the gliding values move on. */
  frame(): void {
    this.now.set(performance.now());
  }

  /** A game tick happened: gliding starts over. */
  tick(): void {
    this.startedAt = performance.now();
    this.now.set(this.startedAt);
  }
}

/**
 * The state of one level and what is shown of it. `state` is the real state the game works with; `display` is the
 * same state with its gliding numbers on their way from the last tick to the new one. `T` may include null (level not
 * reached).
 */
export class Smoother<T> {
  readonly state: WritableSignal<T>;
  private readonly from = signal<Values | null>(null);
  readonly display: Signal<T> = computed(() => {
    const state = this.state();
    return state == null ? state : blend(this.smoothing, this.from(), state as NonNullable<T>, this.clock.progress());
  });

  constructor(private readonly smoothing: Smoothing<NonNullable<T>>, private readonly clock: TickClock, initial: T) {
    this.state = signal(initial);
  }

  /** A game tick: glide from what is shown right now to the new state, starting now. */
  tick(next: T): void {
    const shown = this.display();
    this.from.set(shown == null ? null : this.smoothing.read(shown as NonNullable<T>));
    this.state.set(next);
    this.clock.tick();
  }

  /** A player action: the shown values change by the same amounts right away and keep gliding. */
  change(next: T): void {
    const before = this.state();
    this.from.update(from => before == null || next == null ? null
      : shifted(this.smoothing, from, before as NonNullable<T>, next as NonNullable<T>));
    this.state.set(next);
  }

  /** A new state without gliding (new game, level switch, restart). */
  set(next: T): void {
    this.from.set(null);
    this.state.set(next);
  }
}
