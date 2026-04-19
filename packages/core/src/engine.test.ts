import { defaultBindings } from '@ctrlr/bindings';
import type {
  AgentSpec,
  AgentStatus,
  ButtonEvent,
  ControllerEvent,
  PaneHandle,
  PaneHost,
  PaneSize,
} from '@ctrlr/types';
import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it } from 'vitest';
import { Engine } from './engine.js';

class FakePaneHandle extends EventEmitter implements PaneHandle {
  readonly id: string;
  readonly spec: AgentSpec;
  status: AgentStatus = 'running';
  size: PaneSize = { cols: 80, rows: 24 };
  writes: string[] = [];
  interrupts = 0;
  killed = false;
  restarts = 0;

  constructor(spec: AgentSpec) {
    super();
    this.id = spec.id;
    this.spec = spec;
  }

  write(data: string): void {
    this.writes.push(data);
  }
  interrupt(): void {
    this.interrupts++;
    this.writes.push('\x03');
  }
  async restart(): Promise<void> {
    this.restarts++;
  }
  kill(): void {
    this.killed = true;
    this.status = 'exited';
  }
  resize(): void {}
  onData(listener: (chunk: string) => void): () => void {
    this.on('data', listener);
    return () => this.off('data', listener);
  }
  onStatusChange(listener: (status: AgentStatus) => void): () => void {
    this.on('status', listener);
    return () => this.off('status', listener);
  }
  onExit(listener: (code: number | null) => void): () => void {
    this.on('exit', listener);
    return () => this.off('exit', listener);
  }
}

class FakePaneHost implements PaneHost {
  panes = new Map<string, FakePaneHandle>();
  async spawn(spec: AgentSpec): Promise<PaneHandle> {
    const handle = new FakePaneHandle(spec);
    this.panes.set(spec.id, handle);
    return handle;
  }
  get(id: string): PaneHandle | undefined {
    return this.panes.get(id);
  }
  list(): PaneHandle[] {
    return [...this.panes.values()];
  }
  async destroy(id: string): Promise<void> {
    this.panes.get(id)?.kill();
    this.panes.delete(id);
  }
  async shutdown(): Promise<void> {
    for (const id of [...this.panes.keys()]) await this.destroy(id);
  }
}

class FakeControllerManager extends EventEmitter {
  started = false;
  async start(): Promise<void> {
    this.started = true;
  }
  async stop(): Promise<void> {
    this.started = false;
  }
  emitInput(event: ControllerEvent): void {
    this.emit('input', event);
  }
}

const SPECS: AgentSpec[] = [
  { id: 'one', label: 'One', command: 'echo' },
  { id: 'two', label: 'Two', command: 'echo' },
  { id: 'three', label: 'Three', command: 'echo' },
];

let engine: Engine | null = null;
afterEach(async () => {
  await engine?.shutdown();
  engine = null;
});

describe('Engine', () => {
  it('spawns every configured agent on start (autoSpawn)', async () => {
    const paneHost = new FakePaneHost();
    const controllers = new FakeControllerManager();
    engine = new Engine(
      { agents: SPECS, bindings: defaultBindings },
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      { paneHost, controllers: controllers as any },
    );
    await engine.start();
    expect(paneHost.panes.size).toBe(3);
  });

  it('routes the A button to a "send 1\\n" on the focused pane', async () => {
    const paneHost = new FakePaneHost();
    const controllers = new FakeControllerManager();
    engine = new Engine(
      { agents: SPECS, bindings: defaultBindings },
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      { paneHost, controllers: controllers as any },
    );
    await engine.start();
    const focusedId = engine.getState().focusedAgentId!;

    controllers.emitInput({
      type: 'button',
      button: 'A',
      pressed: true,
      ts: 0,
      controllerId: 'fake',
    } as ButtonEvent);
    // Allow the dispatch microtasks to settle.
    await new Promise((r) => setImmediate(r));

    const writes = paneHost.panes.get(focusedId)!.writes;
    expect(writes).toContain('1\n');
  });

  it('cycles focus when LB is pressed', async () => {
    const paneHost = new FakePaneHost();
    const controllers = new FakeControllerManager();
    engine = new Engine(
      { agents: SPECS, bindings: defaultBindings },
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      { paneHost, controllers: controllers as any },
    );
    await engine.start();
    expect(engine.getState().focusedAgentId).toBe('one');

    controllers.emitInput({
      type: 'button',
      button: 'RB',
      pressed: true,
      ts: 0,
      controllerId: 'fake',
    });
    await new Promise((r) => setImmediate(r));
    expect(engine.getState().focusedAgentId).toBe('two');

    controllers.emitInput({
      type: 'button',
      button: 'LB',
      pressed: true,
      ts: 0,
      controllerId: 'fake',
    });
    await new Promise((r) => setImmediate(r));
    expect(engine.getState().focusedAgentId).toBe('one');
  });

  it('broadcast sends to every pane', async () => {
    const paneHost = new FakePaneHost();
    const controllers = new FakeControllerManager();
    engine = new Engine(
      { agents: SPECS, bindings: defaultBindings },
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      { paneHost, controllers: controllers as any },
    );
    await engine.start();
    await engine.broadcast('hello', false);
    for (const pane of paneHost.panes.values()) {
      expect(pane.writes).toContain('hello');
    }
  });
});
