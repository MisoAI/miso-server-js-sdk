import { join } from 'path';
import { startOfDate, endOfDate } from '@miso.ai/server-commons';

const PWD = process.env.PWD;

export function normalizeOptions({ date, after, before, ids, ...options }) {
  [after, before] = [startOfDate(date || after), endOfDate(date || before)];
  ids = ids ? `${ids}`.split(',').map(s => s.trim()) : ids;
  return { ...options, after, before, ids };
}

export async function normalizeTransform(transform) {
  if (typeof transform === 'string') {
    if (transform === 'default' || transform === 'legacy') {
      return transform;
    }
    return (await import(join(PWD, transform))).default;
  }
  return !!transform;
}

export function parseDate(value) {
  return Date.parse(`${value}Z`);
}
