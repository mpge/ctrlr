import { Box, useApp, useInput, useStdout } from 'ink';
import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import type { AgentRuntimeState } from '@ctrlr/types';
import { cellSize, computeGrid } from '../layout.js';
import { VirtualScreen } from '../virtual-screen.js';
import { PaneCell } from './PaneCell.js';
import { StatusBar } from './StatusBar.js';

export interface AppEngine {
  getState(): {
    agents: AgentRuntimeState[];
    focusedAgentId: string | null;
    controllerIds: string[];
  };
  /** Subscribe to coarse "something changed" notifications. */
  subscribe(listener: () => void): () => void;
  /** Subscribe to PTY chunks per agent. */
  subscribePaneData(agentId: string, listener: (chunk: string) => void): () => void;
  /** Hook for raw keyboard typing into the focused pane. */
  typeIntoFocused(input: string): void;
  /** Built-in shortcuts implemented as engine actions. */
  cycleFocus(direction: 'next' | 'prev'): void;
  restartFocused(): Promise<void> | void;
  shutdown(): Promise<void> | void;
  /** Bottom status messages from action dispatches. */
  subscribeMessages(listener: (msg: string) => void): () => void;
  /** Friendly one-line label for the current controller. */
  describeController(): string;
  /** Render a few binding hints on the status bar. */
  bindingHints(): { button: string; label: string }[];
}

interface Props {
  engine: AppEngine;
}

export const App: React.FC<Props> = ({ engine }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [, force] = useReducer((n: number) => n + 1, 0);

  const screensRef = useRef(new Map<string, VirtualScreen>());
  const messageRef = useRef<string | null>(null);

  // Resize tracking.
  const cols = stdout.columns ?? 120;
  const rows = stdout.rows ?? 32;

  const snapshot = engine.getState();
  const agents = snapshot.agents;

  const grid = useMemo(() => computeGrid(agents.length || 1), [agents.length]);
  const cell = useMemo(() => cellSize(cols, rows, grid), [cols, rows, grid]);

  // Maintain a VirtualScreen per agent.
  useEffect(() => {
    const screens = screensRef.current;
    for (const a of agents) {
      if (!screens.has(a.spec.id)) {
        screens.set(a.spec.id, new VirtualScreen(cell.cols, cell.rows));
      } else {
        screens.get(a.spec.id)!.resize(cell.cols, cell.rows);
      }
    }
    for (const id of [...screens.keys()]) {
      if (!agents.find((a) => a.spec.id === id)) {
        screens.get(id)!.dispose();
        screens.delete(id);
      }
    }
  }, [agents, cell.cols, cell.rows]);

  // Pipe PTY data into each agent's virtual screen.
  useEffect(() => {
    const disposers = agents.map((a) =>
      engine.subscribePaneData(a.spec.id, (chunk) => {
        const screen = screensRef.current.get(a.spec.id);
        if (screen) screen.write(chunk);
      }),
    );
    return () => {
      for (const d of disposers) d();
    };
  }, [agents, engine]);

  // Re-render at ~30Hz to flush virtual-screen changes.
  useEffect(() => {
    const t = setInterval(force, 33);
    return () => clearInterval(t);
  }, []);

  // Listen to engine state updates.
  useEffect(() => engine.subscribe(force), [engine]);

  // Engine action messages bubble to the status bar.
  useEffect(
    () =>
      engine.subscribeMessages((msg) => {
        messageRef.current = msg;
        force();
        // Clear after 2.5s
        const id = setTimeout(() => {
          if (messageRef.current === msg) {
            messageRef.current = null;
            force();
          }
        }, 2500);
        return () => clearTimeout(id);
      }),
    [engine],
  );

  useInput(async (input, key) => {
    if (key.ctrl && (input === 'q' || input === 'c')) {
      await engine.shutdown();
      exit();
      return;
    }
    if (key.ctrl && input === 'r') {
      await engine.restartFocused();
      return;
    }
    if (key.ctrl && input === 'n') {
      engine.cycleFocus('next');
      return;
    }
    if (key.ctrl && input === 'p') {
      engine.cycleFocus('prev');
      return;
    }
    // Forward everything else verbatim into the focused pane.
    let payload = input;
    if (key.return) payload = '\r';
    if (key.backspace || key.delete) payload = '\x7f';
    if (key.tab) payload = '\t';
    if (key.escape) payload = '\x1b';
    if (key.upArrow) payload = '\x1b[A';
    if (key.downArrow) payload = '\x1b[B';
    if (key.rightArrow) payload = '\x1b[C';
    if (key.leftArrow) payload = '\x1b[D';
    engine.typeIntoFocused(payload);
  });

  const focused = agents.find((a) => a.spec.id === snapshot.focusedAgentId) ?? null;
  const focusedLabel = focused?.spec.label ?? '(none)';

  // Build rows-of-cells for the grid.
  const cellRows: AgentRuntimeState[][] = [];
  for (let r = 0; r < grid.rows; r++) {
    cellRows.push(agents.slice(r * grid.cols, r * grid.cols + grid.cols));
  }

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        {cellRows.map((row, r) => (
          <Box key={r} flexDirection="row">
            {row.map((agent) => {
              const screen = screensRef.current.get(agent.spec.id);
              const snap = screen ? screen.snapshot() : [];
              return (
                <PaneCell
                  key={agent.spec.id}
                  agent={agent}
                  focused={agent.spec.id === snapshot.focusedAgentId}
                  width={cell.cols}
                  height={cell.rows}
                  rows={snap}
                />
              );
            })}
          </Box>
        ))}
      </Box>
      <StatusBar
        controllerCount={snapshot.controllerIds.length}
        controllerLabel={engine.describeController()}
        focusedLabel={focusedLabel}
        bindingHints={engine.bindingHints()}
        message={messageRef.current}
      />
    </Box>
  );
};
