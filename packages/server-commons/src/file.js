import { access } from 'fs/promises';
import { accessSync, constants, createReadStream } from 'fs';
import { createInterface } from 'readline';

export async function fileExists(file, mode = constants.F_OK) {
  try {
    await access(file, mode);
    return true;
  } catch(_) {
    return false;
  }
}

export function fileExistsSync(file, mode = constants.F_OK) {
  try {
    accessSync(file, mode);
    return true;
  } catch(_) {
    return false;
  }
}

export async function readFileAsLines(file) {
  const fileStream = createReadStream(file, { encoding: 'utf8' });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  const lines = [];
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  }

  rl.close();

  return lines;
}
