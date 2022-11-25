import { resolve } from 'path';
import { constants } from 'fs';
import { access, readFile } from 'fs/promises';
import { findInParentDirs, isFile, readContent } from './util/files.js';
import version from './version.js';

const MISO_RC = '.misorc';
const MISO_RC_JS = '.misorc.js';

const CONFIG_FORMAT = {
  JSON: 'json',
  JS: 'js',
};

export default async function getConfig() {
  const cwd = process.env.PWD;

  // look for .misorc
  let source = await findMisoRc(cwd);

  // look for miso entry in package.json
  // TODO

  if (source) {
    try {
      source.content = await readContent(source.file, source);
      source.config = await parseMisoRc(source);
    } catch(error) {
      console.error(`Cannot read config file: ${source.file}`);
      console.error(error);
    }
  }

  // generate a default config
  if (!source) {
    source = generateDefaultConfigSource();
  }

  return normalizeConfig(source, { cwd });
}

async function findMisoRc(cwd) {
  return findInParentDirs(cwd, async (path) => {
    let file = resolve(path, MISO_RC);
    if (await isFile(file)) {
      return {
        format: CONFIG_FORMAT.JSON,
        file,
      };
    }
    // TODO: try js format
    return undefined;
  });
}

async function parseMisoRc({ format, content }) {
  switch (format) {
    case CONFIG_FORMAT.JSON:
      return JSON.parse(content);
    default:
      throw new Error(`Unimplemented.`);
  }
}

function generateDefaultConfigSource() {
  return {
    generated: true,
    config: generateDefaultConfig(),
  };
}

function generateDefaultConfig() {
  return {};
}

function normalizeConfig({ config, format, file }, { cwd }) {
  return Object.freeze({
    _meta: Object.freeze({
      configSource: Object.freeze({ file, format }),
      cliVersion: version,
      cwd,
    }),
    ...config,
  });
}
