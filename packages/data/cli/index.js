#!/usr/bin/env node
import 'dotenv/config';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import wordpress from './wordpress/index.js';
import csv from './csv/index.js';
import transform from './transform.js';
import version from '../src/version.js';

yargs(hideBin(process.argv))
  .command(transform)
  .command(wordpress)
  .command(csv)
  .demandCommand(1)
  .version(version)
  .help()
  .parse();

process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));
