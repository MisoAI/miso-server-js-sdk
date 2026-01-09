import { pipeline } from 'stream/promises';
import split2 from 'split2';
import { log, stream, splitObj } from '@miso.ai/server-commons';
import { MisoClient, logger } from '../src/index.js';
import { buildForWrite } from './utils.js';

function build(yargs) {
  return buildForWrite(yargs)
    .option('progress', {
      alias: ['p'],
      describe: 'Set log format progress',
      type: 'boolean',
    })
    .option('stream-name', {
      alias: ['name'],
      describe: 'Stream name that shows up in log messages',
    })
    .option('log-level', {
      describe: 'Log level',
    })
    .option('log-format', {
      describe: 'Log format',
    });
}

const run = type => async ({
  env,
  key,
  server,
  channel,
  ...options
}) => {
  const { debug } = options;
  const client = new MisoClient({ env, key, server, debug });

  if (channel) {
    await runChannel(client, type, options);
  } else {
    await runStream(client, type, options);
  }
};

async function runChannel(client, type, options) {
  const [deleteOptions] = splitObj(options, ['params', 'requestsPerSecond', 'bytesPerSecond', 'recordsPerRequest', 'bytesPerRequest', 'debug']);
  const deleteChannel = client.api[type].deleteChannel(deleteOptions);

  await pipeline(
    process.stdin,
    split2(JSON.parse),
    deleteChannel,
    new stream.OutputStream({ objectMode: true }),
  );
}

async function runStream(client, type, {
  param: params,
  ['records-per-request']: recordsPerRequest,
  ['records-per-second']: recordsPerSecond,
  debug,
  progress,
  ['stream-name']: name,
  ['log-level']: loglevel,
  ['log-format']: logFormat,
}) {
  loglevel = (debug || progress) ? log.DEBUG : loglevel;
  logFormat = progress ? logger.FORMAT.PROGRESS : logFormat;

  const deleteStream = client.api[type].deleteStream({
    name,
    params,
    heartbeatInterval: logFormat === logger.FORMAT.PROGRESS ? 250 : false,
    recordsPerRequest,
    recordsPerSecond,
  });

  const logStream = logger.createLogStream({
    api: 'delete',
    type,
    level: loglevel,
    format: logFormat,
  });

  await pipeline(
    process.stdin,
    split2(),
    deleteStream,
    logStream,
  );
}

export default function(type) {
  return {
    command: 'delete',
    aliases: ['d'],
    description: `Delete ${type}`,
    builder: build,
    handler: run(type),
  };
}
