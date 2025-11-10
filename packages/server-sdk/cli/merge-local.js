#!/usr/bin/env node
import 'dotenv/config';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { gunzip } from 'zlib';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { stream, trimObj } from '@miso.ai/server-commons';
import split2 from 'split2';

process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));

function build(yargs) {
  return yargs
    .positional('file', {
      describe: 'Patch record file',
      type: 'string',
      demandOption: true,
    });
}

async function run({ file }) {
  const patches = await readRecordsIntoMap(file);
  await pipeline(
    process.stdin,
    split2(JSON.parse),
    new MergeLocalStream({ patches }),
    new stream.OutputStream(),
  );
}

async function readRecordsIntoMap(file) {
  const map = new Map();
  const content = await readContent(file);
  for (let line of content.split('\n')) {
    line = line.trim();
    if (!line) {
      continue;
    }
    try {
      const record = JSON.parse(line);
      const { product_id } = record;
      if (!product_id) {
        console.error(`Missing product_id: ${line}`);
        continue;
      }
      map.set(product_id, record);
    } catch (error) {
      console.error(`Error parsing JSON line: ${line}`, error);
    }
  }
  return map;
}

async function readContent(file) {
  let fileBuffer = await readFile(file);
  if (file.endsWith('.gz')) {
    fileBuffer = await promisify(gunzip)(fileBuffer);
  }
  return fileBuffer.toString('utf-8');
}

class MergeLocalStream extends Transform {

  constructor({
    patches,
    ...options
  } = {}) {
    super({
      objectMode: true,
      ...options,
    });
    this._patches = patches;
    this.on('drain', () => this._handleDrain());
  }

  _transform(record, _, next) {
    const patch = this._patches.get(record.product_id);
    if (patch) {
      record = this._patch(record, patch);
    }

    const pause = !this.push(record);
    if (pause) {
      this._next = next;
    } else {
      next();
    }
  }

  _patch(record, patch) {
    patch = trimObj(patch);
    return {
      ...record,
      ...patch,
      custom_attributes: trimObj({
        ...(record && record.custom_attributes),
        ...(patch && patch.custom_attributes),
      }),
    };
  }

  _handleDrain() {
    if (this._next) {
      this._next();
    }
  }

}


export default {
  command: 'merge-local <file>',
  alias: ['patch-local'],
  description: 'Apply patch records from file onto input record stream',
  builder: build,
  handler: run,
};
