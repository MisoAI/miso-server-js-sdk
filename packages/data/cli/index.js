#!/usr/bin/env node
import 'dotenv/config';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import wordpress from './wordpress/index.js';
import version from '../src/version.js';

yargs(hideBin(process.argv))
  .command(wordpress)
  .demandCommand(1)
  .version(version)
  .help()
  .parse();

process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));
