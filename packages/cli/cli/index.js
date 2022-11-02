#!/usr/bin/env node
import 'dotenv/config';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import upload from './upload.js';
import ids from './ids.js';
import version from '../src/version.js';

const interactions = {
  command: 'interactions',
  aliases: ['interaction', 'i'],
  description: 'Interaction commands',
  builder: yargs => _buildBase(yargs)
    .command(upload('interactions')),
};

const products = {
  command: 'products',
  aliases: ['product', 'p'],
  description: 'Product commands',
  builder: yargs => _buildBase(yargs)
    .command(upload('products'))
    .command(ids('products')),
};

const users = {
  command: 'users',
  aliases: ['user', 'u'],
  description: 'User commands',
  builder: yargs => _buildBase(yargs)
    .command(upload('users'))
    .command(ids('users')),
};

const experiments = {
  command: 'experiments',
  aliases: ['experiment'],
  description: 'Experiment commands',
  builder: yargs => _buildBase(yargs)
    .option('experiment-id', {
      alias: ['exp-id'],
      describe: 'Experiment ID for experiment API',
    })
    .command({
      command: 'events',
      builder: yargs => yargs
        .command(upload('experiment-events')),
    }),
};

yargs(hideBin(process.argv))
  .env('MISO')
  .command(interactions)
  .command(products)
  .command(users)
  .command(experiments)
  .demandCommand(2)
  .version(version)
  .help()
  .fail(_handleFail)
  .parse();



// helpers //
function _buildBase(yargs) {
  return yargs
    .option('key', {
      alias: ['k', 'api-key'],
      describe: 'API key',
    })
    .option('server', {
      alias: ['api-server'],
      describe: 'API server',
    })
    .option('param', {
      alias: ['v', 'var'],
      describe: 'Extra URL parameters',
      type: 'array',
      coerce: _coerceToArray,
    })
    .demandOption(['key'], 'API key is required.');
}

function _coerceToArray(arg) {
  return Array.isArray(arg) ? arg :
    typeof arg === 'string' ? arg.split(',') :
    arg === undefined || arg === null ? [] : [arg];
}

function _handleFail(msg, err) {
  if (err) {
    throw err;
  }
  console.error(msg);
  process.exit(1);
}

process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));
