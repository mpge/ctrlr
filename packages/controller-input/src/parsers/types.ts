import type {
  ButtonName,
  ControllerEvent,
  ControllerVendor,
  StickName,
} from '@ctrlr/types';

export interface ParsedState {
  buttons: Partial<Record<ButtonName, boolean>>;
  sticks: Record<StickName, { x: number; y: number }>;
  triggers: { LT: number; RT: number };
}

export const emptyState = (): ParsedState => ({
  buttons: {},
  sticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
  triggers: { LT: 0, RT: 0 },
});

export interface ControllerParser {
  vendor: ControllerVendor;
  /** Quick eligibility check by vendor/product id. */
  matches(vendorId: number, productId: number): boolean;
  /** Parse a raw HID report into a fresh state. */
  parse(report: Buffer): ParsedState | null;
}

/**
 * Diff two states and produce normalized events. Centralized here so every
 * parser benefits from the same edge-detection logic.
 */
export function diffState(
  prev: ParsedState,
  next: ParsedState,
  controllerId: string,
  triggerThreshold = 0.05,
): ControllerEvent[] {
  const events: ControllerEvent[] = [];
  const ts = Date.now();

  // Buttons: edge-triggered.
  const allButtons = new Set<ButtonName>([
    ...(Object.keys(prev.buttons) as ButtonName[]),
    ...(Object.keys(next.buttons) as ButtonName[]),
  ]);
  for (const button of allButtons) {
    const before = prev.buttons[button] ?? false;
    const after = next.buttons[button] ?? false;
    if (before !== after) {
      events.push({ type: 'button', ts, controllerId, button, pressed: after });
    }
  }

  // Sticks: emit on any change (the action layer rate-limits crossings).
  for (const stick of ['left', 'right'] as const) {
    const a = prev.sticks[stick];
    const b = next.sticks[stick];
    if (a.x !== b.x || a.y !== b.y) {
      events.push({ type: 'stick', ts, controllerId, stick, x: b.x, y: b.y });
    }
  }

  // Triggers: emit when the value changes by more than the threshold.
  for (const trigger of ['LT', 'RT'] as const) {
    const a = prev.triggers[trigger];
    const b = next.triggers[trigger];
    if (Math.abs(a - b) >= triggerThreshold) {
      events.push({ type: 'trigger', ts, controllerId, trigger, value: b });
    }
  }

  return events;
}
