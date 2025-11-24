#!/usr/bin/env node
import { yargs } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';
import { buildForApi } from './utils.js';
import merge from './merge.js';
import upload from './upload.js';
import del from './delete.js';
import ids from './ids.js';
import transform from './transform.js';
import mergeLocal from './merge-local.js';
import status from './status.js';
import get from './get.js';
import search from './search.js';
import hybridSearch from './hybrid-search.js';

const interactions = {
  command: 'interactions',
  aliases: ['interaction', 'i'],
  description: 'Interaction commands',
  builder: yargs => buildForApi(yargs)
    .command(upload('interactions')),
};

const products = {
  command: 'products',
  aliases: ['product', 'p', 'catalog'],
  description: 'Product commands',
  builder: yargs => buildForApi(yargs)
    .command(upload('products'))
    .command(del('products'))
    .command(ids('products'))
    .command(get('products'))
    .command(merge('products'))
    .command(status('products')),
};

const users = {
  command: 'users',
  aliases: ['user', 'u'],
  description: 'User commands',
  builder: yargs => buildForApi(yargs)
    .command(upload('users'))
    .command(del('users'))
    .command(ids('users'))
    .command(get('users'))
    .command(merge('users'))
    .command(status('users')),
};

yargs.build(yargs => {
  yargs
    .env('MISO')
    .command(interactions)
    .command(products)
    .command(users)
    .command(transform)
    .command(mergeLocal)
    .command(search)
    .command(hybridSearch)
    .version(MisoClient.version);
});
