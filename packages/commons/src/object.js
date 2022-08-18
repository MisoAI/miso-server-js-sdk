/**
 * Remove object properties with undefined values and return the object itself.
 */
export function trimObj(obj) {
  if (typeof obj !== 'object') {
    return obj;
  }
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] === undefined) {
      delete obj[k];
    }
  }
  return obj;
}

export function asArray(value) {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

export function asMap(objects, {key = 'id', target = {}} = {}) {
  return objects.reduce((acc, c) => {
    acc[c[key]] = c;
    return acc;
  }, target);
}
