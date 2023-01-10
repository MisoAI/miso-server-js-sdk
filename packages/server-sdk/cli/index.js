#!/usr/bin/env node
import { yargs } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';
import upload from './upload.js';
import del from './delete.js';
import ids from './ids.js';
import transform from './transform.js';

const interactions = {
  command: 'interactions',
  aliases: ['interaction', 'i'],
  description: 'Interaction commands',
  builder: yargs => _buildForApi(yargs)
    .command(upload('interactions')),
};

const products = {
  command: 'products',
  aliases: ['product', 'p', 'catalog'],
  description: 'Product commands',
  builder: yargs => _buildForApi(yargs)
    .command(upload('products'))
    .command(del('products'))
    .command(ids('products')),
};

const users = {
  command: 'users',
  aliases: ['user', 'u'],
  description: 'User commands',
  builder: yargs => _buildForApi(yargs)
    .command(upload('users'))
    .command(del('users'))
    .command(ids('users')),
};

const experiments = {
  command: 'experiments',
  aliases: ['experiment'],
  description: 'Experiment commands',
  builder: yargs => _buildForApi(yargs)
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

yargs.build(yargs => {
  yargs
    .env('MISO')
    .command(interactions)
    .command(products)
    .command(users)
    .command(experiments)
    .command(transform)
    .version(MisoClient.version);
});



// helpers //
function _buildForApi(yargs) {
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
      coerce: yargs.coerceToArray,
    })
    .demandOption(['key'], 'API key is required.');
}
