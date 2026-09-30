'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');
const { api, ok, fail, authData, PREFIX } = require('./helpers');

const appTester = zapier.createAppTester(App);
zapier.tools.env.inject();

const me = {
  scopes: ['read', 'write'],
  user: { id: 114, email: 'owner@example.com', name: 'Owner' },
  organization: { id: 'org-1', name: 'Acme Org', subscription_plan: 'GROWTH', entitled: true },
  workspace: { id: 'ws-1', name: 'Acme Marketing' },
  quota: {},
  stats: {},
};

describe('authentication', () => {
  it('passes the test with a valid key and sends it as a Bearer header', async () => {
    api().get(`${PREFIX}/me`).reply(200, ok(me));
    const result = await appTester(App.authentication.test, { authData });
    expect(result.user.email).toBe('owner@example.com');
  });

  it('builds a connection label from workspace and email, with no key in it', async () => {
    const label = await appTester(App.authentication.connectionLabel, { authData, inputData: me });
    expect(label).toBe('Acme Marketing (owner@example.com)');
    expect(label).not.toContain('pe_live');
  });

  it('falls back to the organization name when there is no workspace name', async () => {
    const label = await appTester(App.authentication.connectionLabel, {
      authData,
      inputData: { ...me, workspace: { id: null, name: null } },
    });
    expect(label).toBe('Acme Org (owner@example.com)');
  });

  it('fails the test with a clear message on 401', async () => {
    api()
      .get(`${PREFIX}/me`)
      .reply(401, fail('invalid_api_key', 'Invalid API key format. Expected: Bearer pe_live_...'));
    await expect(appTester(App.authentication.test, { authData })).rejects.toThrow(
      /API key was rejected: Invalid API key format/
    );
  });

  it('turns 402 subscription errors into the API message', async () => {
    api()
      .get(`${PREFIX}/me`)
      .reply(402, fail('subscription_required', 'Your free trial has ended.'));
    await expect(appTester(App.authentication.test, { authData })).rejects.toThrow(
      /Your free trial has ended/
    );
  });
});
