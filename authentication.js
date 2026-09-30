'use strict';

const { url, unwrap, API_KEYS_URL } = require('./lib/api');

const test = async (z) => {
  const response = await z.request({ url: url('/me') });
  return unwrap(response);
};

// Shown in the Zap editor so users can tell connections apart. Never shows the key.
const connectionLabel = (z, bundle) => {
  const me = bundle.inputData || {};
  const place =
    (me.workspace && me.workspace.name) || (me.organization && me.organization.name) || '';
  const email = (me.user && me.user.email) || '';
  if (place && email) return `${place} (${email})`;
  return place || email || 'PostEverywhere';
};

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText: `Create a key in PostEverywhere under [Developers](${API_KEYS_URL}). Keys start with \`pe_live_\`. Give the key the **read** and **write** scopes.`,
    },
  ],
  test,
  connectionLabel,
};
