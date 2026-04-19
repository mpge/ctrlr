import type { ButtonName, StickName } from './controller.js';

/**
 * The set of high-level actions a binding can resolve to. The dispatcher in
 * `@ctrlr/core` knows how to perform each one.
 */
export type Action =
  | { kind: 'send'; target: ActionTarget; text: string; appendNewline?: boolean }
  | { kind: 'interrupt'; target: ActionTarget }
  | { kind: 'restart'; target: ActionTarget }
  | { kind: 'focus'; agent: string }
  | { kind: 'cycle_focus'; direction: 'next' | 'prev' }
  | { kind: 'broadcast'; text: string; appendNewline?: boolean }
  | { kind: 'stop_all' }
  | { kind: 'spawn'; agent: string }
  | { kind: 'kill'; agent: string }
  | { kind: 'noop' };

export type ActionTarget =
  | { mode: 'focused' }
  | { mode: 'agent'; agent: string }
  | { mode: 'all' };

export type StickAxis = 'x' | 'y';

export interface ButtonBinding {
  /** Always required so consumers can render a label in the GUI. */
  label?: string;
  action: Action;
}

export interface StickBinding {
  /**
   * What axis is mapped. `x` = left/right movement, `y` = up/down movement.
   * The stick action is fired discretely when the axis crosses the threshold.
   */
  axis: StickAxis;
  threshold?: number;
  /** Action when axis goes positive (right / down). */
  positive: Action;
  /** Action when axis goes negative (left / up). */
  negative: Action;
}

export interface BindingConfig {
  $schema?: string;
  version: 1;
  /** Optional human-readable name shown in `ctrlr controllers`. */
  name?: string;
  /** Per-button mappings. */
  buttons: Partial<Record<ButtonName, ButtonBinding>>;
  /** Per-stick mappings. */
  sticks?: Partial<Record<StickName, StickBinding>>;
  /** Triggers reserved for future use (intensity / analog), see roadmap. */
  triggers?: {
    LT?: { action: Action };
    RT?: { action: Action };
  };
}
