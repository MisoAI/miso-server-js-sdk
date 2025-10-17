#!/usr/bin/env node
import { yargs } from '@miso.ai/server-commons';
import version from '../src/version.js';
import run from './run.js';

yargs.build(yargs => {
  yargs
    .command(run)
    .version(version);
});
