'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');
const { api, ok, fail, authData, PREFIX } = require('./helpers');

const appTester = zapier.createAppTester(App);
const POST_ID = '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b';

describe('Find Post', () => {
  const perform = App.searches.post.operation.perform;

  it('returns the post in a one-item list', async () => {
    api()
      .get(`${PREFIX}/posts/${POST_ID}`)
      .reply(200, ok({ post_id: POST_ID, post_status: 'published', destinations: [] }));
    const results = await appTester(perform, { authData, inputData: { post_id: POST_ID } });
    expect(results).toEqual([{ id: POST_ID, post_id: POST_ID, post_status: 'published', destinations: [] }]);
  });

  it('returns an empty list on 404', async () => {
    api().get(`${PREFIX}/posts/${POST_ID}`).reply(404, fail('not_found', 'Post not found'));
    const results = await appTester(perform, { authData, inputData: { post_id: POST_ID } });
    expect(results).toEqual([]);
  });

  it('throws on other errors', async () => {
    api().get(`${PREFIX}/posts/${POST_ID}`).reply(403, fail('forbidden', 'Missing read scope'));
    await expect(appTester(perform, { authData, inputData: { post_id: POST_ID } })).rejects.toThrow(
      /Missing read scope/
    );
  });
});
