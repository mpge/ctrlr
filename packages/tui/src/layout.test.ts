import { describe, expect, it } from 'vitest';
import { cellSize, computeGrid } from './layout.js';

describe('computeGrid', () => {
  it.each([
    [1, { cols: 1, rows: 1 }],
    [2, { cols: 2, rows: 1 }],
    [3, { cols: 3, rows: 1 }],
    [4, { cols: 2, rows: 2 }],
    [5, { cols: 3, rows: 2 }],
    [6, { cols: 3, rows: 2 }],
    [9, { cols: 3, rows: 3 }],
    [12, { cols: 4, rows: 3 }],
  ])('count=%i → %o', (count, expected) => {
    expect(computeGrid(count)).toEqual(expected);
  });

  it('keeps grids reasonable for very large counts', () => {
    const g = computeGrid(50);
    expect(g.cols * g.rows).toBeGreaterThanOrEqual(50);
  });
});

describe('cellSize', () => {
  it('subtracts borders and the status-bar height', () => {
    const grid = { cols: 2, rows: 2 };
    const c = cellSize(120, 40, grid, 3);
    expect(c.cols).toBe(58); // 120/2 - 2
    expect(c.rows).toBe(16); // (40 - 3)/2 - 2 = 16.5 floored
  });

  it('clamps to a minimum so the grid is always usable', () => {
    const c = cellSize(20, 10, { cols: 4, rows: 4 });
    expect(c.cols).toBeGreaterThanOrEqual(8);
    expect(c.rows).toBeGreaterThanOrEqual(4);
  });
});
