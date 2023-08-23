import { join } from 'path';
import { Transform } from 'stream';

const PWD = process.env.PWD;

export async function getTransformStream(loc) {
  const mod = await import(join(PWD, loc));
  return mod.default ? new mod.default() : new Transform(normalizeOptions(mod));
}

function normalizeOptions({
  objectMode,
  readableObjectMode,
  writableObjectMode,
  ...options
} = {}) {
  readableObjectMode = readableObjectMode !== undefined ? readableObjectMode : objectMode !== undefined ? objectMode : true;
  writableObjectMode = writableObjectMode !== undefined ? writableObjectMode : objectMode !== undefined ? objectMode : true;
  return {
    readableObjectMode,
    writableObjectMode,
    ...options
  };
}
