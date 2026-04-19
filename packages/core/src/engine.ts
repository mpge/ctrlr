import { EventEmitter } from 'node:events';
import { describeAction, describeBinding } from '@ctrlr/bindings';
import type { ControllerManager } from '@ctrlr/controller-input';
import type {
  Action,
  ActionTarget,
  AgentRuntimeState,
  AgentSpec,
  BindingConfig,
  ControllerEvent,
  ControllerInfo,
  PaneHandle,
  PaneHost,
} from '@ctrlr/types';
import { resolveBindingForEvent } from './resolver.js';
import { StickEdgeDetector } from './stick.js';

export interface EngineOptions {
  agents: AgentSpec[];
  bindings: BindingConfig;
  /** If true, automatically spawn every agent on `start()`. Default true. */
  autoSpawn?: boolean;
  /** If true, log every dispatched action via `messages` event. Default true. */
  emitActionMessages?: boolean;
}

export interface EngineDeps {
  controllers: ControllerManager;
  paneHost: PaneHost;
}

const TAIL_LINES = 5;

export class Engine {
  private readonly options: Required<Omit<EngineOptions, 'agents' | 'bindings'>> & {
    agents: AgentSpec[];
    bindings: BindingConfig;
  };
  private readonly deps: EngineDeps;
  private readonly bus = new EventEmitter();
  private readonly dataBus = new EventEmitter();
  private readonly messageBus = new EventEmitter();
  private readonly stickDetector = new StickEdgeDetector();
  private readonly agents = new Map<string, AgentRuntimeState>();
  private focusedAgentId: string | null = null;
  private controllers = new Map<string, ControllerInfo>();
  private detachControllers: Array<() => void> = [];
  private started = false;

  constructor(options: EngineOptions, deps: EngineDeps) {
    this.options = {
      agents: options.agents,
      bindings: options.bindings,
      autoSpawn: options.autoSpawn ?? true,
      emitActionMessages: options.emitActionMessages ?? true,
    };
    this.deps = deps;
    for (const spec of options.agents) {
      this.agents.set(spec.id, { spec, status: 'idle', lastLines: [] });
    }
    this.focusedAgentId = options.agents[0]?.id ?? null;
    this.bus.setMaxListeners(64);
    this.dataBus.setMaxListeners(256);
  }

  // ---------- lifecycle ----------

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const onConnect = (info: ControllerInfo) => {
      this.controllers.set(info.id, info);
      this.bus.emit('change');
    };
    const onDisconnect = (info: ControllerInfo) => {
      this.controllers.delete(info.id);
      this.bus.emit('change');
    };
    const onInput = (event: ControllerEvent) => this.handleInput(event);

    this.deps.controllers.on('connect', onConnect);
    this.deps.controllers.on('disconnect', onDisconnect);
    this.deps.controllers.on('input', onInput);
    this.detachControllers.push(
      () => this.deps.controllers.off('connect', onConnect),
      () => this.deps.controllers.off('disconnect', onDisconnect),
      () => this.deps.controllers.off('input', onInput),
    );

    await this.deps.controllers.start();

