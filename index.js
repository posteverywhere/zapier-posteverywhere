'use strict';

const { version: platformVersion } = require('zapier-platform-core');
const { version } = require('./package.json');

const authentication = require('./authentication');
const { addApiKey, handleErrors } = require('./lib/api');

const accountTrigger = require('./triggers/account');
const { failedPostChoice, postChoice } = require('./triggers/post_choices');
const postPublished = require('./triggers/post_published');
const postFailed = require('./triggers/post_failed');

const createPost = require('./creates/post');
const uploadMediaFromUrl = require('./creates/media_from_url');
const retryPost = require('./creates/retry_post');

const findPost = require('./searches/post');

module.exports = {
  version,
  platformVersion,

  authentication,
  // Pass input through as the user entered it (Zapier check D028).
  flags: { cleanInputData: false },
  beforeRequest: [addApiKey],
  afterResponse: [handleErrors],

  triggers: {
    [postPublished.key]: postPublished,
    [postFailed.key]: postFailed,
    [accountTrigger.key]: accountTrigger,
    [failedPostChoice.key]: failedPostChoice,
    [postChoice.key]: postChoice,
  },

  creates: {
    [createPost.key]: createPost,
    [uploadMediaFromUrl.key]: uploadMediaFromUrl,
    [retryPost.key]: retryPost,
  },

  searches: {
    [findPost.key]: findPost,
  },
};
