'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');
const media = require('../lib/media');
const { api, ok, fail, authData, PREFIX } = require('./helpers');

const appTester = zapier.createAppTester(App);
media.settings.pollMs = 5;
media.settings.waitMs = 200;

const POST_ID = '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b';
const MEDIA_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const created = (body) => ({
  post_id: POST_ID,
  post_status: body.scheduled_for ? 'scheduled' : 'publishing',
  publish_mode: body.scheduled_for ? 'scheduled' : 'immediate',
  account_ids: body.account_ids,
  scheduled_for: body.scheduled_for || null,
  media_ids: body.media_ids || [],
  destinations: [],
  created_at: '2026-07-08T09:00:00.000Z',
});

describe('Create Post', () => {
  const perform = App.creates.post.operation.perform;

  it('publishes now to the chosen accounts', async () => {
    let sent;
    api()
      .post(`${PREFIX}/posts`, (body) => {
        sent = body;
        return true;
      })
      .reply(201, (uri, body) => ok(created(body)));
    const result = await appTester(perform, {
      authData,
      inputData: { content: 'Hello', account_ids: ['2280', '2291'] },
      meta: {},
    });
    expect(sent).toEqual({ content: 'Hello', account_ids: [2280, 2291] });
    expect(result).toMatchObject({ id: POST_ID, publish_mode: 'immediate' });
  });

  it('schedules in UTC and sends the Zap timezone as display metadata', async () => {
    let sent;
    api()
      .post(`${PREFIX}/posts`, (body) => {
        sent = body;
        return true;
      })
      .reply(201, (uri, body) => ok(created(body)));
    await appTester(perform, {
      authData,
      inputData: {
        content: 'Later',
        account_ids: ['2280'],
        scheduled_for: '2026-10-01T09:00:00-05:00',
      },
      meta: { timezone: 'America/Chicago' },
    });
    expect(sent.scheduled_for).toBe('2026-10-01T14:00:00.000Z');
    expect(sent.timezone).toBe('America/Chicago');
  });

  it('imports media URLs first and attaches their ids', async () => {
    let sent;
    api()
      .post(`${PREFIX}/media/upload-from-url`, { url: 'https://example.com/a.png' })
      .reply(200, ok({ media_id: MEDIA_ID, media_status: 'ready', type: 'image' }));
    api()
      .post(`${PREFIX}/posts`, (body) => {
        sent = body;
        return true;
      })
      .reply(201, (uri, body) => ok(created(body)));
    await appTester(perform, {
      authData,
      inputData: {
        content: 'With image',
        account_ids: ['2280'],
        media_urls: ['https://example.com/a.png'],
        media_ids: ['11111111-2222-3333-4444-555555555555'],
      },
      meta: {},
    });
    expect(sent.media_ids).toEqual(['11111111-2222-3333-4444-555555555555', MEDIA_ID]);
  });

  it('waits for a video to finish importing', async () => {
    api()
      .post(`${PREFIX}/media/upload-from-url`)
      .reply(200, ok({ media_id: MEDIA_ID, media_status: 'uploading', type: 'video' }));
    api().get(`${PREFIX}/media/${MEDIA_ID}`).reply(200, ok({ id: MEDIA_ID, media_status: 'uploading' }));
    api().get(`${PREFIX}/media/${MEDIA_ID}`).reply(200, ok({ id: MEDIA_ID, media_status: 'ready', ready: true }));
    api()
      .post(`${PREFIX}/posts`, (body) => body.media_ids[0] === MEDIA_ID)
      .reply(201, (uri, body) => ok(created(body)));
    const result = await appTester(perform, {
      authData,
      inputData: { account_ids: ['2280'], media_urls: ['https://example.com/v.mp4'] },
      meta: {},
    });
    expect(result.media_ids).toEqual([MEDIA_ID]);
  });

  it('stops with a clear message when a video is still processing', async () => {
    api()
      .post(`${PREFIX}/media/upload-from-url`)
      .reply(200, ok({ media_id: MEDIA_ID, media_status: 'uploading', type: 'video' }));
    api()
      .get(`${PREFIX}/media/${MEDIA_ID}`)
      .times(100)
      .optionally()
      .reply(200, ok({ id: MEDIA_ID, media_status: 'uploading' }));
    await expect(
      appTester(perform, {
        authData,
        inputData: { account_ids: ['2280'], media_urls: ['https://example.com/v.mp4'] },
        meta: {},
      })
    ).rejects.toThrow(/still processing/);
  });

  it('saves a draft', async () => {
    let sent;
    api()
      .post(`${PREFIX}/posts`, (body) => {
        sent = body;
        return true;
      })
      .reply(201, ok({ post_id: POST_ID, status: 'draft', created_at: '2026-07-08T09:00:00.000Z' }));
    const result = await appTester(perform, {
      authData,
      inputData: { content: 'Draft', account_ids: ['2280'], draft: true },
      meta: {},
    });
    expect(sent.draft).toBe(true);
    expect(result).toMatchObject({ id: POST_ID, post_status: 'draft' });
  });

  it('adds a post to the queue', async () => {
    let sent;
    api()
      .post(`${PREFIX}/posts`, (body) => {
        sent = body;
        return true;
      })
      .reply(201, ok({ post_id: POST_ID, status: 'scheduled', created_at: '2026-07-08T09:00:00.000Z' }));
    await appTester(perform, {
      authData,
      inputData: { content: 'Queued', account_ids: ['2280'], use_queue: 'yes' },
      meta: {},
    });
    expect(sent.use_queue).toBe(true);
    expect(sent.scheduled_for).toBeUndefined();
  });

  it('rejects Add to Queue together with a scheduled time', async () => {
    await expect(
      appTester(perform, {
        authData,
        inputData: {
          content: 'x',
          account_ids: ['2280'],
          use_queue: true,
          scheduled_for: '2030-01-01T00:00:00Z',
        },
        meta: {},
      })
    ).rejects.toThrow(/Add to Queue cannot be used/);
  });

  it('rejects a post with no accounts before calling the API', async () => {
    await expect(
      appTester(perform, { authData, inputData: { content: 'x' }, meta: {} })
    ).rejects.toThrow(/at least one account/);
  });

  it('rejects an unreadable scheduled time', async () => {
    await expect(
      appTester(perform, {
        authData,
        inputData: { content: 'x', account_ids: ['1'], scheduled_for: 'next blue moon' },
        meta: {},
      })
    ).rejects.toThrow(/not a date and time/);
  });

  it('surfaces the API error message', async () => {
    api()
      .post(`${PREFIX}/posts`)
      .reply(400, fail('past_schedule_time', 'scheduled_for must be in the future'));
    await expect(
      appTester(perform, { authData, inputData: { content: 'x', account_ids: ['1'] }, meta: {} })
    ).rejects.toThrow(/scheduled_for must be in the future/);
  });

  it('maps 429 to a throttled error', async () => {
    api()
      .post(`${PREFIX}/posts`)
      .reply(429, fail('rate_limit_exceeded', 'Slow down'), { 'Retry-After': '30' });
    await expect(
      appTester(perform, { authData, inputData: { content: 'x', account_ids: ['1'] }, meta: {} })
    ).rejects.toMatchObject({ name: 'ThrottledError' });
  });
});

