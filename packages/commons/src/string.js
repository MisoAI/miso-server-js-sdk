// From:
// https://github.com/jonschlinkert/pad-right

const DEFAULT_PAD = ' ';
const DEFAULT_PAD_5 = DEFAULT_PAD.repeat(5);
const DEFAULT_PAD_25 = DEFAULT_PAD.repeat(25);

function pad(left, val, num, str) {
  let padding = '';
  const diff = num - val.length;

  if (diff <= 0) {
    return val;
  }

  // Breakpoints based on benchmarks to use the fastest approach
  // for the given number of zeros
  if (diff <= 5 && !str) {
    padding = DEFAULT_PAD_5;
  } else if (diff <= 25 && !str) {
    padding = DEFAULT_PAD_25;
  } else {
    return val + (str || DEFAULT_PAD).repeat(diff);
  }

  return left ? (padding.slice(0, diff) + val) : (val + padding.slice(0, diff));
}

export function padLeft(val, num, str) {
  return pad(true, val, num, str);
}

export function padRight(val, num, str) {
  return pad(false, val, num, str);
}
