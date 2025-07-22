import { asArray, trimObj, computeIfAbsent } from '@miso.ai/server-commons';
import { Buffer } from 'buffer';

export async function upload(client, type, records, options = {}) {
  const url = buildUrl(client, type, { ...options, async: true });
  const payload = buildUploadPayload(records);
  return client._axios.post(url, payload);
}

export async function merge(client, type, record, { mergeFn = defaultMerge } = {}) {
  let idProp;
  switch (type) {
    case 'products':
      idProp = 'product_id';
      break;
    case 'users':
      idProp = 'user_id';
      break;
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
  const id = record[idProp];
  if (!id) {
    throw new Error(`Record missing ${idProp}.`);
  }
  let base;
  try {
    base = shimRecordForMerging(await client.api[type].get(id));
  } catch (e) {}
  return await mergeFn(base, record);
}

export function defaultMerge(base, patch) {
  return trimObj({
    ...base,
    ...patch,
    custom_attributes: trimObj({
      ...(base && base.custom_attributes),
      ...(patch && patch.custom_attributes),
    }),
  });
}

export function getIdProperty(type) {
  switch (type) {
    case 'products':
      return 'product_id';
    case 'users':
      return 'user_id';
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

export function shimRecordForMerging(record) {
  for (const key in record) {
    if (key === 'product_group_id_or_product_id' || key.startsWith('category_path_')) {
      delete record[key];
    }
  }
  return record;
}

const RE_422_MSG_LINE = /^\s*data\.(\d+)(?:\.(\S+))?\s+is\s+invalid\.\s+(.*)$/;

export function process422ResponseBody(payload, { data } = {}) {
  const records = extractUploadPayload(payload);
  const unrecognized = [];
  const groupsMap = new Map();
  for (const line of data) {
    const m = line.match(RE_422_MSG_LINE);
    if (!m) {
      unrecognized.push(line);
      continue;
    }
    let [_, index, path, message] = m;
    index = Number(index);
    const { violations } = computeIfAbsent(groupsMap, index, index => ({
      index,
      violations: [],
      record: records[index],
    }));
    violations.push({
      path,
      message,
    });
  }
  const groups = [...groupsMap.keys()]
    .sort((a, b) => a - b)
    .map(groupsMap.get.bind(groupsMap));
  return trimObj({
    groups,
    unrecognized: unrecognized.length ? unrecognized : undefined,
  });
}

export async function batchDelete(client, type, ids, options = {}) {
  const url = buildUrl(client, `${type}/_delete`, { ...options, async: true });
  const payload = buildBatchDeletePayload(type, ids);
  const { data } = await client._axios.post(url, payload);
  return data;
}

export function buildUrl(client, path, { async, dryRun, params: extraParams } = {}) {
  let { server, key } = client._options;
  let params = `?api_key=${key}`;
  if (async) {
    params += '&async=1';
  }
  if (dryRun) {
    params += '&dry_run=1';
  }
  if (extraParams) {
    for (const key in extraParams) {
      params += `&${encodeURIComponent(key)}=${encodeURIComponent(extraParams[key])}`;
    }
  }
  return `${server}/v1/${path}${params}`;
}

export function buildUploadPayload(records) {
  return typeof records === 'string' ? records :
    Buffer.isBuffer(records) ? records.toString() :
    { data: Array.isArray(records) ? records : [records] };
}

export function extractUploadPayload(records) {
  if (Buffer.isBuffer(records)) {
    records = records.toString();
  }
  if (typeof records === 'string') {
    records = JSON.parse(records);
  }
  if (records.data) {
    records = records.data;
  }
  if (!Array.isArray(records)) {
    records = [records];
  }
  return records;
}

export function buildBatchDeletePayload(type, ids) {
  if (type !== 'products' && type !== 'users' && type !== 'interactions') {
    throw new Error(`Unsupported type: ${type}`);
  }
  if ((typeof ids === 'string' && ids[0] === '{') || typeof ids === 'object' && !Array.isArray(ids)) {
    return ids;
  }
  ids = asArray(ids);
  if (ids.length === 0) {
    return { data: {} };
  }
  // interactions are deleted by user_ids
  return {
    data: {
      [type === 'products' ? 'product_ids' : 'user_ids']: ids,
    },
  };
}
