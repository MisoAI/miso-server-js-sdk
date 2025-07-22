import axios from 'axios';
import axiosRetry from 'axios-retry';
import version from './version.js';

const DEFAULT_RETRY_OPTIONS = {
  retries: 3,
  retryDelay: count => count * 300,
  retryCondition: (error) => {
    // Only retry on 5xx server errors
    return error.response && error.response.status >= 500 && error.response.status < 600;
  },
};

export function createAxios(options = {}) {
  if (typeof options.get === 'function' && typeof options.post === 'function') {
    return options; // assume this is an axios instance already
  }
  const { retry } = options;
  const instance = axios.create({
    headers: {
      'User-Agent': `MisoNodeJSSDK/${version}`,
      'Content-Type': 'application/json',
    },
  });
  axiosRetry(instance, { ...DEFAULT_RETRY_OPTIONS, ...retry });
  return instance;
}
