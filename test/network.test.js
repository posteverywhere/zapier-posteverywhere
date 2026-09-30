'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');
const { authData } = require('./helpers');

const appTester = zapier.createAppTester(App);

// Guard: a request with no mock must fail locally, never reach the real API.
it('blocks unmocked HTTP calls', async () => {
  await expect(appTester(App.authentication.test, { authData })).rejects.toThrow(
    /Nock: (Disallowed net connect|No match)/
  );
});
