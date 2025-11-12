import { buffer as streamToBuffer } from 'stream/consumers';
import yauzl from 'yauzl-promise';

export class ZipArchive {

  constructor(source, options = {}) {
    this._source = source;
    this._zip = Buffer.isBuffer(source) ? yauzl.fromBuffer(source, options) : yauzl.open(source, options);
    this._entryMap = undefined;
  }

  async _getEntryMap() {
    return this._entryMap || (this._entryMap = this._buildEntryMap());
  }

  async _getEntry(filename) {
    const entryMap = await this._getEntryMap();
    const entry = entryMap[filename];
    if (!entry) {
      throw new Error(`Entry not found: ${filename}`);
    }
    return entry;
  }

  async _buildEntryMap() {
    const zip = await this._zip;
    const entries = {};
    for await (const entry of zip) {
      if (!entry.filename.endsWith('/')) {
        entries[entry.filename] = entry;
      }
    }
    return entries;
  }

  async list() {
    return Object.keys(await this._getEntryMap());
  }

  async openReadStream(filename, options = {}) {
    const entry = await this._getEntry(filename);
    return await entry.openReadStream(options);
  }

  async readAsBuffer(filename, options) {
    return await streamToBuffer(await this.openReadStream(filename, options));
  }

  async cat(filename, options) {
    return `${await this.readAsBuffer(filename, options)}`;
  }

  async close() {
    const zip = await this._zip;
    await zip.close();
  }

}
