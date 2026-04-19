import type { BindingConfig } from '@ctrlr/types';

/**
 * Out-of-the-box bindings. Designed around the Claude Code workflow:
 *
 * - **Face buttons (A/B/X/Y)** become numeric prompt picks. When Claude shows
 *   `1) yes / 2) tell me what to do differently / 3) no`, hit A for 1, B for 2…
 * - **LB/RB** cycle focus across panes (joystick alternative).
 * - **D-pad** focuses panes 1-4 directly.
 * - **Left stick X** crossings also cycle focus, so you can flick.
 * - **BACK** sends Ctrl-C to the focused pane (interrupt).
 * - **START** restarts the focused agent.
 * - **GUIDE** broadcasts a clear-screen to every pane (handy reset).
 * - **Triggers** are reserved (intensity/analog use, see roadmap).
 */
export const defaultBindings: BindingConfig = {
  $schema: 'https://github.com/mpge/ctrlr/raw/main/schema/ctrlr.bindings.schema.json',
  version: 1,
  name: 'Ctrlr defaults',
  buttons: {
    A: {
      label: 'pick 1',
      action: { kind: 'send', target: { mode: 'focused' }, text: '1', appendNewline: true },
    },
    B: {
      label: 'pick 2',
      action: { kind: 'send', target: { mode: 'focused' }, text: '2', appendNewline: true },
    },
    X: {
      label: 'pick 3',
      action: { kind: 'send', target: { mode: 'focused' }, text: '3', appendNewline: true },
    },
    Y: {
      label: 'pick 4',
      action: { kind: 'send', target: { mode: 'focused' }, text: '4', appendNewline: true },
    },
    LB: { label: 'prev pane', action: { kind: 'cycle_focus', direction: 'prev' } },
    RB: { label: 'next pane', action: { kind: 'cycle_focus', direction: 'next' } },
    BACK: { label: 'interrupt', action: { kind: 'interrupt', target: { mode: 'focused' } } },
    START: { label: 'restart', action: { kind: 'restart', target: { mode: 'focused' } } },
    GUIDE: {
      label: 'clear all',
      action: { kind: 'broadcast', text: 'clear', appendNewline: true },
    },
    DPAD_UP: { label: 'pane 1', action: { kind: 'focus', agent: 'pane-1' } },
    DPAD_RIGHT: { label: 'pane 2', action: { kind: 'focus', agent: 'pane-2' } },
    DPAD_DOWN: { label: 'pane 3', action: { kind: 'focus', agent: 'pane-3' } },
    DPAD_LEFT: { label: 'pane 4', action: { kind: 'focus', agent: 'pane-4' } },
  },
  sticks: {
    left: {
      axis: 'x',
      threshold: 0.6,
      positive: { kind: 'cycle_focus', direction: 'next' },
      negative: { kind: 'cycle_focus', direction: 'prev' },
    },
  },
};
