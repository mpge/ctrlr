import { Terminal } from '@xterm/headless';

/**
 * One xterm-headless instance per pane. We feed PTY bytes in via `write` and
 * dump the visible buffer out as plain text whenever the renderer asks.
 *
 * Why xterm-headless and not parsing ANSI ourselves? Because Claude Code (and
 * vim, htop, …) rely on cursor positioning, alt-screen, scrolling regions,
 * and other vt100/xterm features that are very tedious to reimplement. xterm
 * is the reference implementation; piggy-backing on it means our grid cells
 * faithfully render anything a real terminal would.
 */
export class VirtualScreen {
  private terminal: Terminal;

  constructor(cols: number, rows: number) {
    this.terminal = new Terminal({
      cols,
      rows,
      allowProposedApi: true,
      scrollback: 1000,
      convertEol: false,
    });
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  resize(cols: number, rows: number): void {
    if (this.terminal.cols === cols && this.terminal.rows === rows) return;
    this.terminal.resize(cols, rows);
  }

  /** Snapshot the active screen as one string per row, no ANSI. */
  snapshot(): string[] {
    const buf = this.terminal.buffer.active;
    const rows: string[] = [];
    for (let y = 0; y < this.terminal.rows; y++) {
      const line = buf.getLine(buf.viewportY + y);
      rows.push(line ? line.translateToString(true) : '');
    }
    return rows;
  }

  /** 0-based cursor position within the visible viewport. */
  cursor(): { x: number; y: number } {
    return { x: this.terminal.buffer.active.cursorX, y: this.terminal.buffer.active.cursorY };
  }

  dispose(): void {
    this.terminal.dispose();
  }
}
