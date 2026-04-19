# Changelog

All notable changes to this project will be documented here. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial monorepo scaffolding with pnpm workspaces, biome, vitest, GitHub Actions.
- `@ctrlr/types`: shared TypeScript types for the platform.
- `@ctrlr/controller-input`: cross-platform USB controller detection on `node-hid` with Xbox / PlayStation / generic HID parsers.
- `@ctrlr/bindings`: zod-validated `ctrlr.bindings.json` schema, layered loader, Claude-friendly defaults.
- `@ctrlr/pane-host`: `PaneHost` interface and `LocalPtyHost` (node-pty) implementation.
- `@ctrlr/tui`: ink + `@xterm/headless` grid renderer with focus highlighting and status bar.
- `@ctrlr/core`: engine wiring controller events → bindings → action dispatcher → pane host.
- `@ctrlr/cli`: `ctrlr init/start/stop/send/controllers/bind` with cross-platform IPC.
- Example configs (`claude-quartet`, `dev-server-trio`).
- JSON Schema for editor IntelliSense.
