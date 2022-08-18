export function concatFns(...fns) {
  return v => fns.reduce((v, fn) => fn(v), v);
}
