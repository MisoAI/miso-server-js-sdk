import { spawn as _spawn } from 'child_process';

export async function spawn(command, args, { onStdout, onStderr, ...options } = {}) {
  return new Promise((resolve, reject) => {
    const child = _spawn(command, args, options);

    if (typeof onStdout === 'function') {
      child.stdout.on('data', data => onStdout(data.toString()));
    }
    if (typeof onStderr === 'function') {
      child.stderr.on('data', data => onStderr(data.toString()));
    }

    // fatal errors, like ENOENT, EACCES
    child.on('error', reject);

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command ${command} failed with code ${code} and signal ${signal}`));
      }
    });
  });
}
