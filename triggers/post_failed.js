'use strict';

const hooks = require('../lib/hooks');

const EVENT = 'post.failed';

module.exports = {
  key: 'post_failed',
  noun: 'Post',
  display: {
    label: 'Post Failed',
    description:
      'Triggers when a post fails to publish to one of your social accounts after all automatic retries.',
  },
  operation: {
    type: 'hook',
    inputFields: [
      {
        key: 'account_id',
        label: 'Account',
        dynamic: 'account.id.label',
        required: false,
        helpText:
          'Only trigger for this account. Leave blank to trigger for every account. Each failed account triggers once.',
      },
    ],
    performSubscribe: hooks.subscribe(EVENT, 'Post Failed'),
    performUnsubscribe: hooks.unsubscribe,
    perform: hooks.performHook(EVENT),
    performList: (z, bundle) =>
      hooks.recentDestinations(z, bundle, {
        postStatus: 'failed,partially_failed',
        destinationStatus: 'failed',
        event: EVENT,
      }),
    sample: {
      id: '5e4d3c2b-1a09-4f8e-b7d6-c5b4a3928170',
      event: EVENT,
      event_id: '5e4d3c2b-1a09-4f8e-b7d6-c5b4a3928170',
      event_created_at: '2026-07-10T14:31:12.000Z',
      post_id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
      destination_id: 'e3c5a7b9-2d4f-4b6c-9e8a-0f1b2c3d4e5f',
      platform: 'x',
      account_id: 2291,
      account_name: 'acmehq',
      published_at: null,
      platform_post_id: null,
      platform_post_url: null,
      error: 'The account needs to be reconnected.',
      content: 'Big news dropping tomorrow',
      scheduled_for: '2026-07-10T14:30:00.000Z',
      media_ids: [],
      attempts: 3,
    },
    outputFields: [
      ...hooks.destinationOutputFields,
      { key: 'error', label: 'Error Message' },
      { key: 'attempts', label: 'Attempts', type: 'integer' },
    ],
  },
};
