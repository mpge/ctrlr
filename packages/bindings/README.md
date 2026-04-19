# @ctrlr/bindings

Loader, validator, and defaults for `ctrlr.bindings.json` — the file that maps controller buttons to engine actions.

## Lookup order

```
1. ./ctrlr.bindings.json              (project-local)
2. $XDG_CONFIG_HOME/ctrlr/bindings.json   (Linux/macOS)
   %APPDATA%/ctrlr/bindings.json          (Windows)
3. defaults bundled in this package
```

## File format

```jsonc
{
  "$schema": "https://github.com/mpge/ctrlr/raw/main/schema/ctrlr.bindings.schema.json",
  "version": 1,
  "name": "My setup",
  "buttons": {
    "A":  { "label": "pick 1", "action": { "kind": "send", "target": { "mode": "focused" }, "text": "1", "appendNewline": true } },
    "RB": { "action": { "kind": "cycle_focus", "direction": "next" } }
  },
  "sticks": {
    "left": {
      "axis": "x",
      "threshold": 0.6,
      "positive": { "kind": "cycle_focus", "direction": "next" },
      "negative": { "kind": "cycle_focus", "direction": "prev" }
    }
  }
}
```

## Action reference

| `kind`         | Fields                                  | What it does                                               |
| -------------- | --------------------------------------- | ---------------------------------------------------------- |
| `send`         | `target`, `text`, `appendNewline?`      | Write text into a pane's PTY.                              |
| `broadcast`    | `text`, `appendNewline?`                | Same, but to every pane.                                   |
| `interrupt`    | `target`                                | SIGINT (Ctrl-C) into a pane's process.                     |
| `restart`      | `target`                                | Kill and respawn the agent's process.                      |
| `focus`        | `agent`                                 | Make a specific pane the focused one.                      |
| `cycle_focus`  | `direction: 'next' \| 'prev'`           | Move focus along the agent list, wrapping.                 |
| `stop_all`     | —                                       | Send SIGINT to every pane.                                 |
| `spawn`        | `agent`                                 | Start a pane that exists in config but isn't running.      |
| `kill`         | `agent`                                 | Permanently terminate a pane.                              |
| `noop`         | —                                       | Explicit no-op (handy for "disable this button").          |

## Validation

`zod` is used for parse-time validation; `loadBindings()` will throw a `ZodError` describing the offending path.
