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

export async function getMemoryUsage(child) {
  const ps = spawn('ps', ['-o', 'pid,rss,vsz,pmem', '-p', child.pid]);
  for await (const line of ps.stdout) {
    const [pid, rss, vsz, pmem] = line.toString().trim().split(' ');
    if (pid === child.pid) {
      return { rss, vsz, pmem };
    }
  }
  return undefined;
}

export async function finished(child) {
  return new Promise((resolve, reject) => {
    // fatal errors, like ENOENT, EACCES
    child.on('error', reject);

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${child.spawnargs.join(' ')}" failed with code ${code} and signal ${signal}`));
      }
    });
  });
}

export function handleEpipe() {
  process.stdout.on('error', err => err.code == 'EPIPE' && process.exit(0));
}
