#!/usr/bin/env node
import 'dotenv/config';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import wordpress from './wordpress/index.js';

yargs(hideBin(process.argv))
  .command(wordpress)
  .demandCommand(1)
  .help()
  .parse();

process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));
