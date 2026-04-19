import type { Action, BindingConfig, ButtonEvent, StickEvent, TriggerEvent } from '@ctrlr/types';
import type { StickEdgeDetector } from './stick.js';

export interface Resolved {
  action: Action;
  source: string; // For status bar: "A", "left-stick →", etc.
}

/**
 * Map a normalized controller event to an action via the bindings config.
 * Returns null if no binding matches (or for stick events that haven't crossed
 * a threshold).
 */
export function resolveBindingForEvent(
  event: ButtonEvent | StickEvent | TriggerEvent,
  bindings: BindingConfig,
  stickDetector: StickEdgeDetector,
): Resolved | null {
  if (event.type === 'button') {
    if (!event.pressed) return null; // act on press, not release
    const b = bindings.buttons[event.button];
    if (!b) return null;
    return { action: b.action, source: event.button };
  }
  if (event.type === 'stick') {
    const cfg = bindings.sticks?.[event.stick];
    if (!cfg) return null;
    const threshold = cfg.threshold ?? 0.6;
    const dir = stickDetector.feed(event.stick, cfg.axis, event.x, event.y, threshold);
    if (dir === 'neutral') return null;
    const action = dir === 'positive' ? cfg.positive : cfg.negative;
    const arrow =
      cfg.axis === 'x' ? (dir === 'positive' ? '→' : '←') : dir === 'positive' ? '↓' : '↑';
    return { action, source: `${event.stick}-stick ${arrow}` };
  }
  if (event.type === 'trigger') {
    const t = bindings.triggers?.[event.trigger];
    if (!t) return null;
    // Triggers currently fire once per ≥0.5 crossing.
    if (event.value < 0.5) return null;
    return { action: t.action, source: event.trigger };
  }
  return null;
}
