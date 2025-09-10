#!/usr/bin/env node
import { yargs } from '@miso.ai/server-commons';
import version from '../src/version.js';
import { profile, init } from './profile.js';
import taxonomies from './taxonomies.js';
import entities from './entities.js';
import types from './types.js';
import summarize from './summarize.js';
import download from './download.js';
import xml from './xml.js';

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
    .option('auth', {
      describe: 'Authentication string',
    })
    .option('debug', {
      type: 'boolean',
      default: false,
    })
    .hide('debug')
    .command(init)
    .command(profile)
    .command(xml)
    .command(summarize)
    .command(download)
    .command(taxonomies)
    .command(types)
    .command(entities)
    .version(version);
});
