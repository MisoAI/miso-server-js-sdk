import { startOfDate, endOfDate } from '@miso.ai/server-commons';

export function normalizeOptions({ date, after, before, ids, ...options }) {
  [after, before] = [startOfDate(date || after), endOfDate(date || before)];
  ids = ids ? `${ids}`.split(',').map(s => s.trim()) : ids;
  return { ...options, after, before, ids };
}
