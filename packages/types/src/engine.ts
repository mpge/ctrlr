import type { AgentRuntimeState, AgentSpec } from './agent.js';

export interface EngineEvents {
  'agent:spawn': (state: AgentRuntimeState) => void;
  'agent:exit': (state: AgentRuntimeState) => void;
  'agent:focus': (state: AgentRuntimeState | null) => void;
  'controller:connect': (controllerId: string) => void;
  'controller:disconnect': (controllerId: string) => void;
  'action': (description: string) => void;
}

export interface EngineSnapshot {
  agents: AgentRuntimeState[];
  focusedAgentId: string | null;
  controllerIds: string[];
}

export interface EngineConfig {
  agents: AgentSpec[];
  bindingsPath?: string;
}
