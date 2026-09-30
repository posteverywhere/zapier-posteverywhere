'use strict';

const crypto = require('crypto');
const { url, unwrap } = require('./api');

// Registers a PostEverywhere webhook that sends the given event to this Zap.
const subscribe = (event, name) => async (z, bundle) => {
  const response = await z.request({
    url: url('/webhooks'),
    method: 'POST',
    body: {
      url: bundle.targetUrl,
      events: [event],
      name: `Zapier: ${name}`.slice(0, 100),
      description: 'Created by the PostEverywhere Zapier integration. Turning off the Zap removes it.',
    },
  });
  // Stored by Zapier as bundle.subscribeData (includes the one-time signing secret).
  return unwrap(response);
};

const unsubscribe = async (z, bundle) => {
  const id = bundle.subscribeData && bundle.subscribeData.id;
  if (!id) return {};
  const response = await z.request({
    url: url(`/webhooks/${encodeURIComponent(id)}`),
    method: 'DELETE',
    skipThrowForStatus: true,
  });
  // 404 means the webhook is already gone, which is the result we want.
  if (response.status >= 400 && response.status !== 404) response.throwForStatus();
  return response.status === 404 ? { id, deleted: true } : unwrap(response);
};

const findHeader = (headers, name) => {
  if (!headers) return undefined;
  const want = name.toLowerCase();
  const key = Object.keys(headers).find((k) => {
    const low = k.toLowerCase();
    return low === want || low === `http-${want}`;
  });
  return key ? headers[key] : undefined;
};

// Checks X-PostEverywhere-Signature (sha256=<hex HMAC of the raw body>).
// Returns false only when a signature is present and does not match.
const signatureOk = (bundle) => {
  const secret = bundle.subscribeData && bundle.subscribeData.secret;
  const raw = bundle.rawRequest;
  if (!secret || !raw || typeof raw.content !== 'string') return true;
  const header = findHeader(raw.headers, 'x-posteverywhere-signature');
  if (!header) return true;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw.content).digest('hex')}`;
  const a = Buffer.from(String(header));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const readEnvelope = (bundle) => {
  const req = bundle.cleanedRequest || {};
  if (req.event || req.data) return req;
  if (req.content && typeof req.content === 'object') return req.content;
  return req;
};

// Adds the post text and the destination's public link, which the event itself does not carry.
const enrich = async (z, item) => {
  if (!item.post_id) return item;
  try {
    const response = await z.request({
      url: url(`/posts/${encodeURIComponent(item.post_id)}`),
      skipThrowForStatus: true,
    });
    if (response.status >= 400) return item;
    const post = unwrap(response) || {};
    const dest = (post.destinations || []).find(
      (d) => (d.destination_id || d.id) === item.destination_id
    );
    return {
      ...item,
      content: post.content === undefined ? null : post.content,
      scheduled_for: item.scheduled_for || post.scheduled_for || null,
      media_ids: post.media_ids || [],
      platform_post_url: (dest && dest.platform_post_url) || item.platform_post_url || null,
      attempts: dest && dest.attempts !== undefined ? dest.attempts : item.attempts,
    };
  } catch (e) {
    return item;
  }
};

// Builds the perform function for a REST hook trigger on one destination event.
const performHook = (event) => async (z, bundle) => {
  if (!signatureOk(bundle)) {
    z.console.log('Dropped a webhook call with a bad X-PostEverywhere-Signature.');
    return [];
  }
  const envelope = readEnvelope(bundle);
  if (envelope.event && envelope.event !== event) return [];
  const data = envelope.data || {};

  const wantAccount = bundle.inputData && bundle.inputData.account_id;
  if (wantAccount && String(data.account_id) !== String(wantAccount)) return [];

  const item = {
    id: envelope.event_id || data.destination_id || data.post_id,
    event: envelope.event || event,
    event_id: envelope.event_id || null,
    event_created_at: envelope.created_at || null,
    post_id: data.post_id || null,
    destination_id: data.destination_id || null,
    platform: data.platform || null,
    account_id: data.account_id === undefined ? null : data.account_id,
    account_name: data.account_name || null,
    published_at: data.published_at || null,
    platform_post_id: data.platform_post_id || null,
    platform_post_url: data.platform_post_url || null,
    error: formatError(data.error),
  };
  return [await enrich(z, item)];
};

const formatError = (error) => {
  if (error === undefined || error === null || error === '') return null;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error.message) return String(error.message);
  return JSON.stringify(error);
};

// Recent posts flattened to one item per destination, in the same shape as a live event.
// Used for the "Test trigger" sample in the Zap editor.
const recentDestinations = async (z, bundle, { postStatus, destinationStatus, event }) => {
  const params = {
    status: postStatus,
    sort: 'updated_at',
    order: 'desc',
    limit: 25,
  };
  if (bundle.inputData && bundle.inputData.account_id) params.account_id = bundle.inputData.account_id;
  const response = await z.request({ url: url('/posts'), params });
  const posts = (unwrap(response) || {}).posts || [];

  const items = [];
  for (const post of posts) {
    for (const d of post.destinations || []) {
      if ((d.destination_status || d.status) !== destinationStatus) continue;
      if (params.account_id && String(d.account_id) !== String(params.account_id)) continue;
      items.push({
        id: d.destination_id || d.id,
        event,
        event_id: null,
        event_created_at: null,
        post_id: post.post_id || post.id,
        destination_id: d.destination_id || d.id,
        platform: d.platform || null,
        account_id: d.account_id === undefined ? null : d.account_id,
        account_name: d.account_name || null,
        published_at: d.published_at || null,
        platform_post_id: d.platform_post_id || null,
        platform_post_url: d.platform_post_url || null,
        error: formatError(d.error),
        content: post.content === undefined ? null : post.content,
        scheduled_for: d.scheduled_for || post.scheduled_for || null,
        media_ids: post.media_ids || [],
        attempts: d.attempts,
      });
    }
  }
  const stamp = (i) => Date.parse(i.published_at || i.scheduled_for || '') || 0;
  return items.sort((a, b) => stamp(b) - stamp(a));
};

const destinationOutputFields = [
  { key: 'id', label: 'Event ID' },
  { key: 'post_id', label: 'Post ID' },
  { key: 'destination_id', label: 'Destination ID' },
  { key: 'platform', label: 'Platform' },
  { key: 'account_id', label: 'Account ID', type: 'integer' },
  { key: 'account_name', label: 'Account Name' },
  { key: 'content', label: 'Post Content' },
  { key: 'scheduled_for', label: 'Scheduled For', type: 'datetime' },
];

module.exports = {
  subscribe,
  unsubscribe,
  performHook,
  recentDestinations,
  signatureOk,
  destinationOutputFields,
};
