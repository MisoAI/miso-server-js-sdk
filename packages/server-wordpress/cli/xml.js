import { join } from 'path';
import { pipeline } from 'stream/promises';
import { stream } from '@miso.ai/server-commons';
import { getEntityTransformFunction, EntityTransformStream } from '../src/entities/index.js';
import { XmlParser } from '../src/index.js';

function build(yargs) {
  return yargs
    .option('transform', {
      alias: 't',
      describe: 'Transform function',
    })
    .option('parser', {
      alias: 'p',
      describe: 'Parser function',
    })
    .option('surpress-errors', {
      alias: 's',
      type: 'boolean',
      default: false,
      describe: 'Surpress errors',
    });
}

async function run({ file, parser, transform, ...options } = {}) {
  parser = await getParser(parser);
  await pipeline(
    file ? stream.fileReadStream(file) : process.stdin,
    new stream.XmlParseStream(parser, options),
    ...(await getTransformStreams(transform)),
    new stream.OutputStream(),
  );
}

export default {
  command: 'xml [file]',
  desc: 'Read from XML file',
  builder: build,
  handler: run,
};

async function getParser(file) {
  if (!file || file === 'default') {
    return new XmlParser();
  }
  try {
    const cls = (await import(join(process.env.PWD, file))).default;
    return new cls();
  } catch (e) {
    throw new Error(`Failed to load parser from ${file}: ${e.message}`);
  }
}

async function getTransformStreams(transform) {
  if (!transform) {
    return [];
  }
  return [
    new EntityTransformStream([], { transform: await getEntityTransformFunction(transform) }),
  ];
}
