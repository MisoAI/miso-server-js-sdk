import { trimObj, asArray } from '@miso.ai/server-commons';

export default function transform({
  _linked: {
    author,
    featured_media,
    categories,
    tags,
    ..._linked
  } = {},
  id,
  //type,
  date_gmt,
  modified_gmt,
  guid: {
    rendered: guid,
  },
  slug,
  title: {
    rendered: title,
  },
  content: {
    rendered: html,
  },
  link: url,
  status,
  sticky,
  comment_status,
  ping_status,
  format,
  template,
  ...rest
}) {
  const product_id = `${id}`;
  if (!product_id) {
    throw new Error(`ID is absent.`);
  }
  const created_at = date_gmt && `${date_gmt}Z`;
  const updated_at = modified_gmt && `${modified_gmt}Z`;

  const authors = asArray(author);
  const cover_image = featured_media && encodeURI(featured_media);

  return trimObj({
    product_id,
    type: 'article',
    created_at,
    updated_at,
    title,
    cover_image,
    html,
    url,
    authors,
    categories,
    tags,
    custom_attributes: trimObj({
      guid,
      slug,
      status,
      sticky,
      comment_status,
      ping_status,
      format,
      template,
      ...rest,
      _linked,
    }),
  });
}
