import { EventEmitter } from 'node:events';
import os from 'node:os';
import type {
  AgentSpec,
  AgentStatus,
  PaneHandle,
  PaneHost,
  PaneHostOptions,
  PaneSize,
} from '@ctrlr/types';

export interface IPty {
  pid: number;
  cols: number;
  rows: number;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number; signal?: number }) => void): { dispose(): void };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
}

export interface PtyModule {
  spawn(
    file: string,
    args: string[] | string,
    options: {
      name?: string;
      cols?: number;
      rows?: number;
      cwd?: string;
      env?: Record<string, string | undefined>;
      encoding?: string | null;
      handleFlowControl?: boolean;
    },
  ): IPty;
}

export interface LocalPtyHostOptions extends PaneHostOptions {
  /** Override the PTY backend (used by tests). Defaults to `node-pty`. */
  pty?: PtyModule;
  /** TERM string to advertise to spawned processes. Default 'xterm-256color'. */
  term?: string;
}

const DEFAULT_SIZE: PaneSize = { cols: 100, rows: 30 };

/**
 * Each spec spawns one PTY child via `node-pty`. The handle exposes
 * subscribe/write/resize/restart and tracks `status`. The host keeps a map
 * keyed by `spec.id`.
 *
 * Cross-platform notes:
 *
 * - Linux/macOS: forkpty(3) under the hood.
 * - Windows: ConPTY (requires Windows 10 1809+). Fallback to winpty if the
 *   build was made against the legacy backend.
 */
export class LocalPtyHost implements PaneHost {
  private readonly options: Required<Omit<LocalPtyHostOptions, 'pty'>> & { pty: PtyModule | null };
  private pty: PtyModule | null;
  private readonly handles = new Map<string, LocalPtyHandle>();

  constructor(options: LocalPtyHostOptions = {}) {
    this.options = {
      defaultSize: options.defaultSize ?? DEFAULT_SIZE,
      pty: options.pty ?? null,
      term: options.term ?? 'xterm-256color',
    };
    this.pty = options.pty ?? null;
  }

  async spawn(spec: AgentSpec): Promise<PaneHandle> {
    const existing = this.handles.get(spec.id);
    if (existing && existing.status === 'running') return existing;
    if (existing) await this.destroy(spec.id);

    const pty = await this.ensurePty();
    const handle = new LocalPtyHandle(pty, spec, this.options.defaultSize, this.options.term);
    this.handles.set(spec.id, handle);
    handle.startProcess();
    return handle;
  }

  get(id: string): PaneHandle | undefined {
    return this.handles.get(id);
  }

  list(): PaneHandle[] {
    return [...this.handles.values()];
  }

  async destroy(id: string): Promise<void> {
    const handle = this.handles.get(id);
    if (!handle) return;
    handle.kill();
    this.handles.delete(id);
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.handles.keys()].map((id) => this.destroy(id)));
  }

  private async ensurePty(): Promise<PtyModule> {
    if (this.pty) return this.pty;
    const mod = (await import('node-pty')) as unknown as {
      default?: PtyModule;
      spawn?: PtyModule['spawn'];
    };
    if (mod.default) {
      this.pty = mod.default;
      return mod.default;
    }
    if (mod.spawn) {
      this.pty = { spawn: mod.spawn };
      return this.pty;
    }
    throw new Error('Failed to load node-pty: unexpected module shape');
  }
}

class LocalPtyHandle extends EventEmitter implements PaneHandle {
  readonly id: string;
  readonly spec: AgentSpec;
  status: AgentStatus = 'idle';
  size: PaneSize;
  private readonly pty: PtyModule;
  private readonly term: string;
  private process: IPty | null = null;
  private dataDisposer: { dispose(): void } | null = null;
  private exitDisposer: { dispose(): void } | null = null;
  private explicitlyKilled = false;

  constructor(pty: PtyModule, spec: AgentSpec, size: PaneSize, term: string) {
    super();
    this.pty = pty;
    this.spec = spec;
    this.id = spec.id;
    this.size = size;
    this.term = term;
  }

  startProcess(): void {
    this.explicitlyKilled = false;
    this.setStatus('running');
    const env = { ...process.env, ...this.spec.env, TERM: this.term };
    const cwd = this.spec.cwd ?? process.cwd();
    const child = this.pty.spawn(this.spec.command, this.spec.args ?? [], {
      name: this.term,
      cols: this.size.cols,
      rows: this.size.rows,
      cwd,
      env,
    });
    this.process = child;

    this.dataDisposer = child.onData((chunk) => this.emit('data', chunk));
    this.exitDisposer = child.onExit(({ exitCode }) => this.handleExit(exitCode));
  }

  write(data: string): void {
    if (!this.process) return;
    this.process.write(data);
  }

  interrupt(): void {
    this.write('\x03'); // Ctrl-C in cooked mode
  }

  async restart(): Promise<void> {
    this.kill();
    await delay(50); // give the OS a tick to clean up the pty
    this.startProcess();
  }

  kill(signal: NodeJS.Signals | number = 'SIGTERM'): void {
    this.explicitlyKilled = true;
    this.dataDisposer?.dispose();
    this.exitDisposer?.dispose();
    this.dataDisposer = null;
    this.exitDisposer = null;
    if (this.process) {
      try {
        this.process.kill(typeof signal === 'string' ? signal : undefined);
      } catch {
        // already gone
      }
      this.process = null;
    }
    this.setStatus('exited');
  }

  resize(size: PaneSize): void {
    this.size = size;
    if (this.process) {
      try {
        this.process.resize(size.cols, size.rows);
      } catch {
        // resize on a torn-down pty is fine to swallow
      }
    }
  }

  onData(listener: (chunk: string) => void): () => void {
    this.on('data', listener);
    return () => this.off('data', listener);
  }

  onStatusChange(listener: (status: AgentStatus) => void): () => void {
    this.on('status', listener);
    return () => this.off('status', listener);
  }

  onExit(listener: (code: number | null) => void): () => void {
    this.on('exit', listener);
    return () => this.off('exit', listener);
  }

  private handleExit(code: number): void {
    this.dataDisposer?.dispose();
    this.exitDisposer?.dispose();
    this.dataDisposer = null;
    this.exitDisposer = null;
    this.process = null;
    const next: AgentStatus = this.explicitlyKilled
      ? 'exited'
      : code === 0
        ? 'exited'
        : 'crashed';
    this.setStatus(next);
    this.emit('exit', code);
  }

  private setStatus(status: AgentStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.emit('status', status);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Best-guess default shell for `ctrlr init` to suggest. */
export function defaultShell(): string {
  if (process.platform === 'win32') return process.env.ComSpec ?? 'cmd.exe';
  return process.env.SHELL ?? (os.userInfo().shell as string | undefined) ?? '/bin/bash';
}
