import { ControllerManager } from '@ctrlr/controller-input';
import chalk from 'chalk';
import type { Command } from 'commander';

export function registerControllersCommand(program: Command): void {
  program
    .command('controllers')
    .description('List connected controllers; with --watch, stream live input events')
    .option('-w, --watch', 'Stream events as they arrive', false)
    .option('--raw', 'Print raw HID descriptors', false)
    .action(async (options: { watch: boolean; raw: boolean }) => {
      const mgr = new ControllerManager();
      try {
        await mgr.start();
      } catch (err) {
        console.error(
          chalk.red('✗'),
          'failed to start controller manager:',
          (err as Error).message,
        );
        process.exitCode = 1;
        return;
      }

      const list = mgr.scanOnce();
      if (list.length === 0) {
        console.log(chalk.yellow('no controllers found.'));
        if (process.platform === 'win32') {
          console.log(
            chalk.gray('  hint: Xbox controllers on Windows USB use XInput, not HID.'),
            chalk.gray('Pair over Bluetooth or use a PlayStation controller.'),
          );
        }
      } else {
        for (const c of list) {
          console.log(
            chalk.bold(c.product),
            chalk.gray(`(${c.vendor})`),
            chalk.gray(`vid=${hex(c.vendorId)} pid=${hex(c.productId)}`),
          );
          if (options.raw) {
            console.log(chalk.gray(`  path=${c.path}`));
            if (c.serialNumber) console.log(chalk.gray(`  serial=${c.serialNumber}`));
            if (c.manufacturer) console.log(chalk.gray(`  mfr=${c.manufacturer}`));
          }
        }
      }

      if (!options.watch) {
        await mgr.stop();
        return;
      }

      console.log(chalk.gray('\nstreaming events. Ctrl-C to exit.\n'));
      mgr.on('input', (e) => {
        if (e.type === 'button') {
          console.log(
            chalk.cyan('button'),
            chalk.bold(e.button),
            e.pressed ? chalk.green('↓') : chalk.gray('↑'),
          );
        } else if (e.type === 'stick') {
          console.log(
            chalk.cyan('stick '),
            chalk.bold(e.stick.padEnd(5)),
            `x=${e.x.toFixed(2).padStart(5)} y=${e.y.toFixed(2).padStart(5)}`,
          );
        } else if (e.type === 'trigger') {
          console.log(chalk.cyan('trig  '), chalk.bold(e.trigger), `=${e.value.toFixed(2)}`);
        }
      });
      mgr.on('connect', (info) => console.log(chalk.green('+'), info.product));
      mgr.on('disconnect', (info) => console.log(chalk.red('-'), info.product));

      await new Promise<void>((resolve) => {
        process.once('SIGINT', () => {
          mgr.stop().then(resolve, resolve);
        });
      });
    });
}

function hex(n: number): string {
  return `0x${n.toString(16).padStart(4, '0')}`;
}
