/**
 * Decide a row-major grid for `count` panes.
 *
 *   1 pane  → 1 × 1
 *   2 panes → 2 × 1
 *   3 panes → 3 × 1 (single row reads better than 2x2 with a gap)
 *   4 panes → 2 × 2
 *   5-6     → 3 × 2
 *   7-9     → 3 × 3
 *  10-12    → 4 × 3
 *
 * For higher counts we go wider, never taller, since terminals tend to be
 * wider than tall.
 */
export function computeGrid(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 3) return { cols: 3, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

export function cellSize(
  outerCols: number,
  outerRows: number,
  grid: { cols: number; rows: number },
  statusBarRows = 3,
): { cols: number; rows: number } {
  const usableRows = Math.max(outerRows - statusBarRows, 6);
  // Subtract 2 per pane for borders.
  const cols = Math.max(Math.floor(outerCols / grid.cols) - 2, 8);
  const rows = Math.max(Math.floor(usableRows / grid.rows) - 2, 4);
  return { cols, rows };
}
