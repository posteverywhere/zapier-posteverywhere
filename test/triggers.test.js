'use strict';

const crypto = require('crypto');
const zapier = require('zapier-platform-core');
const App = require('../index');
const { api, ok, fail, authData, PREFIX } = require('./helpers');

const appTester = zapier.createAppTester(App);

const POST_ID = '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b';
const DEST_IG = 'd2b4f6a8-1c3e-4a5b-8d7f-9e0a1b2c3d4e';
const DEST_X = 'e3c5a7b9-2d4f-4b6c-9e8a-0f1b2c3d4e5f';
const SECRET = 'whsec_test_secret';

const post = {
  post_id: POST_ID,
  post_status: 'partially_failed',
  content: 'Big news dropping tomorrow',
  account_ids: [2280, 2291],
  scheduled_for: '2026-07-10T14:30:00.000Z',
  timezone: 'UTC',
  media_ids: [],
  destinations: [
    {
      destination_id: DEST_IG,
      account_id: 2280,
      account_name: 'acme.co',
      platform: 'instagram',
      destination_status: 'done',
      published_at: '2026-07-10T14:30:04.000Z',
      platform_post_id: '179',
      platform_post_url: 'https://www.instagram.com/p/abc/',
      attempts: 1,
    },
    {
      destination_id: DEST_X,
      account_id: 2291,
      platform: 'x',
      destination_status: 'failed',
      error: { message: 'Token expired' },
      attempts: 3,
    },
  ],
  destinations_count: 2,
  created_at: '2026-07-08T09:00:00.000Z',
  updated_at: '2026-07-10T14:31:00.000Z',
};

const envelope = (event, data) => ({
  event,
  event_id: 'evt-1',
  created_at: '2026-07-10T14:30:05.000Z',
  organization_id: 'org-1',
  data,
});

const hookBundle = (body, { signature, secret = SECRET, inputData = {} } = {}) => {
  const content = JSON.stringify(body);
  const sig =
    signature === undefined
      ? `sha256=${crypto.createHmac('sha256', secret).update(content).digest('hex')}`
      : signature;
  return {
    authData,
    inputData,
    subscribeData: { id: 'wh-1', secret },
    cleanedRequest: body,
    rawRequest: {
      method: 'POST',
      headers: sig ? { 'Http-X-Posteverywhere-Signature': sig } : {},
      content,
    },
  };
};

describe('New Published Post (REST hook)', () => {
  const trigger = App.triggers.post_published.operation;

  it('subscribes a webhook for post.published at the Zap target URL', async () => {
    api()
      .post(`${PREFIX}/webhooks`, (body) => {
        expect(body.url).toBe('https://hooks.zapier.com/hooks/standard/1/abc/');
        expect(body.events).toEqual(['post.published']);
        expect(body.name).toBe('Zapier: New Published Post');
        return true;
      })
      .reply(201, ok({ id: 'wh-1', secret: SECRET, events: ['post.published'], is_active: true }));
    const result = await appTester(trigger.performSubscribe, {
      authData,
      targetUrl: 'https://hooks.zapier.com/hooks/standard/1/abc/',
    });
    expect(result).toMatchObject({ id: 'wh-1', secret: SECRET });
  });

  it('unsubscribes by deleting the stored webhook id', async () => {
    api().delete(`${PREFIX}/webhooks/wh-1`).reply(200, ok({ id: 'wh-1', deleted: true }));
    const result = await appTester(trigger.performUnsubscribe, {
      authData,
      subscribeData: { id: 'wh-1' },
    });
    expect(result).toEqual({ id: 'wh-1', deleted: true });
  });

  it('treats an already-deleted webhook as unsubscribed', async () => {
    api().delete(`${PREFIX}/webhooks/wh-1`).reply(404, fail('not_found', 'Webhook not found'));
    const result = await appTester(trigger.performUnsubscribe, {
      authData,
      subscribeData: { id: 'wh-1' },
    });
    expect(result.deleted).toBe(true);
  });

  it('turns a signed event into one item with post content and live URL', async () => {
    api().get(`${PREFIX}/posts/${POST_ID}`).reply(200, ok(post));
    const body = envelope('post.published', {
      post_id: POST_ID,
      destination_id: DEST_IG,
      platform: 'instagram',
      account_id: 2280,
      account_name: 'acme.co',
      published_at: '2026-07-10T14:30:04.000Z',
      platform_post_id: '179',
    });
    const results = await appTester(trigger.perform, hookBundle(body));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'evt-1',
      post_id: POST_ID,
      platform: 'instagram',
      content: 'Big news dropping tomorrow',
      platform_post_url: 'https://www.instagram.com/p/abc/',
    });
  });

  it('still returns the event when the post lookup fails', async () => {
    api().get(`${PREFIX}/posts/${POST_ID}`).reply(500, fail('internal_error', 'boom'));
    const body = envelope('post.published', { post_id: POST_ID, destination_id: DEST_IG });
    const results = await appTester(trigger.perform, hookBundle(body));
    expect(results[0].post_id).toBe(POST_ID);
  });

  it('drops an event with a bad signature', async () => {
    const body = envelope('post.published', { post_id: POST_ID });
    const results = await appTester(trigger.perform, hookBundle(body, { signature: 'sha256=bad' }));
    expect(results).toEqual([]);
  });

  it('ignores other event types', async () => {
    const body = envelope('post.failed', { post_id: POST_ID });
    const results = await appTester(trigger.perform, hookBundle(body));
    expect(results).toEqual([]);
  });

  it('filters by the chosen account', async () => {
    const body = envelope('post.published', { post_id: POST_ID, account_id: 2280 });
    const results = await appTester(
      trigger.perform,
      hookBundle(body, { inputData: { account_id: '9999' } })
    );
    expect(results).toEqual([]);
  });

  it('lists recent published destinations as samples', async () => {
    api()
      .get(`${PREFIX}/posts`)
      .query((q) => q.status === 'published,partially_failed' && q.sort === 'updated_at')
      .reply(200, ok({ posts: [post], pagination: { limit: 25, offset: 0 } }));
    const results = await appTester(trigger.performList, { authData, inputData: {} });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: DEST_IG, platform: 'instagram', event: 'post.published' });
  });
});

