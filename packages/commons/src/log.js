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
