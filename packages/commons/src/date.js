const DURATION_EXPR = /^(\d+)([s|m|h|d])$/;
const TS_PER_UNIT = {
  ms: 1,
  s: 1000,
};
TS_PER_UNIT.m = TS_PER_UNIT.s * 60;
TS_PER_UNIT.h = TS_PER_UNIT.m * 60;
TS_PER_UNIT.d = TS_PER_UNIT.h * 24;
//TS_PER_UNIT.M = TS_PER_UNIT.d * 31;
//TS_PER_UNIT.y = TS_PER_UNIT.d * 366;

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

export function startOfDate(expr) {
  if (expr === undefined) {
    return undefined;
  }
  if (typeof expr === 'number') {
    if (expr < 10000) {
      expr = startOfYearByYearNum(expr);
    }
    return expr;
  }
  const ts = Date.parse(expr);
  if (isNaN(ts)) {
    throw new Error(`Unrecognized date: ${expr}`);
  }
  return ts;
}

const RE_YEAR = /^\d{4}$/g;
const RE_MONTH = /^\d{4}-\d{2}$/g;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/g;

// TODO: support end of hour, minute

export function endOfDate(expr) {
  if (expr === undefined) {
    return undefined;
  }
  if (typeof expr === 'number') {
    if (expr < 10000) {
      expr = endOfYearByYearNum(expr);
    }
    return expr;
  }
  let ts = Date.parse(expr);
  if (isNaN(ts)) {
    throw new Error(`Unrecognized date: ${expr}`);
  }
  return expr.match(RE_YEAR) ? endOfYear(ts) :
    expr.match(RE_MONTH) ? endOfMonth(ts) :
    expr.match(RE_DATE) ? endOfDay(ts) : ts;
}

function endOfYear(ts) {
  return endOfYearByYearNum(new Date(ts).getFullYear());
}

function startOfYearByYearNum(fullYear) {
  return new Date(fullYear, 0, 1).getTime();
}

function endOfYearByYearNum(fullYear) {
  return new Date(fullYear + 1, 0, 1).getTime() - 1000;
}

function endOfMonth(ts) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = date.getMonth();
  return (month == 11 ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1)).getTime() - 1000;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function endOfDay(ts) {
  return (Math.floor(ts / MS_PER_DAY) + 1) * MS_PER_DAY - 1000;
}
