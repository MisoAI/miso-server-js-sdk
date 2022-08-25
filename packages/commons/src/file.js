import { access } from 'fs/promises';
import { accessSync, constants } from 'fs';

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
