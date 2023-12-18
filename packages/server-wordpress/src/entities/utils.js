export async function getFirstPostDate(client, options) {
  return getPostDate(client, 'asc', options);
}

export async function getLastPostDate(client, options) {
  return getPostDate(client, 'desc', options);
}

async function getPostDate(client, order, options = {}) {
  return (await client.posts.getAll({ ...options, limit: 1, order, fields: ['date_gmt'] }))[0].date_gmt;
}

export function getYear(dateStr) {
  return new Date(dateStr).getFullYear();
}
