import { stream } from '@miso.ai/server-commons';
import { merge } from '../api/helpers.js';

export default class MergeStream extends stream.ParallelTransform {

  constructor(client, type, {
    mergeFn,
  } = {}) {
    super({
      transform: (record) => merge(client, type, record, { mergeFn }),
      controls: {
        throttle: 100,
      },
      objectMode: true,
    });
  }

  _error(error) {
    console.error(error);
  }

}
