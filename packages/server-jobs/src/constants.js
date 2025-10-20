function logLevel(NAME, VALUE) {
  return Object.freeze({ NAME, VALUE });
}

const LOG_LEVELS = [
  logLevel('fatal', 0),
  logLevel('error', 5),
  logLevel('warn', 10),
  logLevel('report', 10),
  logLevel('info', 15),
  logLevel('debug', 20),
];

export const LOG_LEVEL = Object.freeze(LOG_LEVELS.reduce((acc, level) => {
  acc[level.NAME.toUpperCase()] = level;
  return acc;
}, {}));

export function getLogLevelValue(name) {
  return (LOG_LEVEL[name.toUpperCase()] || LOG_LEVEL.INFO).VALUE;
}
