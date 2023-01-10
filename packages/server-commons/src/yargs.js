import 'dotenv/config';
import _yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

function isDefaultCommand(args) {
  let args0 = args[0];
  const command = typeof args0 === 'object' ? args0.command : typeof args0 === 'string' ? args0 : undefined;
  if (!command) {
    return false; // this should not happen?
  }
  for (const c of Array.isArray(command) ? command : [command]) {
    if (c.startsWith('*') || c.startsWith('$0')) {
      return true;
    }
  }
  return false;
}

function shim(yargs) {
  let hasDefaultCommand = false;
  // command(): track whether a default command is registered
  const _command = yargs.command;
  yargs.command = (...args) => {
    if (isDefaultCommand(args)) {
      hasDefaultCommand = true;
    }
    return _command.apply(yargs, args);
  };
  // get hasDefaultCommand
  Object.defineProperty(yargs, 'hasDefaultCommand', {
    get: () => hasDefaultCommand,
  });
  // showHelpOnZeroCommand()
  yargs.showHelpOnZeroCommand = function() {
    return this.command('*', false, () => {}, () => this.showHelp());
  }
  return yargs;
}

export function build(fn) {
  handleEpipe();
  const yargs = shim(_yargs(hideBin(process.argv)));

  fn(yargs);

  if (!yargs.hasDefaultCommand) {
    yargs.showHelpOnZeroCommand();
  }

  return yargs
    .help()
    .fail(handleFail)
    .parse();
}

let _epipeHandled = false;

export function handleEpipe() {
  if (_epipeHandled) {
    return;
  }
  _epipeHandled = true;
  process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));
}

export function handleFail(msg, err) {
  if (err) {
    throw err;
  }
  console.error(msg);
  process.exit(1);
}

export function coerceToArray(arg) {
  return Array.isArray(arg) ? arg :
    typeof arg === 'string' ? arg.split(',') :
    arg === undefined || arg === null ? [] : [arg];
}
