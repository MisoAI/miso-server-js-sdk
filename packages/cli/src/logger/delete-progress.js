import { log } from '@miso.ai/server-commons';
import ApiProgressLogStream from './api-progress.js';

const { formatTable } = log;

export default class DeleteProgressLogStream extends ApiProgressLogStream {

  _dataStatsTable({ pending, successful, failed, stats }) {
    const { deletion } = stats;
    const pendingSums = this._sumMetrics(pending);

    return formatTable([
      ['', 'Requests', 'Records'],
      ['Pending', pendingSums.requests, pendingSums.records],
      ['Successful', successful.requests, successful.records],
      ['- Deleted', '', deletion.deleted],
      ['- Not Found', '', deletion.notFound],
      ['Failed', failed.requests, failed.records],
    ]);
  }

}
