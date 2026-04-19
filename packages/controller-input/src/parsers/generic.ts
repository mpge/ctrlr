import type { ButtonName } from '@ctrlr/types';
import { normalizeAxisI8 } from '../deadzone.js';
import { type ControllerParser, type ParsedState, emptyState } from './types.js';

/**
 * Best-effort fallback for unknown gamepads that follow the rough HID
 * "generic gamepad" convention:
 *
 * Bytes 0-3: stick axes (LX, LY, RX, RY) as unsigned 8-bit centered at 128
 * Byte  4:   D-pad (low nibble hat 0-7, 8 neutral) + face buttons (bits 4-7)
 * Byte  5:   shoulder + start/select bits, layout-dependent
 *
 * If the device doesn't conform, you'll get garbage events — that's why
 * vendor-specific parsers exist. The generic parser still emits *something*,
 * which means users get visible feedback in `ctrlr controllers --watch` and
 * can file an issue with their device fingerprint.
 */
const HAT_TO_DPAD: Array<{ up: boolean; down: boolean; left: boolean; right: boolean }> = [
  { up: true, down: false, left: false, right: false },
  { up: true, down: false, left: false, right: true },
  { up: false, down: false, left: false, right: true },
  { up: false, down: true, left: false, right: true },
  { up: false, down: true, left: false, right: false },
  { up: false, down: true, left: true, right: false },
  { up: false, down: false, left: true, right: false },
  { up: true, down: false, left: true, right: false },
  { up: false, down: false, left: false, right: false },
];

export const genericParser: ControllerParser = {
  vendor: 'generic',

  matches() {
    return true; // last-resort fallback; manager only consults this if no specific parser matched.
  },

  parse(report) {
    if (report.length < 6) return null;
    const offset = report.length >= 8 ? 1 : 0;
    const lx = report[offset + 0];
    const ly = report[offset + 1];
    const rx = report[offset + 2];
    const ry = report[offset + 3];
    const dpadAndFace = report[offset + 4];
    const shoulders = report[offset + 5];

    if (
      lx === undefined ||
      ly === undefined ||
      rx === undefined ||
      ry === undefined ||
      dpadAndFace === undefined ||
      shoulders === undefined
    ) {
      return null;
    }

    const hat = dpadAndFace & 0x0f;
    const face = dpadAndFace >> 4;
    const hatState = HAT_TO_DPAD[Math.min(hat, 8)] ?? HAT_TO_DPAD[8]!;

    const buttons: Partial<Record<ButtonName, boolean>> = {
      A: (face & 0x01) !== 0,
      B: (face & 0x02) !== 0,
      X: (face & 0x04) !== 0,
      Y: (face & 0x08) !== 0,
      LB: (shoulders & 0x01) !== 0,
      RB: (shoulders & 0x02) !== 0,
      LT: (shoulders & 0x04) !== 0,
      RT: (shoulders & 0x08) !== 0,
      BACK: (shoulders & 0x10) !== 0,
      START: (shoulders & 0x20) !== 0,
      LSB: (shoulders & 0x40) !== 0,
      RSB: (shoulders & 0x80) !== 0,
      DPAD_UP: hatState.up,
      DPAD_DOWN: hatState.down,
      DPAD_LEFT: hatState.left,
      DPAD_RIGHT: hatState.right,
    };

    const state: ParsedState = emptyState();
    state.buttons = buttons;
    state.sticks.left = { x: normalizeAxisI8(lx), y: normalizeAxisI8(ly) };
    state.sticks.right = { x: normalizeAxisI8(rx), y: normalizeAxisI8(ry) };
    return state;
  },
};
