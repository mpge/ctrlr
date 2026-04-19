# @ctrlr/cli

The `ctrlr` command-line entry point. Wires the controller, bindings, pane host, engine, and TUI together.

## Install

```bash
npm install -g @ctrlr/cli
# or run inside a checkout:
pnpm build && pnpm ctrlr -- --help
```

## Commands

```text
ctrlr init                          create ctrlr.config.json + ctrlr.bindings.json
ctrlr start                         launch the TUI grid (this is the main UX)
ctrlr stop                          ask a running session to shut down
ctrlr send --all "claude"           broadcast text into every pane
ctrlr send --agent api "npm test"   send text into one pane
ctrlr controllers [--watch]         list connected gamepads (and stream events)
ctrlr bind                          interactively map a button to an action
```

## Project layout (after `ctrlr init`)

```
.
├── ctrlr.config.json      # the agents you want panes for
├── ctrlr.bindings.json    # the controller mapping
└── .ctrlr/                # runtime artefacts (pid file, IPC socket)
```

## IPC

`ctrlr start` opens a Unix socket at `.ctrlr/control.sock` (or a Windows named pipe `\\.\pipe\ctrlr-<dir>`). The other commands speak a tiny newline-delimited JSON protocol over it. That's how `ctrlr send` reaches a session that's already running.

## A note on Windows

Xbox controllers attached to Windows over USB expose **XInput**, not HID, and so are invisible to `node-hid`. Two workarounds:

1. Pair the controller over Bluetooth (Windows then exposes it as HID).
2. Run inside WSL with `usbipd-win` forwarding the device.

PlayStation controllers and most generic HID gamepads work natively on all three OSes.
