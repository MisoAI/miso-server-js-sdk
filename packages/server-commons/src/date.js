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
  return floorDate(expr);
}

export function endOfDate(expr) {
  if (expr === undefined) {
    return undefined;
  }
  return nextDate(expr) - 1000; // 1 sec
}

export function floorDate(expr, unit) {
  validateUnit(unit);
  if (expr === undefined) {
    return undefined;
  }
  const [_unit, ts] = parseDateExpr(expr);
  if (unit === undefined || !isGranular(unit, _unit)) {
    return ts;
  }
  return floorTimestamp(ts, unit);
}

function floorTimestamp(ts, unit) {
  switch (unit) {
    case 'millisecond':
      return ts;
    case 'second':
      return ts - ts % TS_PER_UNIT.s;
    case 'minute':
      return ts - ts % TS_PER_UNIT.m;
    case 'hour':
      return ts - ts % TS_PER_UNIT.h;
    case 'day':
      return ts - ts % TS_PER_UNIT.d;
  }
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  switch (unit) {
    case 'week':
      return Date.UTC(year, month - 1, day > 21 ? 22 : day - (day - 1) % 7);
    case 'month':
      return Date.UTC(year, month - 1);
    case 'quarter':
      return Date.UTC(year, month - month % 3 - 3);
    case 'year':
      return Date.UTC(year);
    default:
      throw new Error(`Unrecognized unit: ${unit}`);
  }
}

export function ceilDate(expr, unit) {
  validateUnit(unit);
  if (expr === undefined) {
    return undefined;
  }
  const [_unit, ts] = parseDateExpr(expr);
  unit = unit || _unit;
  const floored = floorTimestamp(ts, unit);
  return floored === ts ? floored : nextTimestamp(floored, unit);
}

export function nextDate(expr, unit) {
  validateUnit(unit);
  if (expr === undefined) {
    return undefined;
  }
  const [_unit, ts] = parseDateExpr(expr);
  return nextTimestamp(ts + 1, unit || _unit);
}

function nextTimestamp(ts, unit) {
  switch (unit) {
    case 'millisecond':
      return ts;
    case 'second':
      return ts + TS_PER_UNIT.s - ts % TS_PER_UNIT.s;
    case 'minute':
      return ts + TS_PER_UNIT.m - ts % TS_PER_UNIT.m;
    case 'hour':
      return ts + TS_PER_UNIT.h - ts % TS_PER_UNIT.h;
    case 'day':
      return ts + TS_PER_UNIT.d - ts % TS_PER_UNIT.d;
  }
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  switch (unit) {
    case 'week':
      return day > 21 ? Date.UTC(year, month, 1) : Date.UTC(year, month - 1, day - (day - 1) % 7 + 7);
    case 'month':
      return Date.UTC(year, month, 1);
    case 'quarter':
      return Date.UTC(year, month - month % 3 + 3);
    case 'year':
      return Date.UTC(year + 1);
    default:
      throw new Error(`Unrecognized unit: ${unit}`);
  }
}

export function prevDate(expr, unit) {
  validateUnit(unit);
  if (expr === undefined) {
    return undefined;
  }
  const [_unit, ts] = parseDateExpr(expr);
  return floorTimestamp(ts - 1, unit || _unit);
}



const UNIT_GRANULARITY = {
  'millisecond': 10,
  'second': 9,
  'minute': 8,
  'hour': 7,
  'day': 6,
  'week': 5,
  'month': 4,
  'quarter': 3,
  'year': 2,
};

function validateUnit(unit) {
  if (unit === undefined) {
    return;
  }
  if (typeof unit !== 'string' || !UNIT_GRANULARITY[unit]) {
    throw new Error(`Unrecognized unit: ${unit}`);
  }
}

function isGranular(unit0, unit1) {
  return UNIT_GRANULARITY[unit0] > UNIT_GRANULARITY[unit1];
}

function parseDateExpr(expr) {
  switch (typeof expr) {
    case 'number':
      if (expr < 100) {
        throw new Error(`Unrecognized date: ${expr}`);
      }
      return expr < 10000 ? ['year', Date.UTC(expr)] : ['millisecond', expr];
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
        return ['year', Date.UTC(year)];
      }
      if (len === 7 && (expr.charAt(5) === 'Q' || expr.charAt(5) === 'q')) {
        const quarter = parseInt(expr.charAt(6), 10);
        if (isNaN(quarter) || quarter < 1 || quarter > 4) {
          throw new Error(`Unrecognized date: ${expr}`);
        }
        return ['quarter', Date.UTC(year, (quarter - 1) * 3)];
      }
      const month = parseInt(expr.slice(5, 7), 10);
      if (isNaN(month) || month < 1 || month > 12) {
        throw new Error(`Unrecognized date: ${expr}`);
      }
      if (len === 7) {
        return ['month', Date.UTC(year, month - 1)];
      }
      if (expr.charAt(8) === 'W' || expr.charAt(8) === 'w') {
        const week = parseInt(expr.charAt(9), 10);
        if (isNaN(week) || week < 1 || week > 4) {
          throw new Error(`Unrecognized date: ${expr}`);
        }
        return ['week', Date.UTC(year, month - 1, week * 7 - 6)];
      }
      let date;
      try {
        // parse so we can validate the day part
        date = new Date(Date.parse(expr));
      } catch (_) {
        throw new Error(`Unrecognized date: ${expr}`);
      }
      return ['day', Date.UTC(year, month - 1, date.getUTCDate())];
    default:
      throw new Error(`Unrecognized date: ${expr}`);
  }
}
