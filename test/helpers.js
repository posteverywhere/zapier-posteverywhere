'use strict';

const nock = require('nock');

const BASE = 'https://app.posteverywhere.ai';
const PREFIX = '/api/v1';
// Fake key used only against nock. No real key is ever used in tests.
const API_KEY = 'pe_live_test_0000000000000000';
const authData = { api_key: API_KEY };

const ok = (data) => ({
  data,
  error: null,
  meta: { request_id: 'req_test', timestamp: '2026-07-08T09:00:00.000Z' },
});
const fail = (code, message) => ({
  data: null,
  error: { code, message, retryable: false },
  meta: { request_id: 'req_test', timestamp: '2026-07-08T09:00:00.000Z' },
});

const api = () =>
  nock(BASE, { reqheaders: { authorization: `Bearer ${API_KEY}` } });

module.exports = { nock, api, ok, fail, authData, PREFIX, API_KEY };
