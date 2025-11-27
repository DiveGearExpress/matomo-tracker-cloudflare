# Matomo Cloudflare Tracker

Cloudflare Worker (TypeScript, Node 24 tooling) that sits inline on your zone, proxies requests to the origin, measures each origin response, and asynchronously posts a Matomo Measurement Protocol hit to `/matomo.php`. No log files are read; tracking is derived from the live request/response and never delays the origin response thanks to `waitUntil`.

## Requirements

- Node.js 24 for local tooling and bundling.
- Matomo instance and site ID.
- Cloudflare Worker deployment (route or zone with origin configured).

## Environment Variables (Worker bindings)

- `MATOMO_URL` (required): Base Matomo URL, e.g. `https://analytics.example.com`.
- `MATOMO_SITE_ID` (required): Matomo site ID (integer).
- `MATOMO_TIMEOUT_MS` (optional, default `5000`): HTTP timeout in ms for Matomo calls.
- `MATOMO_TOKEN_AUTH` (optional, recommended): Sent as `Authorization: Bearer <token>`.
- `DOCUMENT_REGEX` (optional): Case-insensitive regex to detect downloads; matching URLs add `download=<url>` to Matomo payloads. Defaults to common document/media/archive extensions.
- `LOG_LEVEL` (optional, default `warn`): `silent|error|warn|info|debug`.
- `USER_AGENT_ALLOWLIST_REGEX` (optional): Case-insensitive regex to permit user agents; non-matching entries are skipped. Defaults to an allowlist for `ChatGPT-User|MistralAI-User|Gemini-Deep-Research|Claude-User|Perplexity-User|Google-NotebookLM|Devin`.

Bind these as plain text environment variables in your Worker (e.g., Wrangler `vars`).

## Build & Package

Wrangler bundles the TypeScript entry for you; no manual build is required for `wrangler dev` or `wrangler deploy`. Keep `npm run typecheck`/`npm test`/`npm run lint` for validation.

## Local Development (Wrangler)

- Install Wrangler (e.g., `npm install -g wrangler` or `npx wrangler --version` to use npx).
- Copy `.dev.vars.example` to `.dev.vars` and set your local values (these are only for `wrangler dev --local`):
  - `MATOMO_URL`, `MATOMO_SITE_ID`, `MATOMO_TIMEOUT_MS`, `LOG_LEVEL`, `USER_AGENT_ALLOWLIST_REGEX`, `DOCUMENT_REGEX`
  - For `MATOMO_TOKEN_AUTH`, prefer `wrangler secret put MATOMO_TOKEN_AUTH` (or set in `.dev.vars` only for local testing).
- Start local dev (serves on http://localhost:8787 by default):

```sh
npm install
npm run typecheck   # optional: static checks
npx wrangler dev --local
```

Wrangler will use `wrangler.toml` and bundle the TypeScript entry automatically. You can point routes to your origin per your zone settings; the Worker simply proxies the request.

## Deploy (manual outline)

1. Ensure `wrangler.toml` values are correct for your zone/route and Matomo URL.
2. Set production vars/secrets:
   - `wrangler secret put MATOMO_TOKEN_AUTH` (if used)
   - Adjust or set vars in `wrangler.toml` or via `wrangler deploy --var KEY=VALUE`
3. Deploy:
   - `npx wrangler deploy`

The Worker simply calls `fetch(request)` to reach your origin and separately posts a single Matomo hit via `waitUntil`, so the origin response is not delayed.

## Runtime Behavior

- Receives each incoming request, proxies to origin with `fetch`, and returns the origin response.
- Measures server time (`pf_srv` in seconds), status, and response bytes from `Content-Length` when present.
- Builds a Matomo payload with `idsite`, `rec:1`, `recMode:1`, `url`, `source:'Cloudflare'`, `cdt` (UTC `YYYY-MM-DD HH:mm:ss`), and `ua`.
- Detects downloads via `DOCUMENT_REGEX` and user-agent allowlist via `USER_AGENT_ALLOWLIST_REGEX`; disallowed UAs are skipped.
- Sends a single Matomo hit asynchronously via `waitUntil` to `/matomo.php` with optional bearer auth and timeout.

## Logging

Console logging is gated by `LOG_LEVEL`:

- `info`: origin failures, Matomo send start/response summaries.
- `warn`: tracking failures.
- `debug`: Matomo responses.

## Tests & Lint

```sh
npm run format:check
npm run lint
npm test
npm run typecheck
```

All commands assume Node 24. Tests run in a Node environment with global `fetch`.
Wrangler bundles your TypeScript entry automatically; no manual build step is required for deploy.
