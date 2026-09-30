'use strict';

const { importFromUrl } = require('../lib/media');

const perform = async (z, bundle) => {
  const media = await importFromUrl(z, bundle.inputData.url, {
    filename: bundle.inputData.filename,
  });
  return { ...media, id: media.media_id };
};

module.exports = {
  key: 'media_from_url',
  noun: 'Media',
  display: {
    label: 'Upload Media From URL',
    description: 'Imports an image or MP4 video from a public URL into your PostEverywhere media library.',
  },
  operation: {
    inputFields: [
      {
        key: 'url',
        label: 'File URL',
        required: true,
        helpText:
          'A public https link to an image (JPEG, PNG, GIF, WebP, HEIC, up to 25 MB) or an MP4 video (up to 4 GB).',
      },
      {
        key: 'filename',
        label: 'File Name',
        required: false,
        helpText: 'Optional name to store the file under, such as `launch-hero.png`.',
      },
    ],
    perform,
    sample: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      media_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      media_status: 'ready',
      type: 'image',
      url: 'https://media.posteverywhere.ai/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png',
      filename: 'launch-hero.png',
      size: 204800,
      content_type: 'image/png',
      source_url: 'https://example.com/images/launch-hero.png',
    },
    outputFields: [
      { key: 'id', label: 'Media ID' },
      { key: 'media_status', label: 'Media Status' },
      { key: 'type', label: 'Media Type' },
      { key: 'url', label: 'Media URL' },
      { key: 'filename', label: 'File Name' },
      { key: 'size', label: 'Size (Bytes)', type: 'integer' },
    ],
  },
};
