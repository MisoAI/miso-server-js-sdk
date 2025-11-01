const DURATION_EXPR = /^(\d+)([s|m|h|d|w])$/;
const TS_PER_UNIT = {
  ms: 1,
  s: 1000,
};
TS_PER_UNIT.m = TS_PER_UNIT.s * 60;
TS_PER_UNIT.h = TS_PER_UNIT.m * 60;
TS_PER_UNIT.d = TS_PER_UNIT.h * 24;
TS_PER_UNIT.w = TS_PER_UNIT.d * 7;

export function parseDuration(expr, unit) {
  if (expr === undefined || typeof expr === 'number') {
    return expr;
  }
  let value = expr;
  if (typeof unit !== 'string') {
    const m = expr.match(DURATION_EXPR);
    if (!m) {
      throw new Error(`Unrecognized expression: ${expr}`);
    }
    [value, unit] = m.slice(1);
  }
  const ts = TS_PER_UNIT[unit.toLowerCase()];
  if (!ts) {
    throw new Error(`Unrecognized time unit: ${expr}`);
  }
  return value * ts;
}

export function getYear(dateStr) {
  return new Date(dateStr).getFullYear();
}

const RE_DATE_EXPR = /^(?:\d{4})|(?:\d{4}-[Qq\d]\d)|(?:\d{4}-\d{2}-[Ww\d]\d)$/;

// TODO: support hour, minute

export function startOfDate(expr) {
  if (expr === undefined) {
    return undefined;
  }
  const parsed = parseDateExpr(expr);
  switch (parsed.type) {
    case 'ts':
      return parsed.ts;
    case 'year':
      return Date.UTC(parsed.year);
    case 'quarter':
      return Date.UTC(parsed.year, (parsed.quarter - 1) * 3);
    case 'month':
      return Date.UTC(parsed.year, parsed.month - 1);
    case 'week':
      return Date.UTC(parsed.year, parsed.month - 1, (parsed.week - 1) * 7 + 1);
    case 'day':
      return Date.UTC(parsed.year, parsed.month - 1, parsed.day);
    default:
      throw new Error(`Unrecognized date: ${expr}`);
  }
}

export function nextOfDate(expr) {
  if (expr === undefined) {
    return undefined;
  }
  const parsed = parseDateExpr(expr);
  switch (parsed.type) {
    case 'ts':
      return parsed.ts + 1;
    case 'year':
      return Date.UTC(parsed.year + 1);
    case 'quarter':
      return Date.UTC(parsed.year, parsed.quarter * 3);
    case 'month':
      return Date.UTC(parsed.year, parsed.month);
    case 'week':
      // roll over to 1st of next month if week is 4
      return Date.UTC(parsed.year, parsed.week < 4 ? parsed.month - 1 : parsed.month, (parsed.week % 4) * 7 + 1);
    case 'day':
      return Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1);
    default:
      throw new Error(`Unrecognized date: ${expr}`);
  }
}

export function endOfDate(expr) {
  if (expr === undefined) {
    return undefined;
  }
  return nextOfDate(expr) - 1000; // 1 sec
}

function parseDateExpr(expr) {
  switch (typeof expr) {
    case 'number':
      if (expr < 100) {
        throw new Error(`Unrecognized date: ${expr}`);
      }
      return expr < 10000 ? { type: 'year', year: expr } : { type: 'ts', ts: expr };
    case 'string':
      expr = expr.trim();
      const len = expr.length;
      if (!RE_DATE_EXPR.test(expr)) {
        throw new Error(`Unrecognized date: ${expr}`);
      }
      const year = parseInt(expr.slice(0, 4), 10);
      if (isNaN(year)) {
        throw new Error(`Unrecognized date: ${expr}`);
      }
      if (len === 4) {
        return { type: 'year', year };
      }
      if (len === 7 && (expr.charAt(5) === 'Q' || expr.charAt(5) === 'q')) {
        const quarter = parseInt(expr.charAt(6), 10);
        if (isNaN(quarter) || quarter < 1 || quarter > 4) {
          throw new Error(`Unrecognized date: ${expr}`);
        }
        return { type: 'quarter', year, quarter };
      }
      const month = parseInt(expr.slice(5, 7), 10);
      if (isNaN(month) || month < 1 || month > 12) {
        throw new Error(`Unrecognized date: ${expr}`);
      }
      if (len === 7) {
        return { type: 'month', year, month };
      }
      if (expr.charAt(8) === 'W' || expr.charAt(8) === 'w') {
        const week = parseInt(expr.charAt(9), 10);
        if (isNaN(week) || week < 1 || week > 4) {
          throw new Error(`Unrecognized date: ${expr}`);
        }
        return { type: 'week', year, month, week };
      }
      let date;
      try {
        // parse so we can validate the day part
        date = new Date(Date.parse(expr));
      } catch (_) {
        throw new Error(`Unrecognized date: ${expr}`);
      }
      return { type: 'day', year, month, day: date.getUTCDate() };
    default:
      throw new Error(`Unrecognized date: ${expr}`);
  }
}
