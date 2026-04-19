import type { ButtonName } from '@ctrlr/types';
import { normalizeAxisI16LE } from '../deadzone.js';
import { type ControllerParser, emptyState, type ParsedState } from './types.js';

/**
 * Xbox One / Series controller in HID mode (Bluetooth, or USB on Linux/macOS
 * via the `xpad` / hid-microsoft drivers). Newer firmware exposes a
 * GIP-compatible HID report:
 *
 * Bytes 1-2:  LX (int16 LE)
 * Bytes 3-4:  LY (int16 LE)
 * Bytes 5-6:  RX (int16 LE)
 * Bytes 7-8:  RY (int16 LE)
 * Bytes 9-10: LT (uint10, range 0-1023)
 * Bytes 11-12:RT (uint10, range 0-1023)
 * Byte 13:    D-pad hat (0-7, 8 = neutral)
 * Byte 14:    A (bit0), B (bit1), X (bit2), Y (bit3),
 *             LB (bit4), RB (bit5), select (bit6), start (bit7)
 * Byte 15:    LSB (bit0), RSB (bit1), Xbox/Guide (bit2)
 *
 * Older Xbox 360 controllers on Windows expose XInput, NOT HID — we can't
 * see those without an XInput shim. The README documents this constraint.
 *
 * NOTE: When `node-hid` returns the report, byte 0 may or may not be the
 * report id depending on transport. We try to detect that by length.
 */
const HAT_TO_DPAD: Array<{ up: boolean; down: boolean; left: boolean; right: boolean }> = [
  { up: false, down: false, left: false, right: false }, // 0 neutral on some firmwares
  { up: true, down: false, left: false, right: false }, // 1 N
  { up: true, down: false, left: false, right: true }, // 2 NE
  { up: false, down: false, left: false, right: true }, // 3 E
  { up: false, down: true, left: false, right: true }, // 4 SE
  { up: false, down: true, left: false, right: false }, // 5 S
  { up: false, down: true, left: true, right: false }, // 6 SW
  { up: false, down: false, left: true, right: false }, // 7 W
  { up: true, down: false, left: true, right: false }, // 8 NW
];

export const xboxParser: ControllerParser = {
  vendor: 'xbox',

  matches(vendorId, productId) {
    if (vendorId !== 0x045e) return false;
    return [
      0x028e, 0x02d1, 0x02dd, 0x02e3, 0x02ea, 0x02fd, 0x0b00, 0x0b12, 0x0b13,
    ].includes(productId);
  },

  parse(report) {
    if (report.length < 16) return null;
    // Trim a leading report id byte if present (length 17 vs 16).
    const offset = report.length >= 17 ? 1 : 0;
    const lxLo = report[offset + 0];
    const lxHi = report[offset + 1];
    const lyLo = report[offset + 2];
    const lyHi = report[offset + 3];
    const rxLo = report[offset + 4];
    const rxHi = report[offset + 5];
    const ryLo = report[offset + 6];
    const ryHi = report[offset + 7];
    const ltLo = report[offset + 8];
    const ltHi = report[offset + 9];
    const rtLo = report[offset + 10];
    const rtHi = report[offset + 11];
    const hat = report[offset + 12];
    const faceShoulder = report[offset + 13];
    const stickGuide = report[offset + 14];

    if (
      lxLo === undefined ||
      lxHi === undefined ||
      lyLo === undefined ||
      lyHi === undefined ||
      rxLo === undefined ||
      rxHi === undefined ||
      ryLo === undefined ||
      ryHi === undefined ||
      ltLo === undefined ||
      ltHi === undefined ||
      rtLo === undefined ||
      rtHi === undefined ||
      hat === undefined ||
      faceShoulder === undefined ||
      stickGuide === undefined
    ) {
      return null;
    }

    const hatIdx = Math.min(hat, 8);
    const hatState = HAT_TO_DPAD[hatIdx] ?? HAT_TO_DPAD[0]!;

    const buttons: Partial<Record<ButtonName, boolean>> = {
      A: (faceShoulder & 0x01) !== 0,
      B: (faceShoulder & 0x02) !== 0,
      X: (faceShoulder & 0x04) !== 0,
      Y: (faceShoulder & 0x08) !== 0,
      LB: (faceShoulder & 0x10) !== 0,
      RB: (faceShoulder & 0x20) !== 0,
      BACK: (faceShoulder & 0x40) !== 0,
      START: (faceShoulder & 0x80) !== 0,
      LSB: (stickGuide & 0x01) !== 0,
      RSB: (stickGuide & 0x02) !== 0,
      GUIDE: (stickGuide & 0x04) !== 0,
      DPAD_UP: hatState.up,
      DPAD_DOWN: hatState.down,
      DPAD_LEFT: hatState.left,
      DPAD_RIGHT: hatState.right,
    };

    const state: ParsedState = emptyState();
    state.buttons = buttons;
    state.sticks.left = {
      x: normalizeAxisI16LE(lxLo, lxHi),
      y: normalizeAxisI16LE(lyLo, lyHi),
    };
    state.sticks.right = {
      x: normalizeAxisI16LE(rxLo, rxHi),
      y: normalizeAxisI16LE(ryLo, ryHi),
    };

    const lt = ((ltHi << 8) | ltLo) & 0x03ff;
    const rt = ((rtHi << 8) | rtLo) & 0x03ff;
    state.triggers.LT = lt / 1023;
    state.triggers.RT = rt / 1023;
    state.buttons.LT = lt > 32;
    state.buttons.RT = rt > 32;

    return state;
  },
};