describe('Post Failed (REST hook)', () => {
  const trigger = App.triggers.post_failed.operation;

  it('subscribes for post.failed', async () => {
    api()
      .post(`${PREFIX}/webhooks`, (body) => body.events[0] === 'post.failed')
      .reply(201, ok({ id: 'wh-2', secret: SECRET }));
    const result = await appTester(trigger.performSubscribe, {
      authData,
      targetUrl: 'https://hooks.zapier.com/x',
    });
    expect(result.id).toBe('wh-2');
  });

  it('flattens a structured error to its message', async () => {
    api().get(`${PREFIX}/posts/${POST_ID}`).reply(200, ok(post));
    const body = envelope('post.failed', {
      post_id: POST_ID,
      destination_id: DEST_X,
      platform: 'x',
      account_id: 2291,
      error: { message: 'Token expired', code: 'auth' },
    });
    const [item] = await appTester(trigger.perform, hookBundle(body));
    expect(item).toMatchObject({ error: 'Token expired', platform: 'x', attempts: 3 });
  });

  it('lists failed destinations only as samples', async () => {
    api()
      .get(`${PREFIX}/posts`)
      .query((q) => q.status === 'failed,partially_failed')
      .reply(200, ok({ posts: [post], pagination: { limit: 25, offset: 0 } }));
    const results = await appTester(trigger.performList, { authData, inputData: {} });
    expect(results.map((r) => r.id)).toEqual([DEST_X]);
    expect(results[0].error).toBe('Token expired');
  });
});

describe('New Connected Account (polling)', () => {
  it('returns accounts newest first with a dropdown label', async () => {
    api()
      .get(`${PREFIX}/accounts`)
      .reply(
        200,
        ok({
          accounts: [
            { id: 1, platform: 'x', account_name: 'old', is_active: true, created_at: '2026-01-01T00:00:00Z', health: { status: 'healthy', can_post: true } },
            { id: 2, platform: 'instagram', account_name: 'new', is_active: true, created_at: '2026-06-01T00:00:00Z', health: { status: 'expired', can_post: false } },
          ],
        })
      );
    const results = await appTester(App.triggers.account.operation.perform, { authData, inputData: {} });
    expect(results.map((a) => a.id)).toEqual([2, 1]);
    expect(results[0]).toMatchObject({ label: 'new (instagram)', can_post: false, health_status: 'expired' });
  });
});

describe('Failed Post Choices (hidden dropdown)', () => {
  it('pages through failed posts with short labels', async () => {
    api()
      .get(`${PREFIX}/posts`)
      .query((q) => q.status === 'failed,partially_failed' && q.offset === '50')
      .reply(200, ok({ posts: [{ ...post, content: 'x'.repeat(100) }], pagination: {} }));
    const results = await appTester(App.triggers.failed_post_choice.operation.perform, {
      authData,
      inputData: {},
      meta: { page: 1 },
    });
    expect(results[0].id).toBe(POST_ID);
    expect(results[0].label).toMatch(/^x{57}\.\.\. \[partially_failed\]$/);
  });

  it('lists all recent posts for the Find Post dropdown', async () => {
    api()
      .get(`${PREFIX}/posts`)
      .query((q) => q.status === undefined && q.offset === '0')
      .reply(200, ok({ posts: [{ ...post, content: '' }], pagination: {} }));
    const results = await appTester(App.triggers.post_choice.operation.perform, {
      authData,
      inputData: {},
      meta: {},
    });
    expect(results[0].label).toBe('(no text) [partially_failed]');
  });
});
