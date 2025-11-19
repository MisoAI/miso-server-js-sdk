import { LOG_LEVEL, getLogLevelValue } from './constants.js';

export function generateShortId() {
  // 4-char random string
  return Math.random().toString(36).slice(2, 6).toLowerCase();
}

export function createLogFunction(context = {}, {
  logOutput = defaultLogOutput,
  logFilter = () => true,
  logLevel = LOG_LEVEL.INFO.NAME,
} = {}) {
  if (typeof logOutput !== 'function') {
    throw new Error('output must be a function');
  }
  const logLevelThreshold = getLogLevelValue(logLevel);
  return (...args) => {
    const event = normalizeEvent(context, args);
    const { level = LOG_LEVEL.INFO.NAME } = event;
    const logLevelValue = getLogLevelValue(level);
    if (logLevelValue > logLevelThreshold) {
      return;
    }
    if (!logFilter(event)) {
      return;
    }
    const message = formatEvent(event);
    logOutput(level, message);
  };
}

function normalizeEvent(context, args) {
  let event, level = LOG_LEVEL.INFO.NAME;
  if (args.length > 1) {
    level = args[0];
    event = args[1];
  } else {
    event = args[0];
  }
  if (typeof event === 'string') {
    event = { message: event };
  }
  event = { ...context, level, ...event };
  return event;
}

function formatEvent({ job, task, type, level, message = '', ...event } = {}) {
  let tags = '';
  if (job) {
    tags += formatJobTag(job);
  }
  if (task) {
    tags += formatTaskTag(task);
  }
  if (level) {
    tags += `[${level}]`;
  }
  if (type) {
    tags += `[${type}]`;
  }
  message = message || JSON.stringify(event);
  return `${tags} ${message}`;
}

function formatJobTag(job) {
  if (typeof job === 'string') {
    return `[job=${job}]`;
  }
  const terms = [];
  if (job.name) {
    terms.push(job.name);
  }
  if (job.id) {
    terms.push(job.id);
  }
  return terms.length ? `[job=${terms.join('/')}]` : '';
}

function formatTaskTag(task) {
  return `[task=${typeof task === 'string' ? task : (task.name || task.id)}]`;
}

function defaultLogOutput(level, message) {
  switch (level) {
    case LOG_LEVEL.FATAL.NAME:
    case LOG_LEVEL.ERROR.NAME:
      console.error(message);
      break;
    default:
      console.log(message);
  }
}
