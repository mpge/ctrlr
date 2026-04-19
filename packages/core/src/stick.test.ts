import { describe, expect, it } from 'vitest';
import { StickEdgeDetector } from './stick.js';

describe('StickEdgeDetector', () => {
  it('fires positive when crossing the threshold from neutral', () => {
    const d = new StickEdgeDetector();
    expect(d.feed('left', 'x', 0.7, 0, 0.6, 0, 1000)).toBe('positive');
  });

  it('does not fire again while held in the same direction', () => {
    const d = new StickEdgeDetector();
    expect(d.feed('left', 'x', 0.7, 0, 0.6, 0, 1000)).toBe('positive');
    expect(d.feed('left', 'x', 0.8, 0, 0.6, 0, 1010)).toBe('neutral');
  });

  it('rearms once the stick returns to neutral', () => {
    const d = new StickEdgeDetector();
    d.feed('left', 'x', 0.7, 0, 0.6, 0, 1000);
    d.feed('left', 'x', 0, 0, 0.6, 0, 1100);
    expect(d.feed('left', 'x', 0.7, 0, 0.6, 0, 1200)).toBe('positive');
  });

  it('respects cooldown when re-firing in the opposite direction', () => {
    const d = new StickEdgeDetector();
    d.feed('left', 'x', 0.7, 0, 0.6, 250, 1000);
    expect(d.feed('left', 'x', -0.7, 0, 0.6, 250, 1100)).toBe('neutral');
    expect(d.feed('left', 'x', -0.7, 0, 0.6, 250, 1300)).toBe('negative');
  });

  it('keeps each stick independent', () => {
    const d = new StickEdgeDetector();
    d.feed('left', 'x', 0.7, 0, 0.6, 0, 1000);
    expect(d.feed('right', 'x', 0.7, 0, 0.6, 0, 1010)).toBe('positive');
  });
});
