import { padLeft, padRight } from './string.js';

export const FATAL = 'fatal';
export const ERROR = 'error';
export const WARNING = 'warning';
export const INFO = 'info';
export const DEBUG = 'debug';

const LEVEL_VALUES = {
  [FATAL]: 2,
  [ERROR]: 4,
  [WARNING]: 6,
  [INFO]: 8,
  [DEBUG]: 50,
};
const FALLBACK_LEVEL_VALUE = 40;

export const LEVELS = Object.keys(LEVEL_VALUES);

LEVELS.sort(compareLevel);

export function reachesThreshold(level, threshold) {
  if (!LEVEL_VALUES[threshold]) {
    throw new Error(`Unrecognized log level: ${threshold}`);
  }
  if (!level) {
    throw new Error(`Level is absent: ${level}`);
  }
  return compareLevel(level, threshold) <= 0;
}

export function isError(level) {
  return reachesThreshold(level, ERROR);
}

function compareLevel(a, b) {
  return (LEVEL_VALUES[a] || FALLBACK_LEVEL_VALUE) - (LEVEL_VALUES[b] || FALLBACK_LEVEL_VALUE);
}

export function formatDuration(value) {
  if (typeof value !== 'number') {
    throw new Error(`Value must be a number: ${value}`);
  }
  value = Math.floor(value);
  const ms = padLeft(`${value % 60000}`, 5, '0');
  let min = '00';
  let hour = '00';
  if (value >= 60000) {
    value = Math.floor(value / 60000);
    min = padLeft(`${value % 60}`, 2, '0');
    if (value >= 60) {
      hour = padLeft(Math.floor(value / 60), 2, '0');
    }
  }
  return `${hour}:${min}:${ms.substring(0, 2)}.${ms.substring(2, 5)}`;
}

export function formatBytes(value) {
  let i = 0;
  for (; i < 4; i++) {
    if (value < 1024) {
      break;
    }
    value /= 1024;
  }
  return `${Math.floor(value * 100) / 100} ${UNITS[i]}`;
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatTable(rows, { columnPadding: columnSpacing = 3 } = {}) {
  const maxLens = [];
  for (const cells of rows) {
    for (let j = 0, len = cells.length; j < len; j++) {
      const len = `${cells[j]}`.length;
      if (!maxLens[j] || maxLens[j] < len) {
        maxLens[j] = len;
      }
    }
  }
  const colSpc = ' '.repeat(columnSpacing);
  let str = '';
  for (let i = 0, len = rows.length; i < len; i++) {
    if (i > 0) {
      str += '\n';
    }
    const cells = rows[i];
    for (let j = 0, len = cells.length; j < len; j++) {
      if (j > 0) {
        str += colSpc;
      }
      str += padRight(`${cells[j]}`, maxLens[j], ' ');
    }
  }
  return str;
}
