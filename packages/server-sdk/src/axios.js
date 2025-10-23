import axios from 'axios';
import axiosRetry from 'axios-retry';
import version from './version.js';

const DEFAULT_RETRY_OPTIONS = {
  retries: 5,
  retryDelay: count => count * 500,
  retryCondition: (error) => {
    if (!error.response) {
      return false;
    }
    const { status } = error.response;
    // Only retry on 5xx or 429 server errors
    return (status >= 500 && status < 600) || status === 429;
  },
};

export function createAxios(options = {}, debug = false) {
  if (typeof options.get === 'function' && typeof options.post === 'function') {
    return options; // assume this is an axios instance already
  }
  const { retry } = options;
  const instance = axios.create({
    headers: {
      'User-Agent': `MisoNodeSDK/${version}`,
      'Content-Type': 'application/json',
    },
  });
  axiosRetry(instance, { ...DEFAULT_RETRY_OPTIONS, ...retry });
  if (debug) {
    instance.interceptors.request.use(config => {
      explainAsCurl(config);
      return config;
    });
  }
  return instance;
}

function explainAsCurl(config) {
  // format into a curl command
  const { method, url, data } = config;
  let command = `curl -X ${method.toUpperCase()} '${url}'`;
  if (data) {
    command += ` -d '${typeof data === 'string' ? data : JSON.stringify(data)}'`;
  }
  console.log(`[Explain] ${command}`);
}
