import { join } from 'path';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import split2 from 'split2';
import { stream } from '@miso.ai/server-commons';
import { MisoClient } from '../src/index.js';

function build(yargs) {
  return yargs
    .option('file', {
      alias: ['f'],
      describe: 'File that contains the merge function',
    })
    .option('fetch', {
      describe: 'Fetch records from server',
      type: 'boolean',
      default: true,
    })
    .option('base', {
      alias: ['b'],
      describe: 'Base record file',
    })
}

const run = type => async ({
  env,
  key,
  server,
  file,
  base,
  debug,
  ...options
}) => {
  const mergeFn = await getMergeFn(file);
  const records = await buildBaseRecords(base);
  const client = new MisoClient({ env, key, server, debug });
  const mergeStream = client.api[type].mergeStream({ ...options, mergeFn, records });
  const outputStream = new stream.OutputStream({ objectMode: true });
  await pipeline(
    process.stdin,
    split2(),
    stream.parse(),
    mergeStream,
    outputStream
  );
}

export default function(type) {
  return {
    command: 'merge',
    description: `Merge records with existing ${type} in catalog.`,
    builder: build,
    handler: run(type),
  };
}

async function getMergeFn(file) {
  if (!file || file === 'default') {
    return undefined;
  }
  try {
    return (await import(join(process.env.PWD, file))).default;
  } catch (e) {
    throw new Error(`Failed to load merge function from ${file}: ${e.message}`);
  }
}

async function buildBaseRecords(file) {
  if (!file) {
    return undefined;
  }
  let readStream = createReadStream(file);
  if (file.endsWith('.gz')) {
    readStream = readStream.pipe(createGunzip());
  }
  readStream = readStream.pipe(split2()).pipe(stream.parse());
  const records = [];
  for await (const record of readStream) {
    records.push(record);
  }
  return records;
}
