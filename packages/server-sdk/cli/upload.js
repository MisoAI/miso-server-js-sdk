import split2 from 'split2';
import { log, stream } from '@miso.ai/server-commons';
import { MisoClient, logger, normalize } from '../src/index.js';

function build(yargs) {
  return yargs
    .option('async', {
      alias: ['a'],
      describe: 'Asynchrnous mode',
    })
    .option('dry-run', {
      alias: ['dry'],
      describe: 'Dry run mode',
    })
    .option('lenient', {
      describe: 'Accept some enient record schema',
      type: 'boolean',
    })
    .option('records-per-request', {
      alias: ['rpr'],
      describe: 'How many records to send in a request',
    })
    .option('bytes-per-request', {
      alias: ['bpr'],
      describe: 'How many bytes to send in a request',
    })
    .option('bytes-per-second', {
      alias: ['bps'],
      describe: 'How many bytes to send per second',
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
    .option('legacy', {
      type: 'boolean',
      default: false,
    })
    .hide('legacy')
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
  async,
  ['dry-run']: dryRun,
  lenient,
  ['records-per-request']: recordsPerRequest,
  ['bytes-per-request']: bytesPerRequest,
  ['bytes-per-second']: bytesPerSecond,
  ['experiment-id']: experimentId,
  debug,
  progress,
  ['stream-name']: name,
  legacy,
  ['log-level']: loglevel,
  ['log-format']: logFormat,
}) => {

  loglevel = (debug || progress) ? log.DEBUG : loglevel;
  logFormat = progress ? logger.FORMAT.PROGRESS : logFormat;

  const client = new MisoClient({ key, server });

  const uploadStreamObjectMode = lenient;

  const uploadStream = client.createUploadStream(type, {
    objectMode: uploadStreamObjectMode,
    legacy,
    name,
    async, 
    dryRun,
    params,
    heartbeatInterval: logFormat === logger.FORMAT.PROGRESS ? 250 : false,
    //heartbeat: logFormat === logger.FORMAT.PROGRESS ? 250 : undefined,
    recordsPerRequest,
    bytesPerRequest,
    bytesPerSecond,
    experimentId,
    extra: {
      lenient,
    },
  });

  const logStream = logger.createLogStream({
    api: 'upload',
    type,
    legacy,
    level: loglevel,
    format: logFormat,
  });

  // standard: stdin -> split2 -> upload -> log
  // lenient: stdin -> split2 -> parse -> normalize -> upload -> log
  // notice that the output of split2 are strings, while input/output of normalize are objects

  await stream.pipeline(
    process.stdin,
    split2(),
    ...(lenient ? [
      stream.parse(),
      new normalize.Stream(type),
    ] : []),
    uploadStream,
    logStream,
  );
};

export default function(type) {
  return {
    command: 'upload',
    aliases: ['u'],
    description: `Upload ${type}`,
    builder: build,
    handler: run(type),
  };
}
