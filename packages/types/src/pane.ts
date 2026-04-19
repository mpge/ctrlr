import type { AgentSpec, AgentStatus } from './agent.js';

export interface PaneSize {
  cols: number;
  rows: number;
}

export interface PaneHandle {
  /** Stable id; matches AgentSpec.id. */
  readonly id: string;
  readonly spec: AgentSpec;
  status: AgentStatus;
  /** Current PTY size. */
  size: PaneSize;
  /** Send raw bytes/keys to the underlying process. */
  write(data: string): void;
  /** SIGINT / Ctrl-C to the underlying process. */
  interrupt(): void;
  /** Kill and (optionally) respawn. */
  restart(): Promise<void>;
  /** Permanently terminate. */
  kill(signal?: NodeJS.Signals | number): void;
  /** Resize the PTY. */
  resize(size: PaneSize): void;
  /** Subscribe to raw output bytes. */
  onData(listener: (chunk: string) => void): () => void;
  /** Subscribe to status transitions. */
  onStatusChange(listener: (status: AgentStatus) => void): () => void;
  /** Subscribe to exit. */
  onExit(listener: (code: number | null) => void): () => void;
}

export interface PaneHostOptions {
  /** Initial dimensions for newly-spawned panes. */
  defaultSize?: PaneSize;
}

export interface PaneHost {
  /** Spin up a pane for the given agent spec. */
  spawn(spec: AgentSpec): Promise<PaneHandle>;
  /** Look up a pane by id. */
  get(id: string): PaneHandle | undefined;
  /** All currently-tracked panes (live or exited). */
  list(): PaneHandle[];
  /** Tear down a pane and stop tracking it. */
  destroy(id: string): Promise<void>;
  /** Tear everything down. */
  shutdown(): Promise<void>;
}
