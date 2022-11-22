import { FORMAT } from './constants.js';
import StandardLogStream from './standard.js';
import LegacyProgressLogStream from './progress.legacy.js';
import ApiProgressLogStream from './api-progress.js';
import DeleteProgressLogStream from './delete-progress.js';

export * from './constants.js';

export function createLogStream({
  api,
  legacy,
  level,
  format,
  out,
  err,
}) {
  switch (format || FORMAT.JSON) {
    case FORMAT.PROGRESS:
      switch (api) {
        case 'upload':
          if (legacy) {
            return new LegacyProgressLogStream({ out, err });
          }
          return new ApiProgressLogStream({ out, err });
        case 'delete':
          return new DeleteProgressLogStream({ out, err });
        default:
          throw new Error(`Unsupported API: ${api}`);
      }
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
