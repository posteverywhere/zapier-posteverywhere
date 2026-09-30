'use strict';

const { url, unwrap } = require('../lib/api');

const perform = async (z, bundle) => {
  const response = await z.request({ url: url('/accounts') });
  const accounts = (unwrap(response) || {}).accounts || [];
  return accounts
    .map((a) => ({
      ...a,
      label: `${a.account_name} (${a.platform})`,
      can_post: a.health ? a.health.can_post : null,
      health_status: a.health ? a.health.status : null,
    }))
    .sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
};

module.exports = {
  key: 'account',
  noun: 'Account',
  display: {
    label: 'New Connected Account',
    description: 'Triggers when a new social account is connected to PostEverywhere.',
  },
  operation: {
    type: 'polling',
    perform,
    sample: {
      id: 2280,
      platform: 'instagram',
      account_name: 'acme.co',
      label: 'acme.co (instagram)',
      avatar_url: 'https://cdn.posteverywhere.ai/avatars/2280.jpg',
      is_active: true,
      created_at: '2026-05-01T10:00:00.000Z',
      health: { status: 'healthy', can_post: true, needs_reconnection: false },
      can_post: true,
      health_status: 'healthy',
    },
    outputFields: [
      { key: 'id', label: 'Account ID', type: 'integer' },
      { key: 'platform', label: 'Platform' },
      { key: 'account_name', label: 'Account Name' },
      { key: 'label', label: 'Display Name' },
      { key: 'avatar_url', label: 'Avatar URL' },
      { key: 'created_at', label: 'Connected At', type: 'datetime' },
      { key: 'can_post', label: 'Can Post', type: 'boolean' },
      { key: 'health_status', label: 'Health Status' },
    ],
  },
};
