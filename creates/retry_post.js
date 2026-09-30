'use strict';

const { url, unwrap } = require('../lib/api');

const perform = async (z, bundle) => {
  const postId = String(bundle.inputData.post_id || '').trim();
  if (!postId) throw new z.errors.Error('Choose a post to retry.', 'validation_error', 400);

  const response = await z.request({
    url: url(`/posts/${encodeURIComponent(postId)}/retry`),
    method: 'POST',
    skipThrowForStatus: true,
  });

  if (response.status === 400) {
    const body = response.data || {};
    const code = body.error && body.error.code;
    if (code === 'no_failed_destinations') {
      throw new z.errors.Error(
        'This post has no failed accounts to retry.',
        'no_failed_destinations',
        400
      );
    }
  }
  if (response.status >= 400) response.throwForStatus();

  const result = unwrap(response) || {};
  return { id: postId, post_id: postId, ...result };
};

module.exports = {
  key: 'retry_post',
  noun: 'Post',
  display: {
    label: 'Retry Failed Post',
    description: 'Queues every failed account of a post to publish again.',
  },
  operation: {
    inputFields: [
      {
        key: 'post_id',
        label: 'Post',
        dynamic: 'failed_post_choice.id.label',
        required: true,
        helpText: 'The failed post to retry. You can also map a Post ID from an earlier step.',
      },
    ],
    perform,
    sample: {
      id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
      post_id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
      retried_count: 1,
      destinations: [
        { id: 'e3c5a7b9-2d4f-4b6c-9e8a-0f1b2c3d4e5f', platform: 'x', new_status: 'queued' },
      ],
      message: '1 destination queued for retry.',
    },
    outputFields: [
      { key: 'id', label: 'Post ID' },
      { key: 'retried_count', label: 'Accounts Retried', type: 'integer' },
      { key: 'message', label: 'Message' },
    ],
  },
};
