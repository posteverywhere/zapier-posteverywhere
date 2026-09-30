'use strict';

const { url, unwrap } = require('./api');

// Time budget for videos. Kept under Zapier's per-step time limit. Tests shorten it.
const settings = { waitMs: 20000, pollMs: 2000 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Imports one public image or MP4 URL. Images are ready at once; videos stream in
// server-side, so we poll GET /media/{id} until ready or until the time budget runs out.
const importFromUrl = async (z, sourceUrl, { filename, waitMs = settings.waitMs, pollMs = settings.pollMs } = {}) => {
  const clean = String(sourceUrl || '').trim();
  if (!/^https:\/\/|^http:\/\//i.test(clean)) {
    throw new z.errors.Error(
      `Media URL must start with https:// (got "${clean.slice(0, 80)}").`,
      'invalid_url',
      400
    );
  }
  const body = { url: clean };
  if (filename) body.filename = String(filename);

  const response = await z.request({ url: url('/media/upload-from-url'), method: 'POST', body });
  let media = unwrap(response) || {};
  if (media.media_status === 'ready' || !media.media_id) return media;

  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const poll = await z.request({ url: url(`/media/${encodeURIComponent(media.media_id)}`) });
    const detail = unwrap(poll) || {};
    const status = detail.media_status || detail.status;
    if (status === 'ready' || detail.ready === true) {
      return { ...media, ...detail, media_id: media.media_id, media_status: 'ready' };
    }
    if (status === 'failed') {
      throw new z.errors.Error(
        `PostEverywhere could not import ${clean}: ${detail.error_message || 'the import failed.'}`,
        'media_import_failed',
        400
      );
    }
    media = { ...media, ...detail, media_id: media.media_id };
  }
  return { ...media, media_status: media.media_status || 'uploading' };
};

module.exports = { importFromUrl, sleep, settings };
