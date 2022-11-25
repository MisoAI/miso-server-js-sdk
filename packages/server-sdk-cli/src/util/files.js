import { resolve, dirname } from 'path';
import { constants } from 'fs';
import { stat, access, readFile } from 'fs/promises';

export async function findInParentDirs(path, fn) {
  path = resolve(path);
  do {
    const result = await fn(path);
    if (typeof result !== 'undefined') {
      return result;
    }
  } while (path !== (path = dirname(path)))
  return undefined;
}

export async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch(_) {
    return false;
  }
}

export async function readContent(file, { encoding = 'utf8' } = {}) {
  await access(file, constants.R_OK);
  return readFile(file, { encoding });
}
