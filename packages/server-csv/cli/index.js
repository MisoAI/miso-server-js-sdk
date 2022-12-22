#!/usr/bin/env node
import { yargs } from '@miso.ai/server-commons';
import version from '../src/version.js';
import csv from './csv.js';

yargs.build(yargs => {
  yargs
    .command({
      command: '*',
      ...csv,
    })
    .version(version);
});
