import { Command } from 'commander';
import { registerBindCommand } from './commands/bind.js';
import { registerControllersCommand } from './commands/controllers.js';
import { registerInitCommand } from './commands/init.js';
import { registerSendCommand } from './commands/send.js';
import { registerStartCommand } from './commands/start.js';
import { registerStopCommand } from './commands/stop.js';

const program = new Command();

program
  .name('ctrlr')
  .description('Control your AI agents like a game controller.')
  .version('0.1.0', '-v, --version', 'Print the installed Ctrlr version');

registerInitCommand(program);
registerStartCommand(program);
registerStopCommand(program);
registerSendCommand(program);
registerControllersCommand(program);
registerBindCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
