import { mkdir, writeFile } from 'node:fs/promises';
import { loadBindings } from '@ctrlr/bindings';
import { ControllerManager } from '@ctrlr/controller-input';
import { Engine } from '@ctrlr/core';
import { LocalPtyHost } from '@ctrlr/pane-host';
import { renderTui } from '@ctrlr/tui';
import chalk from 'chalk';
import type { Command } from 'commander';
import { loadConfig, specsFromConfig } from '../config.js';
import { startIpcServer } from '../ipc/server.js';
import { ipcEndpoint, pidFile, runtimeDir } from '../runtime-paths.js';

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Launch the Ctrlr TUI: spawns every configured agent and listens for controller input')
    .option('--no-controller', 'Skip controller detection (keyboard only)')
    .option('--no-ipc', 'Skip the local IPC server (used by `ctrlr send` and `ctrlr stop`)')
    .action(async (options: { controller: boolean; ipc: boolean }) => {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const { config: bindings, source, path: bindingsPath } = await loadBindings(cwd);

      console.log(
        chalk.gray(
          `bindings: ${source}${bindingsPath ? ` (${bindingsPath})` : ''}; agents: ${config.agents.length}`,
        ),
      );

      const controllers = new ControllerManager();
      controllers.on('error', (err) => {
        // Surface but don't crash; the TUI keeps running keyboard-only.
        process.stderr.write(`controller error: ${err.message}\n`);
      });

      const paneHost = new LocalPtyHost({ defaultSize: { cols: 100, rows: 26 } });

      const engine = new Engine(
        { agents: specsFromConfig(config), bindings },
        { controllers, paneHost },
      );

      if (!options.controller) {
        // Replace the manager with a no-op so it never opens any HID device.
        engine['deps'].controllers = noopManager() as unknown as ControllerManager;
      }

      await mkdir(runtimeDir(cwd), { recursive: true });
      await writeFile(pidFile(cwd), String(process.pid), 'utf8');

      let ipcServer: import('node:net').Server | undefined;
      if (options.ipc) {
        try {
          ipcServer = await startIpcServer({ endpoint: ipcEndpoint(cwd), engine });
        } catch (err) {
          console.error(chalk.yellow('warning:'), 'failed to start IPC server:', (err as Error).message);
        }
      }

      await engine.start();

      const tui = renderTui({ engine });
      const cleanup = async () => {
        try {
          ipcServer?.close();
        } catch {
          // ignore
        }
        try {
          await engine.shutdown();
        } catch {
          // ignore
        }
        try {
          await rmIfExists(pidFile(cwd));
          if (process.platform !== 'win32') await rmIfExists(ipcEndpoint(cwd));
        } catch {
          // ignore
        }
      };

      process.once('SIGINT', () => void cleanup().finally(() => process.exit(0)));
      process.once('SIGTERM', () => void cleanup().finally(() => process.exit(0)));

      await tui.waitUntilExit();
      await cleanup();
    });
}

function noopManager(): {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(): void;
  off(): void;
  list(): never[];
} {
  return {
    async start() {},
    async stop() {},
    on() {},
    off() {},
    list: () => [],
  };
}

async function rmIfExists(p: string): Promise<void> {
  const { rm } = await import('node:fs/promises');
  try {
    await rm(p, { force: true });
  } catch {
    /* ignore */
  }
}
