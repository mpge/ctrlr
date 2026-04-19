# @ctrlr/core

The orchestrator. Holds the bindings, owns the agent lifecycle, and runs the input pipeline:

```
ControllerManager  ── ControllerEvent ──▶  resolver  ──▶  Action  ──▶  PaneHost
       ▲                                                                  │
       └─── connect/disconnect ──────────── state ◀── status/data ────────┘
```

## Wiring it up

```ts
import { ControllerManager } from '@ctrlr/controller-input';
import { LocalPtyHost } from '@ctrlr/pane-host';
import { defaultBindings } from '@ctrlr/bindings';
import { Engine } from '@ctrlr/core';

const engine = new Engine(
  {
    agents: [
      { id: 'api', label: 'API', command: 'npm', args: ['run', 'dev'], cwd: 'apps/api', accent: 'cyan' },
      { id: 'web', label: 'Web', command: 'npm', args: ['run', 'dev'], cwd: 'apps/web', accent: 'pink' },
    ],
    bindings: defaultBindings,
  },
  { controllers: new ControllerManager(), paneHost: new LocalPtyHost() },
);

await engine.start();
```

The same `engine` is what `@ctrlr/tui` consumes through its `AppEngine` interface — `Engine` is the canonical implementation.

## Public surface

| Method                 | Use it for                                                           |
| ---------------------- | -------------------------------------------------------------------- |
| `start()` / `shutdown()`     | Lifecycle.                                                     |
| `getState()`                 | Snapshot of agents / focus / controllers, used by the renderer.|
| `subscribe(cb)`              | "Something changed", coarse-grained.                           |
| `subscribePaneData(id, cb)`  | Per-agent PTY chunks, fine-grained.                            |
| `subscribeMessages(cb)`      | Action descriptions for the status bar.                        |
| `spawnAgent` / `killAgent` / `restartAgent` | Imperative pane control (used by `ctrlr send` etc.).|
| `sendToAgent` / `broadcast`  | Stream input into one or all panes.                            |
| `cycleFocus` / `setFocus`    | Move the focus cursor.                                         |

## Stick edge detection

Sticks emit ~60 events/sec. To make "flick the stick → cycle pane" feel right, the engine wraps the stick state in a `StickEdgeDetector` that fires at most once per direction, with a 250ms cooldown.
