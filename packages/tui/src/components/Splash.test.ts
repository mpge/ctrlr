import { describe, expect, it } from 'vitest';
import { CONTROLLER, WORDMARK, interpolateHex } from './Splash.js';

describe('interpolateHex', () => {
  it('returns the start colour at t=0', () => {
    expect(interpolateHex('#b14bff', '#3ed8ff', 0)).toBe('#b14bff');
  });

  it('returns the end colour at t=1', () => {
    expect(interpolateHex('#b14bff', '#3ed8ff', 1)).toBe('#3ed8ff');
  });

  it('blends each channel halfway at t=0.5', () => {
    // #b14bff = (177, 75, 255) ; #3ed8ff = (62, 216, 255)
    // midpoint = (120, 146, 255) = #7892ff
    expect(interpolateHex('#b14bff', '#3ed8ff', 0.5)).toBe('#7892ff');
  });

  it('clamps within the [0,1] colour space (no out-of-range bytes)', () => {
    const colour = interpolateHex('#000000', '#ffffff', 0.7);
    expect(colour).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('lockup geometry', () => {
  it('CONTROLLER rows are all the same character width', () => {
    const widths = new Set(CONTROLLER.map((l) => [...l].length));
    expect(widths.size).toBe(1);
  });

  it('WORDMARK rows are all the same character width', () => {
    const widths = new Set(WORDMARK.map((l) => [...l].length));
    expect(widths.size).toBe(1);
  });
});
