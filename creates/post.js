'use strict';

const { url, unwrap, toList } = require('../lib/api');
const { importFromUrl } = require('../lib/media');

const toUtcIso = (z, value) => {
  const ms = Date.parse(String(value));
  if (Number.isNaN(ms)) {
    throw new z.errors.Error(
      `Scheduled Time "${value}" is not a date and time PostEverywhere can read.`,
      'invalid_datetime',
      400
    );
  }
  return new Date(ms).toISOString();
};

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const draft = input.draft === true || input.draft === 'true' || input.draft === 'yes';
  const content = input.content ? String(input.content) : '';
  const accountIds = toList(input.account_ids).map((v) => {
    const n = Number(v);
    if (!Number.isInteger(n)) {
      throw new z.errors.Error(`Account "${v}" is not a valid account ID.`, 'invalid_accounts', 400);
    }
    return n;
  });

  if (!draft && accountIds.length === 0) {
    throw new z.errors.Error('Choose at least one account.', 'account_ids_required', 400);
  }

  const mediaIds = toList(input.media_ids);
  const mediaUrls = toList(input.media_urls);
  for (const mediaUrl of mediaUrls) {
    const media = await importFromUrl(z, mediaUrl);
    if (media.media_status !== 'ready') {
      throw new z.errors.Error(
        `The video at ${mediaUrl} is still processing. Use the "Upload Media from URL" action first, add a short Delay, then pass its Media ID to this action.`,
        'media_not_ready',
        409
      );
    }
    mediaIds.push(media.media_id);
  }

  if (!content && mediaIds.length === 0) {
    throw new z.errors.Error('Add post content or at least one media file.', 'validation_error', 400);
  }

  const body = {};
  if (content) body.content = content;
  if (accountIds.length) body.account_ids = accountIds;
  if (mediaIds.length) body.media_ids = mediaIds;
  if (input.scheduled_for) body.scheduled_for = toUtcIso(z, input.scheduled_for);
  const timezone = input.timezone || (bundle.meta && bundle.meta.timezone);
  if (timezone) body.timezone = String(timezone);
  if (draft) body.draft = true;

  const response = await z.request({ url: url('/posts'), method: 'POST', body });
  const post = unwrap(response) || {};
  return { ...post, id: post.post_id || post.id, post_status: post.post_status || post.status };
};

module.exports = {
  key: 'post',
  noun: 'Post',
  display: {
    label: 'Create Post',
    description: 'Publishes, schedules or drafts a post to one or more social accounts.',
  },
  operation: {
    inputFields: [
      {
        key: 'account_ids',
        label: 'Accounts',
        dynamic: 'account.id.label',
        list: true,
        required: true,
        helpText: 'The social accounts to post to (up to 50).',
      },
      {
        key: 'content',
        label: 'Content',
        type: 'text',
        required: false,
        helpText:
          'The post text, up to 10,000 characters. Each network still applies its own limit (for example 280 for X without Premium). Can be blank when you attach media.',
      },
      {
        key: 'media_urls',
        label: 'Media URLs',
        list: true,
        required: false,
        helpText:
          'Public links to images (JPEG, PNG, GIF, WebP, HEIC, up to 25 MB) or MP4 videos. PostEverywhere imports each file before it creates the post.',
      },
      {
        key: 'media_ids',
        label: 'Media IDs',
        list: true,
        required: false,
        helpText: 'Media IDs from an earlier "Upload Media from URL" step. Use this for large videos.',
      },
      {
        key: 'scheduled_for',
        label: 'Scheduled Time',
        type: 'datetime',
        required: false,
        helpText: 'When to publish. Must be in the future. Leave blank to publish now.',
      },
      {
        key: 'timezone',
        label: 'Timezone',
        required: false,
        helpText:
          'IANA timezone name to show the post in, such as `America/New_York`. It does not change when the post publishes. Defaults to your Zap timezone.',
      },
      {
        key: 'draft',
        label: 'Save as Draft',
        type: 'boolean',
        required: false,
        default: 'no',
        helpText: 'Yes saves a draft in PostEverywhere for review. Nothing is published.',
      },
    ],
    perform,
    sample: {
      id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
      post_id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
      post_status: 'scheduled',
      publish_mode: 'scheduled',
      content: 'Big news dropping tomorrow',
      account_ids: [2280, 2291],
      scheduled_for: '2026-07-10T14:30:00.000Z',
      timezone: 'America/New_York',
      media_ids: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
      destinations: [
        {
          destination_id: 'd2b4f6a8-1c3e-4a5b-8d7f-9e0a1b2c3d4e',
          account_id: 2280,
          account_name: 'acme.co',
          platform: 'instagram',
          destination_status: 'queued',
          scheduled_for: '2026-07-10T14:30:00.000Z',
        },
      ],
      destinations_count: 2,
      created_at: '2026-07-08T09:00:00.000Z',
    },
    outputFields: [
      { key: 'id', label: 'Post ID' },
      { key: 'post_status', label: 'Status' },
      { key: 'publish_mode', label: 'Publish Mode' },
      { key: 'scheduled_for', label: 'Scheduled For', type: 'datetime' },
      { key: 'destinations_count', label: 'Number of Accounts', type: 'integer' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
    ],
  },
};
