import { buffer } from '@miso.ai/server-commons';

const DEFAULT_OPTIONS = Object.freeze({
  prefix: '{"data":[',
  suffix: ']}',
  separator: ',',
  bytesLimit: 1024 * 1024,
});

export default function create(type, { objectMode, recordsPerRequest, bytesPerRequest } = {}) {
  const options = {
    ...DEFAULT_OPTIONS,
    objectMode,
  };
  // TODO: validate RPR, BPR values
  if (bytesPerRequest) {
    options.bytesLimit = bytesPerRequest;
  }

  switch (type) {
    case 'users':
    case 'products':
      options.recordsLimit = recordsPerRequest || 200;
      return new buffer.JsonBuffer(options);
    case 'interactions':
      options.recordsLimit = recordsPerRequest || 1000;
      return new buffer.JsonBuffer(options);
    case 'experiment-events':
      options.recordsLimit = 1;
      return new buffer.JsonBuffer(options);
    default:
      throw new Error(`Unrecognized type: ${type}`);
  }
}
