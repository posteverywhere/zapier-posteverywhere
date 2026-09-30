'use strict';

// Hidden triggers that fill the "Post" dropdowns (Retry Failed Post, Find Post).
const { url, unwrap } = require('../lib/api');

const listPosts = (status) => async (z, bundle) => {
  const params = {
    sort: 'updated_at',
    order: 'desc',
    limit: 50,
    offset: (bundle.meta && bundle.meta.page ? bundle.meta.page : 0) * 50,
  };
  if (status) params.status = status;
  const response = await z.request({ url: url('/posts'), params });
  const posts = (unwrap(response) || {}).posts || [];
  return posts.map((p) => {
    const text = (p.content || '').replace(/\s+/g, ' ').trim();
    const short = text.length > 60 ? `${text.slice(0, 57)}...` : text || '(no text)';
    return { ...p, id: p.post_id || p.id, label: `${short} [${p.post_status || p.status}]` };
  });
};

const sample = {
  id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
  post_id: '7c1e8a52-3f4b-4d6e-9a0b-1c2d3e4f5a6b',
  post_status: 'failed',
  content: 'Big news dropping tomorrow',
  label: 'Big news dropping tomorrow [failed]',
};

const failedPostChoice = {
  key: 'failed_post_choice',
  noun: 'Post',
  display: {
    label: 'Failed Post Choices',
    description: 'Triggers when a post fails, for use in dropdowns only.',
    hidden: true,
  },
  operation: {
    type: 'polling',
    canPaginate: true,
    perform: listPosts('failed,partially_failed'),
    sample,
  },
};

const postChoice = {
  key: 'post_choice',
  noun: 'Post',
  display: {
    label: 'Post Choices',
    description: 'Triggers when a post is created or changed, for use in dropdowns only.',
    hidden: true,
  },
  operation: {
    type: 'polling',
    canPaginate: true,
    perform: listPosts(null),
    sample: { ...sample, post_status: 'published', label: 'Big news dropping tomorrow [published]' },
  },
};

module.exports = { failedPostChoice, postChoice };
