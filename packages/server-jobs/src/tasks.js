import { LOG_LEVEL } from './constants.js';
import { spawn } from './process.js';
import { createLogFunction, generateJobId } from './logs.js';
import { formatDuration } from './utils.js';

export async function runJob(job, options = {}) {
  job = normalizeJob(job);
  const log = createLogFunction({ job }, options);
  const { tasks = [] } = job;

  log(`Starting job with ${tasks.length} tasks`);

  let index = 0;
  for (let task of tasks) {
    task = normalizeTask(task, index);
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

  await spawn(command, args || [], {
    shell,
    onStdout: data => log(parseJsonIfNecessary(data)),
    onStderr: data => log(LOG_LEVEL.ERROR.NAME, parseJsonIfNecessary(data)),
    ...options,
  });

  const endTime = Date.now();
  const elapsed = endTime - task.timestamp;
  log(`Task done in ${formatDuration(elapsed)}`);
}

function normalizeJob(job) {
  job = { ...job, timestamp: Date.now() };
  if (!job.id) {
    job.id = generateJobId();
  }
  return job;
}

function normalizeTask(task, index) {
  task = { ...task, index, timestamp: Date.now() };
  if (!task.id) {
    task.id = generateJobId();
  }
  return task;
}

function formatTaskCommand({ command, args = [] }) {
  return [command, ...args].join(' ');
}

function parseJsonIfNecessary(data) {
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
