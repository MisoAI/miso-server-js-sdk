import { spawn } from 'child_process';
import { LOG_LEVEL } from './constants.js';
import { finished } from './process.js';
import { createLogFunction, generateShortId } from './logs.js';
import { formatDuration } from './utils.js';

export async function runJob(job, options = {}) {
  job = normalizeJob(job);
  const log = createLogFunction({ job }, options);
  const { tasks = [] } = job;

  log(`Starting job with ${tasks.length} tasks`);

  const total = tasks.length;
  let index = 0;
  for (let task of tasks) {
    task = normalizeTask(task, { index, total });
    await runTask(job, task, options);
    index++;
  }

  const endTime = Date.now();
  const elapsed = endTime - job.timestamp;
  log(`Job done in ${formatDuration(elapsed)}`);
}

async function runTask(job, task, options = {}) {
  const log = createLogFunction({ job, task }, options);
  const { command, args, shell } = task;
  log(`Starting task: ${formatTaskCommand(task)}`);

  const child = spawn(command, args, { shell });
  child.stdout.on('data', data => log(parseJsonIfNecessary(data)));
  child.stderr.on('data', data => log(LOG_LEVEL.ERROR.NAME, parseJsonIfNecessary(data)));
  await finished(child);

  const endTime = Date.now();
  const elapsed = endTime - task.timestamp;
  log(`Task done in ${formatDuration(elapsed)}`);
}

function normalizeJob(job) {
  job = { ...job, timestamp: Date.now() };
  if (!job.id) {
    job.id = generateShortId();
  }
  return job;
}

function normalizeTask(task, { index, total } = {}) {
  task = { ...task, index, total, timestamp: Date.now() };
  if (!task.id) {
    task.id = generateShortId();
  }
  return task;
}

function formatTaskCommand({ command, args = [] }) {
  return [command, ...args].join(' ');
}

function parseJsonIfNecessary(data) {
  if (Buffer.isBuffer(data)) {
    data = data.toString();
  }
  if (typeof data !== 'string') {
    return data;
  }
  data = data.trim();
  if (!data.startsWith('{') || !data.endsWith('}')) {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch (_) {
    return data;
  }
}
