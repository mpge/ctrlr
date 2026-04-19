import type { StickAxis, StickName } from '@ctrlr/types';

type Direction = 'positive' | 'negative' | 'neutral';

/**
 * Sticks emit continuously while pushed, but bindings expect discrete events
 * ("cycle next pane"). This detector tracks the most-recent zone the stick
 * was in and only fires when it crosses into a new zone, with a 250ms cooldown
 * to keep heavy-handed flicks from firing twice.
 */
export class StickEdgeDetector {
  private state: Record<StickName, Direction> = { left: 'neutral', right: 'neutral' };
  private lastFireMs: Record<StickName, number> = { left: 0, right: 0 };

  feed(
    stick: StickName,
    axis: StickAxis,
    x: number,
    y: number,
    threshold: number,
    cooldownMs = 250,
    now: number = Date.now(),
  ): Direction {
    const value = axis === 'x' ? x : y;
    const next: Direction =
      value >= threshold ? 'positive' : value <= -threshold ? 'negative' : 'neutral';
    const prev = this.state[stick];
    if (next === prev) return 'neutral';
    if (next === 'neutral') {
      this.state[stick] = 'neutral';
      return 'neutral';
    }
    if (now - this.lastFireMs[stick] < cooldownMs) {
      // Cooldown still in effect: drop the event without advancing state, so
      // the next sample (once cooldown expires) still sees this as a fresh
      // crossing and fires.
      return 'neutral';
    }
    this.state[stick] = next;
    this.lastFireMs[stick] = now;
    return next;
  }
}
