'use strict';

const { url, unwrap } = require('../lib/api');

const perform = async (z, bundle) => {
  const postId = String(bundle.inputData.post_id || '').trim();
  if (!postId) return [];
  const response = await z.request({
    url: url(`/posts/${encodeURIComponent(postId)}`),
    skipThrowForStatus: true,
  });
  // 404 means "no match", which a search reports as an empty list, not an error.
  if (response.status === 404) return [];
  if (response.status >= 400) response.throwForStatus();
  const post = unwrap(response);
  if (!post) return [];
  return [{ ...post, id: post.post_id || post.id, post_status: post.post_status || post.status }];
};

module.exports = {
  key: 'post',
  noun: 'Post',
  display: {
    label: 'Find Post',
    description: 'Finds a post by its ID and returns its status on each account.',
  },
  operation: {
    inputFields: [
      {
        key: 'post_id',
        label: 'Post',
        dynamic: 'post_choice.id.label',
        required: true,
        helpText: 'Pick a recent post, or map a Post ID from a PostEverywhere trigger or a Create Post step.',
      },
    ],
    perform,
    sample: {
      id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
      post_id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
      post_status: 'published',
      content: 'Big news dropping tomorrow',
      account_ids: [2280],
      scheduled_for: '2026-07-10T14:30:00.000Z',
      timezone: 'America/New_York',
      media_ids: [],
      destinations: [
        {
          destination_id: 'd2b4f6a8-1c3e-4a5b-8d7f-9e0a1b2c3d4e',
          account_id: 2280,
          account_name: 'acme.co',
          platform: 'instagram',
          destination_status: 'done',
          published_at: '2026-07-10T14:30:04.000Z',
          platform_post_id: '17912345678901234',
          error: null,
          attempts: 1,
        },
      ],
      destinations_count: 1,
      created_at: '2026-07-08T09:00:00.000Z',
      updated_at: '2026-07-10T14:30:04.000Z',
    },
    outputFields: [
      { key: 'id', label: 'Post ID' },
      { key: 'post_status', label: 'Status' },
      { key: 'content', label: 'Content' },
      { key: 'scheduled_for', label: 'Scheduled For', type: 'datetime' },
      { key: 'destinations_count', label: 'Number of Accounts', type: 'integer' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
      { key: 'updated_at', label: 'Updated At', type: 'datetime' },
    ],
  },
};
