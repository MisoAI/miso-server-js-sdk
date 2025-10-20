import { resolve } from 'path';
import fs from 'fs/promises';
import { Transform } from 'stream';
import { readFileAsLines } from './file.js';

const DEFAULT_FLUSH_THRESHOLD = 100;

export default class HashStore {

  constructor({ file, hashFn, flushThreshold = DEFAULT_FLUSH_THRESHOLD } = {}) {
    if (!file) {
      throw new Error('File path is required');
    }
    if (!hashFn) {
      throw new Error('Hash function is required');
    }
    this._file = file;
    this._hashFn = hashFn;
    this._flushThreshold = flushThreshold;
    this._hashes = new Set();
    this._pending = [];
  }

  async purge() {
    // peek data length
    const length = (await this._read()).length;

    this._hashes = new Set();
    // delete file
    try {
      await fs.unlink(this._file);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    return length;
  }

  async load() {
    this._hashes = new Set(await this._read());
    this._pending = [];
    return this;
  }

  get() {
    return this._hashes;
  }

  contains(item) {
    return this._hashes.has(this._hashFn(item));
  }

  async add(...items) {
    for (const item of items) {
      const hash = this._hashFn(item);
      if (!this._hashes.has(hash)) {
        this._hashes.add(hash);
        this._pending.push(hash);
      }
    }
    if (this._pending.length >= this._flushThreshold) {
      await this.flush();
    }
  }

  async flush() {
    if (this._pending.length === 0) {
      return;
    }
    const pending = this._pending;
    this._pending = [];
    await this._mkdir();
    await fs.appendFile(this._file, pending.join('\n') + '\n');
  }

  exclusionStream() {
    return new HashStoreFilterTransform(this, { mode: 'exclude' });
  }

  dedupeStream() {
    return new HashStoreFilterTransform(this, { mode: 'dedupe' });
  }

  async _mkdir() {
    const dir = resolve(this._file, '..');
    await fs.mkdir(dir, { recursive: true });
  }

  async _read() {
    try {
      return await readFileAsLines(this._file);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      return [];
    }
  }

}

class HashStoreFilterTransform extends Transform {

  constructor(store, { mode } = {}) {
    super({ objectMode: true });
    this._store = store;
    switch (mode) {
      case 'exclude':
      case 'dedupe':
        break;
      default:
        throw new Error(`Unrecognized mode: ${mode}`);
    }
    this._mode = mode;
  }

  _transform(item, _, next) {
    if (!this._store.contains(item)) {
      this.push(item);
      if (this._mode === 'dedupe') {
        this._store.add(item);
      }
    }
    next();
  }

}
