# Changelog

All notable changes to this project will be documented here. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] — 2026-04-19

First public cut. Everything in this release was built and verified end-to-end on Windows with real `node-hid` and `node-pty` (ConPTY) bindings; CI runs the full matrix on Linux, macOS, and Windows × Node 20 / 22 on every push.

### Added

- **Monorepo skeleton**: pnpm workspaces, biome (lint + format), vitest, tsup builds, GitHub Actions CI matrix and release workflow, MIT license, CONTRIBUTING, SECURITY policy, JSON schema for editor IntelliSense.
- **`@ctrlr/types`** — shared TypeScript types: `ControllerEvent`, `Action`, `BindingConfig`, `PaneHost`, `AgentSpec`, `AgentRuntimeState`, `EngineSnapshot`. No runtime deps.
- **`@ctrlr/controller-input`** — cross-platform USB gamepad detection on `node-hid`. Vendor-specific HID parsers for Xbox One / Series and DualShock 4 / DualSense, plus a generic-gamepad fallback. Polled hot-plug discovery (2 s) with normalized button / stick / trigger events and connect / disconnect lifecycle events.
- **`@ctrlr/bindings`** — zod-validated `ctrlr.bindings.json` schema, layered loader (project → user-config → bundled defaults), Claude-friendly defaults that map A/B/X/Y → `1\n` / `2\n` / `3\n` / `4\n` to the focused pane, LB/RB → cycle focus, D-pad → focus by index.
- **`@ctrlr/pane-host`** — `PaneHost` interface and `LocalPtyHost` implementation built on `node-pty` (ConPTY on Windows, `forkpty(3)` on Unix), with restart, interrupt, resize, and event subscription per pane.
- **`@ctrlr/tui`** — ink + `@xterm/headless` grid renderer. Each agent gets a virtual-screen-backed cell so Claude Code, vim, and htop render correctly inside the grid. Layout adapts from 1×1 to 4×3 based on agent count. Focus border, status bar with controller / focused-agent / binding hints / last action.
- **Boot splash** — pink → cyan gradient ASCII controller + figlet wordmark, spinner under it that flips to "Ready" once the engine is up. Auto-dismisses after 900 ms or on Enter. All rows length-asserted in vitest so the lockup can't drift.
- **`@ctrlr/core`** — `Engine` wiring controller events → resolver → action dispatcher → pane host. Stick edge detector with cooldown so flicks fire discrete focus changes. Per-agent rolling output tail for status previews.
- **`@ctrlr/cli`** — commander-based `ctrlr` binary with `init`, `start`, `stop`, `send`, `controllers`, `bind`. Cross-platform IPC at `.ctrlr/control.sock` on Unix or `\\.\pipe\ctrlr-<dir>` named pipe on Windows.
- **Examples** — `claude-quartet` (4 Claude Code panes, A/B/X/Y → 1/2/3/4) and `dev-server-trio` (api/web/db).
- **Marketing-grade README** with hero logo, feature table, architecture diagram, default-binding cheatsheet, cross-platform support matrix, and roadmap.

### Tested

- 62 vitest assertions across 9 files: zod schema accept/reject, loader fallback, deadzone math, real DS4/Xbox HID frame parsing, diff-state edge detection, stick cooldown, resolver button → action mapping, engine autoSpawn / cycle / broadcast, TUI grid layout, splash geometry & gradient interpolation.
- CI matrix passes on `ubuntu-latest` / `macos-latest` / `windows-latest` against Node 20 and 22.

### Known limitations

- **Windows USB Xbox controllers expose XInput, not HID**, so they're invisible to `node-hid`. Workarounds: pair over Bluetooth, use a PlayStation controller, or run inside WSL with `usbipd-win`. A native XInput backend is on the roadmap.
- Trigger intensity (analog `LT`/`RT`) is captured by the parsers but bindings can only fire-once at the threshold for now.
- The TUI requires a real interactive terminal — running it inside a non-TTY harness will fail at Ink's raw-mode setup.
