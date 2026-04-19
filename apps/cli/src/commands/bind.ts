import path from 'node:path';
import { describeAction, loadBindings, saveBindings } from '@ctrlr/bindings';
import { ControllerManager } from '@ctrlr/controller-input';
import { type Action, BUTTON_NAMES, type ButtonName } from '@ctrlr/types';
import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Command } from 'commander';

export function registerBindCommand(program: Command): void {
  program
    .command('bind')
    .description('Interactively map a button to an action and save it to ctrlr.bindings.json')
    .option('--no-detect', 'Skip "press the button" detection; ask for the button name instead')
    .action(async (options: { detect: boolean }) => {
      const cwd = process.cwd();
      const { config, path: existingPath } = await loadBindings(cwd);
      const target = existingPath ?? path.join(cwd, 'ctrlr.bindings.json');

      let button: ButtonName;
      if (options.detect) {
        button = await detectButton();
      } else {
        const choice = await select({
          message: 'Which button do you want to bind?',
          choices: BUTTON_NAMES.map((b) => ({ name: b, value: b })),
        });
        button = choice as ButtonName;
      }

      const action = await pickAction(button);

      const updated = {
        ...config,
        buttons: {
          ...config.buttons,
          [button]: { label: actionLabel(action), action },
        },
      };
      await saveBindings(target, updated);

      console.log(
        chalk.green('✓'),
        `bound ${chalk.bold(button)} → ${chalk.cyan(describeAction(action))}`,
      );
      console.log(chalk.gray(`  saved to ${target}`));
    });
}

async function detectButton(): Promise<ButtonName> {
  console.log(chalk.gray('press a button on your controller (Ctrl-C to cancel)…'));
  const mgr = new ControllerManager();
  await mgr.start();
  return await new Promise<ButtonName>((resolve, reject) => {
    const onInput = (e: import('@ctrlr/types').ControllerEvent) => {
      if (e.type !== 'button' || !e.pressed) return;
      cleanup();
      resolve(e.button);
    };
    const onSig = () => {
      cleanup();
      reject(new Error('cancelled'));
    };
    const cleanup = () => {
      mgr.off('input', onInput);
      process.off('SIGINT', onSig);
      void mgr.stop();
    };
    mgr.on('input', onInput);
    process.once('SIGINT', onSig);
  });
}

async function pickAction(button: ButtonName): Promise<Action> {
  const kind = (await select({
    message: `What should ${chalk.bold(button)} do?`,
    choices: [
      { name: 'send text to focused pane (e.g. "1" for Claude prompt)', value: 'send' },
      { name: 'broadcast text to all panes', value: 'broadcast' },
      { name: 'cycle focus → next pane', value: 'cycle_next' },
      { name: 'cycle focus ← prev pane', value: 'cycle_prev' },
      { name: 'focus a specific pane', value: 'focus' },
      { name: 'interrupt focused pane (Ctrl-C)', value: 'interrupt' },
      { name: 'restart focused pane', value: 'restart' },
      { name: 'no-op (disable)', value: 'noop' },
    ],
  })) as string;

  switch (kind) {
    case 'send': {
      const text = await input({ message: 'Text to send:', default: '1' });
      const newline = await confirm({ message: 'Append newline?', default: true });
      return { kind: 'send', target: { mode: 'focused' }, text, appendNewline: newline };
    }
    case 'broadcast': {
      const text = await input({ message: 'Text to broadcast:' });
      const newline = await confirm({ message: 'Append newline?', default: true });
      return { kind: 'broadcast', text, appendNewline: newline };
    }
    case 'cycle_next':
      return { kind: 'cycle_focus', direction: 'next' };
    case 'cycle_prev':
      return { kind: 'cycle_focus', direction: 'prev' };
    case 'focus': {
      const agent = await input({ message: 'Agent id to focus:' });
      return { kind: 'focus', agent };
    }
    case 'interrupt':
      return { kind: 'interrupt', target: { mode: 'focused' } };
    case 'restart':
      return { kind: 'restart', target: { mode: 'focused' } };
    default:
      return { kind: 'noop' };
  }
}

function actionLabel(action: Action): string {
  switch (action.kind) {
    case 'send':
      return action.text.length <= 12 ? `send "${action.text}"` : 'send …';
    case 'broadcast':
      return action.text.length <= 12 ? `bcast "${action.text}"` : 'broadcast …';
    case 'cycle_focus':
      return action.direction === 'next' ? 'next pane' : 'prev pane';
    case 'focus':
      return `focus ${action.agent}`;
    case 'interrupt':
      return 'interrupt';
    case 'restart':
      return 'restart';
    case 'noop':
      return '—';
    default:
      return action.kind;
  }
}
