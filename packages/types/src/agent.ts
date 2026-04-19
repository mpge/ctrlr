export type AgentStatus = 'idle' | 'running' | 'exited' | 'crashed';

export interface AgentSpec {
  /** Stable identifier referenced from bindings, e.g. "api". */
  id: string;
  /** Display name shown in the TUI. */
  label: string;
  /** Executable to spawn. e.g. "claude" or "bash". */
  command: string;
  /** Arguments. */
  args?: string[];
  /** Working directory. Defaults to process.cwd(). */
  cwd?: string;
  /** Extra env vars merged onto the parent env. */
  env?: Record<string, string>;
  /** Color hint for the TUI border. CSS-style or named accent. */
  accent?: 'pink' | 'cyan' | 'amber' | 'green' | 'red';
}

export interface AgentRuntimeState {
  spec: AgentSpec;
  status: AgentStatus;
  pid?: number;
  /** ms since epoch when the current process started. */
  startedAt?: number;
  /** Exit code for the most recent run, if any. */
  exitCode?: number | null;
  /** Last few lines of output, used for status-bar previews. */
  lastLines: string[];
}
