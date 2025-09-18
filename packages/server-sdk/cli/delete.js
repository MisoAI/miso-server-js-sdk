import split2 from 'split2';
import { log, stream } from '@miso.ai/server-commons';
import { MisoClient, logger } from '../src/index.js';

function build(yargs) {
  return yargs
    .option('records-per-request', {
      alias: ['rpr'],
      describe: 'How many records to send in a request',
    })
    .option('records-per-second', {
      alias: ['rps'],
      describe: 'How many records to send per second',
    })
    .option('debug', {
      describe: 'Set log level to debug',
      type: 'boolean',
    })
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
  key,
  server,
  param: params,
  ['records-per-request']: recordsPerRequest,
  ['records-per-second']: recordsPerSecond,
  debug,
  progress,
  ['stream-name']: name,
  ['log-level']: loglevel,
  ['log-format']: logFormat,
}) => {

  loglevel = (debug || progress) ? log.DEBUG : loglevel;
  logFormat = progress ? logger.FORMAT.PROGRESS : logFormat;

  const client = new MisoClient({ key, server, debug });

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

  await stream.pipeline(
    process.stdin,
    split2(),
    deleteStream,
    logStream,
  );
};

export default function(type) {
  return {
    command: 'delete',
    aliases: ['d'],
    description: `Delete ${type}`,
    builder: build,
    handler: run(type),
  };
}
