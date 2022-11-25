#!/usr/bin/env node
import 'dotenv/config';
import createYargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { version, getConfig, CliCore } from '../src/index.js';

process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));

(async () => {
  const config = await getConfig();

  const yargs = createYargs(hideBin(process.argv));

  const core = new CliCore({ config, yargs });

  await core._setup();

  core.yargs
    .command('*', '', () => {}, argv => {
      yargs.showHelp();
    })
    .version(version)
    .fail(_handleFail)
    .help()
    .parse();
})();

function _handleFail(msg, err) {
  if (err) {
    throw err;
  }
  console.error(msg);
  process.exit(1);
}
