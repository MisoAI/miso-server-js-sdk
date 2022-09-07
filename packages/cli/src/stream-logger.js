import { Transform } from 'stream';

export const LOG_LEVELS = ['fatal', 'error', 'warning', 'info', 'debug'];

const LOG_LEVEL_ORDINALS = toOrdinalMap(LOG_LEVELS);
const LOG_LEVEL_DEBUG = LOG_LEVEL_ORDINALS['debug'];

export class LogStream extends Transform {

  constructor({ level = 'info', format = 'json', ...options } = {}) {
    super({
      writableObjectMode: true,
      readableObjectMode: false,
    });
    this._level = LOG_LEVEL_ORDINALS[level];
    if (this._level === undefined) {
      throw new Error(`Unrecognized log level: ${level}`);
    }
    this._formatter = getFormatter(format);
  }

  _transform(record, _, next) {
    if (this._level < (LOG_LEVEL_ORDINALS[record.level] || LOG_LEVEL_DEBUG)) {
      next();
      return;
    }
    if (this._level < LOG_LEVEL_DEBUG) {
      delete record.state;
    }
    this.push(this._formatter(record));
    next();
  }

}

function getFormatter(format) {
  switch (format) {
    case 'text':
      return formatText;
    case 'json':
      return formatJson;
    default:
      throw new Error(`Unrecognized format: ${format}`);
  }
}

function formatJson(record) {
  return JSON.stringify(record);
}

function formatText({ level, timestamp, event, ...record }) {
  return `[${new Date(timestamp).toISOString()}][${level.toUpperCase()}] ${event}, ${JSON.stringify(record)}\n`;
}

function toOrdinalMap(items) {
  let i = 1;
  const map = {};
  for (const item of items) {
    map[item] = i++;
  }
  return map;
}
