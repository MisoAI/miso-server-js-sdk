#!/usr/bin/env node
import { yargs } from '@miso.ai/server-commons';
import version from '../src/version.js';
import store from './store/index.js';

yargs.build(yargs => {
  yargs
    .env('MISO_SHOPIFY')
    .option('shop', {
      alias: ['s', 'domain'],
      describe: 'the Shopify shop domain',
    })
    .option('token', {
      alias: ['t'],
      describe: 'Access token',
    })
    .option('api-version', {
      describe: 'the Shopify API version',
    })
    .option('debug', {
      type: 'boolean',
      default: false,
    })
    .hide('debug')
    .command(store)
    .version(version);
});
