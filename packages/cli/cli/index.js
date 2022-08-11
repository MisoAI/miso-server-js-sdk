#!/usr/bin/env node
import 'dotenv/config';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import upload from './upload.js';

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
    .command(upload('products')),
};

const users = {
  command: 'users',
  aliases: ['user', 'u'],
  description: 'User commands',
  builder: yargs => _buildBase(yargs)
    .command(upload('users')),
};

yargs(hideBin(process.argv))
  .env('MISO')
  .command(interactions)
  .command(products)
  .command(users)
  .demandCommand(2)
  .strict()
  .help()
  .parse();



// helpers //
function _buildBase(yargs) {
  return yargs
    .option('key', {
      alias: ['k', 'api-key'],
      describe: 'API key',
    })
    .option('server', {
      describe: 'API server',
    })
    .demandOption(['key'], 'API key is required.');
}

process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));
