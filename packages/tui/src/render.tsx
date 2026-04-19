import { render } from 'ink';
import React from 'react';
import { App, type AppEngine } from './components/App.js';

export interface TuiBindingsHint {
  button: string;
  label: string;
}

export interface TuiOptions {
  engine: AppEngine;
  /** Override the stream Ink writes to. Defaults to process.stdout. */
  stdout?: NodeJS.WriteStream;
  /** Override the keyboard input source. Defaults to process.stdin. */
  stdin?: NodeJS.ReadStream;
  exitOnCtrlC?: boolean;
}

export interface TuiHandle {
  /** Promise that resolves when the TUI exits cleanly. */
  waitUntilExit(): Promise<void>;
  /** Force-tear-down. Use when the engine wants to bail (e.g. fatal error). */
  unmount(): void;
}

export function renderTui(options: TuiOptions): TuiHandle {
  const instance = render(<App engine={options.engine} />, {
    stdout: options.stdout,
    stdin: options.stdin,
    exitOnCtrlC: options.exitOnCtrlC ?? false,
  });
  return {
    waitUntilExit: () => instance.waitUntilExit(),
    unmount: () => instance.unmount(),
  };
}
