'use strict';

const BASE_URL = 'https://app.posteverywhere.ai/api/v1';
const API_KEYS_URL = 'https://app.posteverywhere.ai/developers';

const url = (path) => `${BASE_URL}${path}`;

// Adds the API key to every request made by this integration.
const addApiKey = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.api_key) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${String(bundle.authData.api_key).trim()}`;
  }
  return request;
};

const readEnvelopeError = (response) => {
  let body = response.data;
  if (body === undefined || body === null || typeof body === 'string') {
    try {
      body = JSON.parse(response.content);
    } catch (e) {
      body = null;
    }
  }
  const err = body && typeof body === 'object' ? body.error : null;
  return {
    message: err && err.message ? String(err.message) : null,
    code: err && err.code ? String(err.code) : null,
  };
};

// Turns the API's { data, error, meta } error envelope into a clear Zapier error.
// Requests can opt out with skipThrowForStatus (used where a 404 is a normal result).
const handleErrors = (response, z) => {
  if (response.status < 400 || response.skipThrowForStatus) return response;

  const { message, code } = readEnvelopeError(response);
  const text = message || `PostEverywhere returned HTTP ${response.status}.`;

  if (response.status === 401) {
    throw new z.errors.Error(
      `Your PostEverywhere API key was rejected: ${text} Create a new key at ${API_KEYS_URL} and reconnect.`,
      'AuthenticationError',
      401
    );
  }
  if (response.status === 429) {
    const retryAfter = Number(response.getHeader('retry-after')) || 60;
    throw new z.errors.ThrottledError(text, retryAfter);
  }
  throw new z.errors.Error(text, code || `HTTP${response.status}`, response.status);
};

// Every successful response has the shape { data, error: null, meta }.
const unwrap = (response) => {
  const body = response.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
};

const toList = (value) => {
  if (value === undefined || value === null || value === '') return [];
  const arr = Array.isArray(value) ? value : String(value).split(',');
  return arr.map((v) => String(v).trim()).filter(Boolean);
};

module.exports = { BASE_URL, API_KEYS_URL, url, addApiKey, handleErrors, unwrap, toList };
