import { FORMAT } from './constants.js';
import StandardLogStream from './standard.js';

export * from './constants.js';

export function createLogStream({
  level,
  format,
  out,
  err,
}) {
  switch (format || FORMAT.JSON) {
    //case FORMAT.PROGRESS:
      // TODO
    case FORMAT.TEXT:
    case FORMAT.JSON:
      return new StandardLogStream({
        level,
        format,
        out,
        err,
      });
    default:
      throw new Error(`Unrecognized log format: ${format}`);
  }
}
