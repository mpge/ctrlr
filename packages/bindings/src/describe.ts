import type { Action, ButtonBinding } from '@ctrlr/types';

const targetWords = (
  t: Extract<Action, { target: unknown }>['target'] | { mode: 'all' } | { mode: 'focused' },
): string => {
  switch (t.mode) {
    case 'focused':
      return 'focused pane';
    case 'all':
      return 'all panes';
    case 'agent':
      return `pane "${t.agent}"`;
  }
};

/**
 * Render an `Action` as a one-line human description suitable for help text
 * or the bottom status bar.
 */
export function describeAction(action: Action): string {
  switch (action.kind) {
    case 'send':
      return `send "${action.text.replace(/\n/g, '\\n')}"${action.appendNewline ? ' + ⏎' : ''} → ${targetWords(action.target)}`;
    case 'interrupt':
      return `interrupt ${targetWords(action.target)}`;
    case 'restart':
      return `restart ${targetWords(action.target)}`;
    case 'focus':
      return `focus pane "${action.agent}"`;
    case 'cycle_focus':
      return `cycle ${action.direction === 'next' ? 'next' : 'prev'} pane`;
    case 'broadcast':
      return `broadcast "${action.text.replace(/\n/g, '\\n')}"${action.appendNewline ? ' + ⏎' : ''} → all`;
    case 'stop_all':
      return 'stop all panes';
    case 'spawn':
      return `spawn pane "${action.agent}"`;
    case 'kill':
      return `kill pane "${action.agent}"`;
    case 'noop':
      return 'no-op';
  }
}

export function describeBinding(b: ButtonBinding): string {
  return b.label ?? describeAction(b.action);
}