describe('Upload Media From URL', () => {
  it('returns the media id as id', async () => {
    api()
      .post(`${PREFIX}/media/upload-from-url`, { url: 'https://example.com/a.png', filename: 'a.png' })
      .reply(200, ok({ media_id: MEDIA_ID, media_status: 'ready', type: 'image' }));
    const result = await appTester(App.creates.media_from_url.operation.perform, {
      authData,
      inputData: { url: 'https://example.com/a.png', filename: 'a.png' },
    });
    expect(result).toMatchObject({ id: MEDIA_ID, media_status: 'ready' });
  });

  it('reports a failed video import with the server reason', async () => {
    api()
      .post(`${PREFIX}/media/upload-from-url`)
      .reply(200, ok({ media_id: MEDIA_ID, media_status: 'uploading', type: 'video' }));
    api()
      .get(`${PREFIX}/media/${MEDIA_ID}`)
      .reply(200, ok({ id: MEDIA_ID, media_status: 'failed', error_message: 'not actually an MP4' }));
    await expect(
      appTester(App.creates.media_from_url.operation.perform, {
        authData,
        inputData: { url: 'https://example.com/v.mp4' },
      })
    ).rejects.toThrow(/not actually an MP4/);
  });

  it('rejects a non-http URL without calling the API', async () => {
    await expect(
      appTester(App.creates.media_from_url.operation.perform, {
        authData,
        inputData: { url: 'ftp://example.com/a.png' },
      })
    ).rejects.toThrow(/must start with https/);
  });
});

describe('Retry Failed Post', () => {
  const perform = App.creates.retry_post.operation.perform;

  it('retries a post', async () => {
    api()
      .post(`${PREFIX}/posts/${POST_ID}/retry`)
      .reply(200, ok({ retried_count: 1, destinations: [{ id: 'd', platform: 'x', new_status: 'queued' }] }));
    const result = await appTester(perform, { authData, inputData: { post_id: POST_ID } });
    expect(result).toMatchObject({ id: POST_ID, retried_count: 1 });
  });

  it('explains when nothing failed', async () => {
    api()
      .post(`${PREFIX}/posts/${POST_ID}/retry`)
      .reply(400, fail('no_failed_destinations', 'No failed destinations'));
    await expect(appTester(perform, { authData, inputData: { post_id: POST_ID } })).rejects.toThrow(
      /no failed accounts to retry/
    );
  });

  it('passes other errors through', async () => {
    api().post(`${PREFIX}/posts/${POST_ID}/retry`).reply(404, fail('not_found', 'Post not found'));
    await expect(appTester(perform, { authData, inputData: { post_id: POST_ID } })).rejects.toThrow(
      /Post not found/
    );
  });
});
