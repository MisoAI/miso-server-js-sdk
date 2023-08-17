import axios from 'axios';
import axiosRetry from 'axios-retry';

// TODO: create an instance

axiosRetry(axios, { retries: 5, retryDelay: count => count * 300 });

export default axios;