    if (this.options.autoSpawn) {
      for (const spec of this.options.agents) {
        await this.spawnAgent(spec.id);
      }
    }
  }

  async shutdown(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    for (const detach of this.detachControllers) detach();
    this.detachControllers = [];
    await this.deps.controllers.stop();
    await this.deps.paneHost.shutdown();
  }

  // ---------- public state queries ----------

  getState(): {
    agents: AgentRuntimeState[];
    focusedAgentId: string | null;
    controllerIds: string[];
  } {
    return {
      agents: [...this.agents.values()],
      focusedAgentId: this.focusedAgentId,
      controllerIds: [...this.controllers.keys()],
    };
  }

  describeController(): string {
    if (this.controllers.size === 0) return '(none)';
    const first = [...this.controllers.values()][0]!;
    if (this.controllers.size === 1) return `${first.product}`;
    return `${first.product} +${this.controllers.size - 1}`;
  }

  bindingHints(): { button: string; label: string }[] {
    return Object.entries(this.options.bindings.buttons).map(([button, binding]) => ({
      button,
      label: describeBinding(binding!),
    }));
  }

  // ---------- subscriptions ----------

  subscribe(listener: () => void): () => void {
    this.bus.on('change', listener);
    return () => this.bus.off('change', listener);
  }

  subscribePaneData(agentId: string, listener: (chunk: string) => void): () => void {
    const eventName = `data:${agentId}`;
    this.dataBus.on(eventName, listener);
    return () => this.dataBus.off(eventName, listener);
  }

  subscribeMessages(listener: (msg: string) => void): () => void {
    this.messageBus.on('message', listener);
    return () => this.messageBus.off('message', listener);
  }

  // ---------- TUI hooks ----------

  typeIntoFocused(input: string): void {
    const pane = this.focusedPane();
    if (!pane) return;
    pane.write(input);
  }

  cycleFocus(direction: 'next' | 'prev'): void {
    const ids = [...this.agents.keys()];
    if (ids.length === 0) return;
    const idx = this.focusedAgentId ? ids.indexOf(this.focusedAgentId) : -1;
    const delta = direction === 'next' ? 1 : -1;
    const next = ids[(idx + delta + ids.length) % ids.length]!;
    this.setFocus(next);
  }

  async restartFocused(): Promise<void> {
    if (!this.focusedAgentId) return;
    await this.restartAgent(this.focusedAgentId);
  }

  // ---------- imperative control (used by CLI subcommands) ----------

  async spawnAgent(id: string): Promise<PaneHandle | undefined> {
    const state = this.agents.get(id);
    if (!state) return undefined;
    const pane = await this.deps.paneHost.spawn(state.spec);
    state.status = pane.status;
    state.pid = (pane as { pid?: number }).pid;
    state.startedAt = Date.now();

    pane.onData((chunk) => {
      pushTail(state, chunk);
      this.dataBus.emit(`data:${id}`, chunk);
    });
    pane.onStatusChange((status) => {
      state.status = status;
      this.bus.emit('change');
    });
    pane.onExit((code) => {
      state.exitCode = code;
      this.bus.emit('change');
    });
    this.bus.emit('change');
    return pane;
  }

  async restartAgent(id: string): Promise<void> {
    const pane = this.deps.paneHost.get(id);
    if (pane) {
      await pane.restart();
      this.message(`restart "${id}"`);
      return;
    }
    await this.spawnAgent(id);
  }

  async killAgent(id: string): Promise<void> {
    const pane = this.deps.paneHost.get(id);
    if (!pane) return;
    pane.kill();
    await this.deps.paneHost.destroy(id);
    this.message(`kill "${id}"`);
    this.bus.emit('change');
  }

  async sendToAgent(id: string, text: string, appendNewline = true): Promise<void> {
    const pane = this.deps.paneHost.get(id);
    if (!pane) return;
    pane.write(appendNewline ? `${text}\n` : text);
  }

  async broadcast(text: string, appendNewline = true): Promise<void> {
    const payload = appendNewline ? `${text}\n` : text;
    for (const pane of this.deps.paneHost.list()) pane.write(payload);
  }

  setFocus(id: string): void {
    if (!this.agents.has(id)) return;
    if (this.focusedAgentId === id) return;
    this.focusedAgentId = id;
    this.message(`focus "${this.agents.get(id)!.spec.label}"`);
    this.bus.emit('change');
  }

  // ---------- input pipeline ----------

  private handleInput(event: ControllerEvent): void {
    const resolved = resolveBindingForEvent(event, this.options.bindings, this.stickDetector);
    if (!resolved) return;
    void this.dispatch(resolved.action, resolved.source);
  }

  private async dispatch(action: Action, source: string): Promise<void> {
    if (this.options.emitActionMessages) {
      this.message(`${source} → ${describeAction(action)}`);
    }
    switch (action.kind) {
      case 'send': {
        const targets = this.targetsOf(action.target);
        for (const id of targets)
          await this.sendToAgent(id, action.text, action.appendNewline ?? false);
        return;
      }
      case 'broadcast': {
        await this.broadcast(action.text, action.appendNewline ?? false);
        return;
      }
      case 'interrupt': {
        for (const id of this.targetsOf(action.target)) {
          const pane = this.deps.paneHost.get(id);
          pane?.interrupt();
        }
        return;
      }
      case 'restart': {
        for (const id of this.targetsOf(action.target)) await this.restartAgent(id);
        return;
      }
      case 'focus': {
        this.setFocus(action.agent);
        return;
      }
      case 'cycle_focus': {
        this.cycleFocus(action.direction);
        return;
      }
      case 'spawn': {
        await this.spawnAgent(action.agent);
        return;
      }
      case 'kill': {
        await this.killAgent(action.agent);
        return;
      }
      case 'stop_all': {
        for (const pane of this.deps.paneHost.list()) pane.interrupt();
        return;
      }
      case 'noop':
        return;
    }
  }

  private targetsOf(target: ActionTarget): string[] {
    switch (target.mode) {
      case 'focused':
        return this.focusedAgentId ? [this.focusedAgentId] : [];
      case 'agent':
        return this.agents.has(target.agent) ? [target.agent] : [];
      case 'all':
        return [...this.agents.keys()];
    }
  }

  private focusedPane(): PaneHandle | undefined {
    if (!this.focusedAgentId) return undefined;
    return this.deps.paneHost.get(this.focusedAgentId);
  }

  private message(msg: string): void {
    this.messageBus.emit('message', msg);
  }
}

// Strip CSI escape sequences (ESC `[` … letter) so the rolling tail buffer
// holds plain text suitable for status-bar previews. Built via RegExp so the
// ESC byte stays out of the source code (biome flags control chars in regex
// literals).
const ANSI_CSI_PATTERN = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;?]*[A-Za-z]`, 'g');

function pushTail(state: AgentRuntimeState, chunk: string): void {
  const stripped = chunk.replace(ANSI_CSI_PATTERN, '').replace(/\r/g, '');
  for (const line of stripped.split('\n')) {
    if (line.length === 0) continue;
    state.lastLines.push(line);
    if (state.lastLines.length > TAIL_LINES) state.lastLines.shift();
  }
}
