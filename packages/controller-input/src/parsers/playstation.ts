import type { ButtonName } from '@ctrlr/types';
import { normalizeAxisI8 } from '../deadzone.js';
import { type ControllerParser, emptyState, type ParsedState } from './types.js';

/**
 * DualShock 4 / DualSense USB HID input report (report id 0x01).
 *
 * Byte 0:    report id (0x01)
 * Bytes 1-2: left stick X, Y (uint8 each, centered at 128)
 * Bytes 3-4: right stick X, Y
 * Byte 5:    low nibble = D-pad as hat switch (0=N, 1=NE, … 7=NW, 8=neutral)
 *            high nibble = square (bit4), cross (bit5), circle (bit6), triangle (bit7)
 * Byte 6:    L1 (bit0), R1 (bit1), L2-digital (bit2), R2-digital (bit3),
 *            share (bit4), options (bit5), L3 (bit6), R3 (bit7)
 * Byte 7:    PS (bit0), touchpad click (bit1)
 * Byte 8:    L2 analog (uint8)
 * Byte 9:    R2 analog (uint8)
 *
 * The DualSense uses the same layout for the first 10 bytes when in compat
 * mode, which is what the kernel exposes to userspace HID without the special
 * enable sequence. That's good enough for us.
 */
const HAT_TO_DPAD: Array<{ up: boolean; down: boolean; left: boolean; right: boolean }> = [
  { up: true, down: false, left: false, right: false }, // 0 N
  { up: true, down: false, left: false, right: true }, // 1 NE
  { up: false, down: false, left: false, right: true }, // 2 E
  { up: false, down: true, left: false, right: true }, // 3 SE
  { up: false, down: true, left: false, right: false }, // 4 S
  { up: false, down: true, left: true, right: false }, // 5 SW
  { up: false, down: false, left: true, right: false }, // 6 W
  { up: true, down: false, left: true, right: false }, // 7 NW
  { up: false, down: false, left: false, right: false }, // 8 neutral
];

export const playstationParser: ControllerParser = {
  vendor: 'playstation',

  matches(vendorId, productId) {
    if (vendorId !== 0x054c) return false;
    return [0x05c4, 0x09cc, 0x0ba0, 0x0ce6, 0x0df2].includes(productId);
  },

  parse(report) {
    if (report.length < 10) return null;
    // Some transports prepend the report id, some don't. Detect by length.
    const offset = report[0] === 0x01 && report.length >= 11 ? 1 : 0;
    const lx = report[offset + 0];
    const ly = report[offset + 1];
    const rx = report[offset + 2];
    const ry = report[offset + 3];
    const dpadAndFace = report[offset + 4];
    const shoulderAndStart = report[offset + 5];
    const ps = report[offset + 6];
    const lt = report[offset + 7];
    const rt = report[offset + 8];

    if (
      lx === undefined ||
      ly === undefined ||
      rx === undefined ||
      ry === undefined ||
      dpadAndFace === undefined ||
      shoulderAndStart === undefined ||
      ps === undefined ||
      lt === undefined ||
      rt === undefined
    ) {
      return null;
    }

    const hat = dpadAndFace & 0x0f;
    const face = dpadAndFace >> 4;
    const hatState = HAT_TO_DPAD[Math.min(hat, 8)] ?? HAT_TO_DPAD[8]!;

    const buttons: Partial<Record<ButtonName, boolean>> = {
      X: (face & 0x01) !== 0, // square → X (left face)
      A: (face & 0x02) !== 0, // cross → A (bottom face)
      B: (face & 0x04) !== 0, // circle → B (right face)
      Y: (face & 0x08) !== 0, // triangle → Y (top face)
      LB: (shoulderAndStart & 0x01) !== 0,
      RB: (shoulderAndStart & 0x02) !== 0,
      BACK: (shoulderAndStart & 0x10) !== 0, // share
      START: (shoulderAndStart & 0x20) !== 0, // options
      LSB: (shoulderAndStart & 0x40) !== 0,
      RSB: (shoulderAndStart & 0x80) !== 0,
      GUIDE: (ps & 0x01) !== 0,
      DPAD_UP: hatState.up,
      DPAD_DOWN: hatState.down,
      DPAD_LEFT: hatState.left,
      DPAD_RIGHT: hatState.right,
    };

    const state: ParsedState = emptyState();
    state.buttons = buttons;
    state.sticks.left = { x: normalizeAxisI8(lx), y: normalizeAxisI8(ly) };
    state.sticks.right = { x: normalizeAxisI8(rx), y: normalizeAxisI8(ry) };
    state.triggers.LT = lt / 255;
    state.triggers.RT = rt / 255;

    // Digital trigger bits also map onto LT/RT presence so bindings on "LT"
    // as a button still work.
    const ltDigital = (shoulderAndStart & 0x04) !== 0 || lt > 32;
    const rtDigital = (shoulderAndStart & 0x08) !== 0 || rt > 32;
    state.buttons.LT = ltDigital;
    state.buttons.RT = rtDigital;

    return state;
  },
};
