import 'dotenv/config';
import _yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

class Tracker {

  constructor() {}

  get hasDefaultCommand() {
    return !!this._hasDefaultCommand;
  }

  shim(yargs) {
    const _command = yargs.command;
    yargs.command = (...args) => {
      const args0 = args[0];
      const name = typeof args0 === 'object' ? args0.command : typeof args0 === 'string' ? args0 : undefined;
      if (name === '*' || name === '$0') {
        this._hasDefaultCommand = true;
      }
      return _command.apply(yargs, args);
    };
    return yargs;
  }

}

export function build(fn) {
  handleEpipe();
  const yargs = _yargs(hideBin(process.argv));

  const tracker = new Tracker();
  tracker.shim(yargs);

  fn(yargs);

  if (!tracker.hasDefaultCommand) {
    yargs.command('*', '', () => {}, () => yargs.showHelp())
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
