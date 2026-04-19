import chalk from 'chalk';
import type { Command } from 'commander';
import { ipcCall } from '../ipc/client.js';
import { ipcEndpoint } from '../runtime-paths.js';

export function registerSendCommand(program: Command): void {
  program
    .command('send')
    .description('Send text into one or every running agent pane')
    .option('-a, --agent <id>', 'Target agent id (omit with --all to broadcast)')
    .option('--all', 'Send to every agent', false)
    .option('--no-newline', 'Do not append a newline')
    .argument('<text...>', 'Text to send')
    .action(
      async (
        text: string[],
        options: { agent?: string; all: boolean; newline: boolean },
      ) => {
        if (!options.agent && !options.all) {
          throw new Error('Specify --agent <id> or --all');
        }
        const payload = text.join(' ');
        try {
          const resp = await ipcCall(ipcEndpoint(), {
            kind: 'send',
            agent: options.all ? null : (options.agent ?? null),
            text: payload,
            appendNewline: options.newline,
          });
          if (resp.ok) {
            console.log(chalk.green('✓'), resp.message);
          } else {
            console.error(chalk.red('✗'), resp.message);
            process.exitCode = 1;
          }
        } catch (err) {
          console.error(
            chalk.red('✗'),
            'no running session — start one with `ctrlr start` first.',
            `(${(err as Error).message})`,
          );
          process.exitCode = 1;
        }
      },
    );
}
