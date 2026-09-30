'use strict';

const hooks = require('../lib/hooks');

const EVENT = 'post.published';

module.exports = {
  key: 'post_published',
  noun: 'Post',
  display: {
    label: 'New Published Post',
    description: 'Triggers when a post goes live on one of your social accounts.',
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
          'Only trigger for this account. Leave blank to trigger for every account. A post sent to 3 accounts triggers 3 times, once per account.',
      },
    ],
    performSubscribe: hooks.subscribe(EVENT, 'New Published Post'),
    performUnsubscribe: hooks.unsubscribe,
    perform: hooks.performHook(EVENT),
    performList: (z, bundle) =>
      hooks.recentDestinations(z, bundle, {
        postStatus: 'published,partially_failed',
        destinationStatus: 'done',
        event: EVENT,
      }),
    sample: {
      id: '0f9a2c1e-8b7d-4e6f-a5c4-3b2a1d0e9f8a',
      event: EVENT,
      event_id: '0f9a2c1e-8b7d-4e6f-a5c4-3b2a1d0e9f8a',
      event_created_at: '2026-07-10T14:30:05.000Z',
      post_id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
      destination_id: 'd2b4f6a8-1c3e-4a5b-8d7f-9e0a1b2c3d4e',
      platform: 'instagram',
      account_id: 2280,
      account_name: 'acme.co',
      published_at: '2026-07-10T14:30:04.000Z',
      platform_post_id: '17912345678901234',
      platform_post_url: 'https://www.instagram.com/p/C8abcdEFGhi/',
      error: null,
      content: 'Big news dropping tomorrow',
      scheduled_for: '2026-07-10T14:30:00.000Z',
      media_ids: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
      attempts: 1,
    },
    outputFields: [
      ...hooks.destinationOutputFields,
      { key: 'published_at', label: 'Published At', type: 'datetime' },
      { key: 'platform_post_id', label: 'Platform Post ID' },
      { key: 'platform_post_url', label: 'Live Post URL' },
    ],
  },
};
