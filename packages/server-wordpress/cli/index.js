#!/usr/bin/env node
import { yargs } from '@miso.ai/server-commons';
import version from '../src/version.js';
import profile from './profile.js';
import taxonomies from './taxonomies.js';
import entities from './entities.js';

yargs.build(yargs => {
  yargs
    .env('MISO_WORDPRESS')
    .option('site', {
      alias: 's',
      describe: 'the WordPress site',
    })
    .option('profile', {
      alias: 'p',
      describe: 'Site profile file location',
    })
    .option('debug', {
      type: 'boolean',
      default: false,
    })
    .hide('debug')
    .command(profile)
    .command(taxonomies)
    .command(entities)
    .version(version);
});
