import { describe, expect, it } from 'vitest';
import { applyDeadzone, normalizeAxisI16LE, normalizeAxisI8 } from './deadzone.js';

describe('applyDeadzone', () => {
  it('zeroes movement inside the radial deadzone', () => {
    const r = applyDeadzone(0.05, 0.05, 0.15);
    expect(r).toEqual({ x: 0, y: 0 });
  });

  it('rescales movement above the deadzone so it starts at 0', () => {
    const r = applyDeadzone(0.16, 0, 0.15);
    expect(r.x).toBeGreaterThan(0);
    expect(r.x).toBeLessThan(0.05);
  });

  it('reaches +-1 when the stick is fully pushed', () => {
    const r = applyDeadzone(1, 0, 0.15);
    expect(r.x).toBeCloseTo(1, 5);
  });
});

describe('normalizeAxisI8', () => {
  it('maps 128 to 0 (idle stick)', () => {
    expect(normalizeAxisI8(128, 0)).toBe(0);
  });

  it('maps 0 (full left) to exactly -1', () => {
    expect(normalizeAxisI8(0, 0)).toBe(-1);
  });

  it('maps 255 (full right) to exactly 1', () => {
    expect(normalizeAxisI8(255, 0)).toBe(1);
  });

  it('respects deadzone', () => {
    expect(normalizeAxisI8(140, 0.5)).toBe(0);
  });
});

describe('normalizeAxisI16LE', () => {
  it('converts a centered stick value to ~0', () => {
    expect(normalizeAxisI16LE(0, 0, 0)).toBe(0);
  });

  it('handles negative values via two-complement', () => {
    expect(normalizeAxisI16LE(0, 0x80, 0)).toBeLessThan(0);
  });

  it('handles positive max', () => {
    expect(normalizeAxisI16LE(0xff, 0x7f, 0)).toBeCloseTo(1, 4);
  });
});
