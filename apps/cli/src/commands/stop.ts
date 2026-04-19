import chalk from 'chalk';
import type { Command } from 'commander';
import { ipcCall } from '../ipc/client.js';
import { ipcEndpoint } from '../runtime-paths.js';

export function registerStopCommand(program: Command): void {
  program
    .command('stop')
    .description('Ask the running Ctrlr session to shut down gracefully')
    .action(async () => {
      try {
        const resp = await ipcCall(ipcEndpoint(), { kind: 'quit' });
        if (resp.ok) {
          console.log(chalk.green('✓'), resp.message ?? 'stopped');
        } else {
          console.error(chalk.red('✗'), resp.message ?? 'failed');
          process.exitCode = 1;
        }
      } catch (err) {
        console.error(chalk.gray('no running session'), `(${(err as Error).message})`);
        process.exitCode = 1;
      }
    });
}
