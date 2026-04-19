/**
 * Radial deadzone. Below `deadzone`, both axes are zeroed. Above, the magnitude
 * is rescaled so the output is continuous from 0 → 1 across the live range.
 *
 * Threshold defaults to 0.15 — Microsoft's recommended deadzone for the Xbox
 * stick is 7849/32767 ≈ 0.24, but we err lower for responsiveness because our
 * "stick crossing threshold" event is already discrete in @ctrlr/core.
 */
export function applyDeadzone(x: number, y: number, deadzone = 0.15): { x: number; y: number } {
  const magnitude = Math.hypot(x, y);
  if (magnitude < deadzone) return { x: 0, y: 0 };
  const scale = (magnitude - deadzone) / (1 - deadzone) / magnitude;
  const cx = clamp(x * scale, -1, 1);
  const cy = clamp(y * scale, -1, 1);
  return { x: cx, y: cy };
}

export function normalizeAxisI8(byte: number, deadzone = 0.15): number {
  // Many gamepads report sticks as unsigned 8-bit (0..255) centered at 128.
  // The negative half spans 128 values (0..127) and the positive half 127
  // (129..255), so we divide by the appropriate half-range to keep the output
  // exactly in [-1, 1] without needing a clamp.
  const centered = byte - 128;
  const v = centered < 0 ? centered / 128 : centered / 127;
  return Math.abs(v) < deadzone ? 0 : clamp(v, -1, 1);
}

export function normalizeAxisI16LE(low: number, high: number, deadzone = 0.15): number {
  const raw = (high << 8) | low;
  const signed = raw > 0x7fff ? raw - 0x10000 : raw;
  const v = signed / 32767;
  return Math.abs(v) < deadzone ? 0 : clamp(v, -1, 1);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
