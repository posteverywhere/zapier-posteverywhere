# PostEverywhere for Zapier

The [Zapier](https://zapier.com) integration for [PostEverywhere](https://posteverywhere.ai). It is built with the [Zapier Platform CLI](https://docs.zapier.com/platform/build-cli/overview).

Use it to create, schedule and publish social media posts from your Zaps. One post can go to Instagram, TikTok, YouTube, LinkedIn, Facebook, X, Threads, Pinterest, Bluesky, Telegram and Discord, and to WordPress as a blog post.

The integration calls the [PostEverywhere REST API](https://developers.posteverywhere.ai) at `https://app.posteverywhere.ai/api/v1`.

## What it does

### Triggers

| Trigger | Type | Triggers when |
| --- | --- | --- |
| New Published Post | Instant (REST hook) | A post goes live on one of your accounts. A post sent to 3 accounts triggers 3 times. |
| Post Failed | Instant (REST hook) | A post fails on one of your accounts after all retries. |
| New Connected Account | Polling | A social account is connected to PostEverywhere. |

The instant triggers create a PostEverywhere webhook when the Zap is turned on and delete it when the Zap is turned off. Every call is checked against the `X-PostEverywhere-Signature` HMAC.

### Actions

| Action | What it does |
| --- | --- |
| Create Post | Publishes now, schedules, adds to the posting queue, or saves a draft. Can import media from public URLs first. |
| Upload Media From URL | Imports an image or video from a public URL into the media library. Returns a Media ID. |
| Retry Failed Post | Queues every failed account of a post to publish again. |

### Searches

| Search | What it does |
| --- | --- |
| Find Post | Finds a post by its ID and returns its status on each account. |

## Authentication

API key. Users create a key at [app.posteverywhere.ai/developers](https://app.posteverywhere.ai/developers). It starts with `pe_live_`. The key is sent as `Authorization: Bearer <key>`. The connection test calls `GET /me`. The connection label shows the workspace name and the user's email.

## Development

Requires Node.js 22.

```bash
npm install
npm test                                   # unit tests, mocked HTTP, no API key needed
npx zapier-platform validate               # schema and publishing checks
```

## Deploy

```bash
npm install -g zapier-platform-cli         # gives the zapier-platform command
zapier-platform login                      # once, opens a prompt for your Zapier login
zapier-platform register "PostEverywhere"  # first time only, creates the private integration
zapier-platform push                       # uploads this version
```

For CI, set `ZAPIER_DEPLOY_KEY` (from [developer.zapier.com/partner-settings/deploy-keys](https://developer.zapier.com/partner-settings/deploy-keys/)) instead of running `login`.

## Listing assets

- Logo: [`assets/logo-512.png`](assets/logo-512.png) (512 x 512, transparent PNG). Source: [`assets/logo.svg`](assets/logo.svg).
- Brand color: `#3D8A5D`.
- Category: Social Media Marketing.
- Description (under 140 characters):
  > PostEverywhere is a social media scheduler that publishes to Instagram, TikTok, YouTube, LinkedIn, X, Facebook and 6 more networks.
- Homepage: https://posteverywhere.ai
- API docs: https://developers.posteverywhere.ai

## License

[MIT](LICENSE.md)
