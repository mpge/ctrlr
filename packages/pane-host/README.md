# @ctrlr/pane-host

Spawns and manages PTY-backed agent processes. Implements the `PaneHost` interface from `@ctrlr/types`, currently with one backend: `LocalPtyHost`, built on [`node-pty`](https://github.com/microsoft/node-pty).

## Usage

```ts
import { LocalPtyHost } from '@ctrlr/pane-host';

const host = new LocalPtyHost({ defaultSize: { cols: 120, rows: 32 } });

const pane = await host.spawn({
  id: 'api',
  label: 'API',
  command: 'claude',
  args: ['code'],
});

pane.onData((chunk) => process.stdout.write(chunk));
pane.write('hello\n');
pane.interrupt();           // Ctrl-C to the PTY
await pane.restart();       // kill + respawn
await host.shutdown();      // tear everything down
```

## Why an interface

The TUI, CLI, and tests all consume `PaneHost` — never `node-pty` directly. That makes it trivial to add alternative backends later (`ZellijPaneHost`, `TmuxPaneHost`, `SshPaneHost`) without touching the engine.

## Cross-platform

| Platform | Backend                           | Notes                             |
| -------- | --------------------------------- | --------------------------------- |
| Linux    | `forkpty(3)`                      | Requires `libutil`.               |
| macOS    | `forkpty(3)`                      | Just works.                       |
| Windows  | ConPTY (Windows 10 1809+)         | Fallback to WinPTY if older Node. |

`node-pty` ships prebuilt binaries for common Node versions; otherwise you'll need a local C toolchain (see top-level `CONTRIBUTING.md`).
