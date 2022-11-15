import { FORMAT } from './constants.js';
import StandardLogStream from './standard.js';
import LegacyProgressLogStream from './progress.legacy.js';
import UploadProgressLogStream from './upload-progress.js';

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
          return new UploadProgressLogStream({ out, err });
        case 'delete':
          throw new Error(`Unimplemented.`);
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
