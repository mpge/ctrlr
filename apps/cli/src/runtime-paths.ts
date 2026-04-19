import path from 'node:path';

const RUNTIME_DIR = '.ctrlr';

export function runtimeDir(cwd: string = process.cwd()): string {
  return path.join(cwd, RUNTIME_DIR);
}

/**
 * Cross-platform IPC endpoint:
 *   - On Unix-like systems we use a Unix domain socket inside `.ctrlr/`.
 *   - On Windows we use a named pipe under `\\.\pipe\` (Node's net.connect
 *     accepts that path verbatim).
 */
export function ipcEndpoint(cwd: string = process.cwd()): string {
  if (process.platform === 'win32') {
    const tag = path.basename(cwd).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `\\\\.\\pipe\\ctrlr-${tag}`;
  }
  return path.join(runtimeDir(cwd), 'control.sock');
}

export function pidFile(cwd: string = process.cwd()): string {
  return path.join(runtimeDir(cwd), 'session.pid');
}
