// From:
// https://github.com/jonschlinkert/pad-right

const DEFAULT_PAD = ' ';
const DEFAULT_PAD_5 = DEFAULT_PAD.repeat(5);
const DEFAULT_PAD_25 = DEFAULT_PAD.repeat(25);

function pad(left, val, num, str) {
  const diff = num - val.length;
  if (diff <= 0) {
    return val;
  }
  const padding = buildPadding(diff, str);
  return left ? padding + val : val + padding;
}

function buildPadding(count, str) {
  // Breakpoints based on benchmarks to use the fastest approach
  // for the given number of zeros
  return str ? str.repeat(count) :
    count <= 5 ? DEFAULT_PAD_5.slice(0, count) :
    count <= 25 ? DEFAULT_PAD_25.slice(0, count) :
    DEFAULT_PAD.repeat(count);
}

export function padLeft(val, num, str) {
  return pad(true, val, num, str);
}

export function padRight(val, num, str) {
  return pad(false, val, num, str);
}
