# @ctrlr/types

Shared TypeScript types for the Ctrlr platform. No runtime dependencies; pure type definitions consumed by every other package in the workspace.

## What's in here

- `ControllerEvent` — normalized button / stick / trigger events emitted by `@ctrlr/controller-input`
- `BindingConfig` — JSON shape for `ctrlr.bindings.json`
- `Action` — discriminated union the engine dispatcher understands (`send`, `focus`, `cycle_focus`, `broadcast`, …)
- `PaneHost` / `PaneHandle` — abstraction implemented by `@ctrlr/pane-host`
- `AgentSpec` / `AgentRuntimeState` — describes an agent and its live process state

## Why a separate package

So the controller layer can describe events without depending on the engine, and the engine can talk about pane handles without depending on `node-pty`. Types are the integration contract.
