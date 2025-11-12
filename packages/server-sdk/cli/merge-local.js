#!/usr/bin/env node
import 'dotenv/config';
import { join } from 'path';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { chain } from 'stream-chain';
import split2 from 'split2';
import { stream, trimObj } from '@miso.ai/server-commons';

const PWD = process.env.PWD;

process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));

function build(yargs) {
  return yargs
    .positional('file1', {
      describe: 'First record file',
      type: 'string',
      demandOption: true,
    })
    .positional('file2', {
      describe: 'Second record file',
      type: 'string',
    })
    .option('join-mode', {
      alias: 'm',
      describe: 'Join mode',
      type: 'string',
      default: 'merge',
      choices: ['merge', 'rewrite-meta', 'remeta'],
    })
    .option('join-function', {
      alias: 'f',
      describe: 'Join function',
      type: 'string',
    })
    .option('stdin', {
      alias: 'i',
      describe: 'Read the first stream from stdin',
      type: 'boolean',
      default: false,
    });
}

async function run({ file1, file2, stdin, joinMode, joinFunction }) {
  if (stdin) {
    file2 = file1;
    file1 = undefined;
  } else if (!file2) {
    throw new Error('Second file is required');
  }
  const stream1 = chain([
    stdin ? process.stdin : createReadStream(file1),
    ...(file1 && file1.endsWith('.gz')) ? [createGunzip()] : [],
    split2(JSON.parse),
  ]);
  const stream2 = chain([
    createReadStream(file2),
    ...(file2 && file2.endsWith('.gz')) ? [createGunzip()] : [],
    split2(JSON.parse),
  ]);
  await pipeline(
    stream.joinStreams([stream1, stream2], await getJoinFunction(joinMode, joinFunction)),
    new stream.OutputStream(),
  );
}

async function getJoinFunction(joinMode, joinFunction) {
  if (joinFunction) {
    try {
      const fn = await import(join(PWD, joinFunction));
      if (!fn.default) {
        throw new Error('Join function must have a default export');
      }
      return fn.default;
    } catch (e) {
      console.error(`Failed to load join function ${joinFunction}:`, e);
      process.exit(1);
    }
  }
  switch (joinMode) {
    case 'merge':
      return merge;
    case 'rewrite-meta':
    case 'remeta':
      return rewriteMeta;
    default:
      throw new Error(`Unsupported join mode: ${joinMode}`);
  }
}

function merge(record1, record2) {
  assertSameProductId(record1, record2);
  return trimObj({
    ...record1,
    ...record2,
    custom_attributes: trimObj({
      ...(record1 && record1.custom_attributes),
      ...(record2 && record2.custom_attributes),
    }),
  });
}

function rewriteMeta(record1, record2) {
  assertSameProductId(record1, record2);
  const { description, html, children } = record1;
  const { description: _0, html: _1, children: _2, ...rest } = record2;
  return trimObj({
    ...rest,
    description,
    html,
    children,
  });
}

function assertSameProductId(record1, record2) {
  if (record1.product_id !== record2.product_id) {
    throw new Error(`Product IDs do not match: ${record1.product_id} and ${record2.product_id}`);
  }
}

export default {
  command: 'merge-local <file1> [file2]',
  alias: ['patch-local'],
  description: 'Apply patch records from file onto input record stream',
  builder: build,
  handler: run,
};
