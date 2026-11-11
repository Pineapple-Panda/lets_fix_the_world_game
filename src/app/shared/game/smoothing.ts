/**
 * Smooth value updates. The game logic ticks once per second; in between, the shown numbers and bars move from what
 * was shown at the last tick towards the new state. Each level says which numbers glide with a `Smoothing`.
 */

/** Milliseconds per game tick. */
export const tickMs = 1000;
/** Milliseconds between two drawn frames while values glide. */
export const frameMs = 50;

/** Named numbers of a state, e.g. `{ actions: 1200, 'world.climate': 40.5 }`. */
export type Values = Record<string, number>;

/** Which numbers of a state glide, and how they go back into it (rounded where the game shows whole numbers). */
export interface Smoothing<T> {
  read(state: T): Values;
  write(state: T, values: Values): T;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** `to` with its gliding numbers moved `t` (0–1) of the way from `from`. Numbers missing in `from` show their new value. */
export function blend<T>(smoothing: Smoothing<T>, from: Values | null, to: T, t: number): T {
  if (!from || t >= 1) return to;
  const target = smoothing.read(to);
  const values: Values = {};
  for (const [key, value] of Object.entries(target)) {
    const start = from[key];
    values[key] = start === undefined ? value : lerp(start, value, Math.max(0, t));
  }
  return smoothing.write(to, values);
}

/** A player action changed the state: the shown start values move by the same amounts, so the change shows at once. */
export function shifted<T>(smoothing: Smoothing<T>, from: Values | null, before: T, after: T): Values | null {
  if (!from) return null;
  const old = smoothing.read(before);
  const next = smoothing.read(after);
  const values: Values = {};
  for (const [key, value] of Object.entries(next)) {
    const start = from[key];
    const previous = old[key];
    values[key] = start === undefined || previous === undefined ? value : start + value - previous;
  }
  return values;
}

/** `{ climate: 4 }` with prefix `world` → `{ 'world.climate': 4 }`. */
export function prefixed(prefix: string, record: Record<string, number>): Values {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [`${prefix}.${key}`, value]));
}

/** The record back from prefixed values; keys without a value keep the one in `record`. */
export function unprefixed<R extends Record<string, number>>(prefix: string, values: Values, record: R): R {
  const result: Record<string, number> = { ...record };
  for (const key of Object.keys(record)) {
    const value = values[`${prefix}.${key}`];
    if (value !== undefined) result[key] = value;
  }
  return result as R;
}
