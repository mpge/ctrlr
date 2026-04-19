import { existsSync } from 'node:fs';
import path from 'node:path';
import { defaultBindings, saveBindings } from '@ctrlr/bindings';
import { defaultShell } from '@ctrlr/pane-host';
import chalk from 'chalk';
import type { Command } from 'commander';
import { CONFIG_FILENAME, type ProjectConfig, configPath, saveConfig } from '../config.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Create ctrlr.config.json and ctrlr.bindings.json in the current directory')
    .option('--force', 'Overwrite existing files', false)
    .action(async (options: { force: boolean }) => {
      const cwd = process.cwd();
      const configFile = configPath(cwd);
      const bindingsFile = path.join(cwd, 'ctrlr.bindings.json');

      if (!options.force) {
        if (existsSync(configFile)) {
          throw new Error(`${CONFIG_FILENAME} already exists. Use --force to overwrite.`);
        }
        if (existsSync(bindingsFile)) {
          throw new Error('ctrlr.bindings.json already exists. Use --force to overwrite.');
        }
      }

      const shell = defaultShell();
      const sample: ProjectConfig = {
        version: 1,
        agents: [
          { id: 'pane-1', label: 'Pane 1', command: shell, accent: 'pink' },
          { id: 'pane-2', label: 'Pane 2', command: shell, accent: 'cyan' },
          { id: 'pane-3', label: 'Pane 3', command: shell, accent: 'amber' },
          { id: 'pane-4', label: 'Pane 4', command: shell, accent: 'green' },
        ],
        bindings: './ctrlr.bindings.json',
      };

      await saveConfig(configFile, sample);
      await saveBindings(bindingsFile, defaultBindings);

      console.log(chalk.bold.magenta('ctrlr'), 'initialized in', chalk.gray(cwd));
      console.log('  ', chalk.green('✓'), 'wrote', chalk.cyan(CONFIG_FILENAME));
      console.log('  ', chalk.green('✓'), 'wrote', chalk.cyan('ctrlr.bindings.json'));
      console.log('');
      console.log(chalk.gray('Next:'));
      console.log(
        '  ',
        chalk.bold('ctrlr controllers'),
        chalk.gray('# verify your gamepad is detected'),
      );
      console.log('  ', chalk.bold('ctrlr start'), chalk.gray('       # launch the TUI grid'));
    });
}
