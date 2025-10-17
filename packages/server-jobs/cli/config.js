import { loadConfig as _loadConfig } from '@miso.ai/server-commons';

const DEFAULT_CONFIG_FILE = 'jobs.yml';

export async function loadConfig(file = DEFAULT_CONFIG_FILE) {
  return _loadConfig(file);
}
