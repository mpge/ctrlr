// `@xterm/headless` is published as CommonJS, so the ESM
// `import { Terminal } from '@xterm/headless'` form throws at runtime on Node
// ("does not provide an export named 'Terminal'"). We use `createRequire` to
// load the module record at runtime, and a type-only namespace import for the
// typings — the two don't share a runtime relationship.
import { createRequire } from 'node:module';
import type {
  ITerminalInitOnlyOptions,
  ITerminalOptions,
  Terminal as TerminalInstance,
} from '@xterm/headless';

interface TerminalCtor {
  new (options?: ITerminalOptions & ITerminalInitOnlyOptions): TerminalInstance;
}

const cjsXterm = createRequire(import.meta.url)('@xterm/headless') as { Terminal: TerminalCtor };
const { Terminal } = cjsXterm;

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
  private terminal: TerminalInstance;

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
