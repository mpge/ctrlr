# Contributing to Ctrlr

Thanks for your interest in Ctrlr! This document covers the workflow for contributing code, docs, and bug reports.

## Quick start

```bash
git clone https://github.com/mpge/ctrlr.git
cd ctrlr
pnpm install
pnpm build
pnpm test
```

You'll need:

- **Node.js >= 20**
- **pnpm >= 9** (`npm i -g pnpm`)
- A C/C++ toolchain for native modules:
  - **Linux**: `sudo apt-get install build-essential libudev-dev libusb-1.0-0-dev`
  - **macOS**: Xcode command-line tools (`xcode-select --install`)
  - **Windows**: Visual Studio Build Tools 2022 (the "Desktop development with C++" workload)

## Layout

This is a [pnpm workspace](https://pnpm.io/workspaces) monorepo:

```
ctrlr/
├── apps/
│   └── cli/                 # `ctrlr` command-line entry point
├── packages/
│   ├── types/               # Shared types (no runtime deps)
│   ├── controller-input/    # node-hid gamepad detection + parsers
│   ├── bindings/            # ctrlr.bindings.json schema + loader
│   ├── pane-host/           # PaneHost interface + LocalPtyHost
│   ├── tui/                 # ink + xterm-headless grid renderer
│   └── core/                # Engine: wires inputs → actions → panes
└── examples/                # Example binding configs and agents
```

Each package owns its own `package.json`, `tsconfig.json`, and `src/`. Builds emit ESM via `tsup`.

## Development loop

```bash
pnpm dev          # watch all packages
pnpm typecheck    # tsc --noEmit across the workspace
pnpm test         # vitest run
pnpm test:watch   # vitest in watch mode
pnpm lint         # biome check
pnpm lint:fix     # biome check --write
```

To run the CLI from a checkout without publishing:

```bash
pnpm build
pnpm ctrlr -- start
```

## Adding a new package

1. `mkdir -p packages/my-package/src`
2. Copy the structure of an existing small package (e.g. `packages/types`).
3. Add it to `tsconfig.json` `references`.
4. Run `pnpm install` from the root.

## Pull requests

- Branch from `main`.
- Keep the change focused. One feature/fix per PR.
- Add or update tests with the change. CI runs the full matrix on Linux/macOS/Windows.
- Run `pnpm lint:fix` before pushing.
- Conventional Commits in the title (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).

## Reporting bugs

Open an issue with:

- Your OS and Node version.
- The controller (vendor + product, output of `ctrlr controllers --raw`).
- Steps to reproduce and what you expected.

## Code of conduct

Be kind. Disagree about technical things, not people.
