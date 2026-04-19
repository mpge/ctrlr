# @ctrlr/tui

Ink + xterm-headless grid renderer. Each agent gets a bordered cell whose contents are the live snapshot of an `xterm-headless` instance fed by the agent's PTY output.

## Why this stack

- **`@xterm/headless`** is the official xterm.js renderer in headless mode. It maintains an in-memory 2D character grid that handles every vt100/xterm escape sequence Claude Code, vim, and htop emit. We snapshot its viewport per frame.
- **`ink`** lays out the grid (`flexDirection`, borders, status bar) and gives us `useInput` for keyboard handling.
- **A 30Hz refresh tick** drains the snapshot into Ink. That's enough for typing to feel instant without melting CPU.

## API

```ts
import { renderTui } from '@ctrlr/tui';

const handle = renderTui({ engine });
await handle.waitUntilExit();
```

The `engine` argument implements `AppEngine` (see `src/components/App.tsx`). `@ctrlr/core` is the canonical implementation; tests pass a stub.

## Built-in shortcuts

| Key      | Action                          |
| -------- | ------------------------------- |
| Ctrl-Q   | Quit (graceful shutdown)        |
| Ctrl-N/P | Cycle focus next / previous     |
| Ctrl-R   | Restart focused agent           |

Everything else goes straight into the focused pane's PTY, so typing into Claude Code (or any other agent) feels native.
