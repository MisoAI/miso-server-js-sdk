import { dirname } from 'path';
import { access, readFile, mkdir, writeFile } from 'fs/promises';
import { accessSync, readFileSync, mkdirSync, writeFileSync, constants } from 'fs';
import yaml from 'js-yaml';
import toml from 'toml';

export async function loadConfig(file) {
  await access(file, constants.R_OK);
  const content = await readFile(file, { encoding: 'utf8' });
  return parseConfig(file, content);
}

export function loadConfigSync(file) {
  accessSync(file, constants.R_OK);
  const content = readFileSync(file, { encoding: 'utf8' });
  return parseConfig(file, content);
}

function parseConfig(file, content) {
  const ext = getFileExtension(file);
  switch (ext) {
    case 'yml':
    case 'yaml':
      return yaml.load(content);
    case 'toml':
      return toml.parse(content);
    case 'json':
      return JSON.parse(content);
    default:
      throw new Error(`Unrecognized file format: ${file}`);
  }
}

export async function saveConfig(file, config) {
  // TODO: check if valid file URL
  await mkdir(dirname(file), { recursive: true });
  const ext = getFileExtension(file);
  const content = formatConfig(ext, config);
  await writeFile(file, content, { encoding: 'utf8' });
}

export function saveConfigSync(file, config) {
  // TODO: check if valid file URL
  mkdirSync(dirname(file), { recursive: true });
  const ext = getFileExtension(file);
  const content = formatConfig(ext, config);
  writeFileSync(file, content, { encoding: 'utf8' });
}

function formatConfig(ext, config) {
  switch (ext) {
    case 'yml':
    case 'yaml':
      throw new Error(`Unimplemented yet.`);
    case 'toml':
      throw new Error(`Unimplemented yet.`);
    case 'json':
      return JSON.stringify(config, undefined, 2);
    default:
      throw new Error(`Unrecognized file format: ${ext}`);
  }
}

function getFileExtension(file) {
  const i = file.lastIndexOf('.');
  if (i < 0) {
    throw new Error(`Unknown file type: ${file}`);
  }
  return file.substring(i + 1);
}
