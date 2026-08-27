# GoMMT Price Watcher

Read-only price/inventory watcher for **GoMMT (MakeMyTrip/Goibibo) Extranet**. A
hotelier logs their own account in, and the service polls their extranet dashboard
in the background, detects room-price or sold-out changes, and fires an
HMAC-signed webhook the moment something changes — so another system can update
prices elsewhere without touching GoMMT itself.

Architecture follows [OpenWA](https://github.com/rmyndharis/OpenWA)'s pattern:
an **engine layer** drives a real client (there: `whatsapp-web.js`/`baileys`;
here: a headless Chromium via Playwright), **session** management sits above it,
and everything else — polling, webhooks, storage — is a normal NestJS module on
top.

## ⚠️ Read this before pointing it at a real account

- GoMMT Extranet has no public API for a browser automation client like this
  one — it works by driving a real Chromium session through the hotelier's own
  dashboard, the same way OpenWA drives WhatsApp Web. **Only ever use a
  hotelier's own account, with their explicit knowledge and consent.**
- This is **read-only by design** — it never submits a price change back to
  GoMMT, only reads what's already there. Nothing here should be extended to
  write without the hotelier explicitly wanting that risk.
- GoMMT's terms of service almost certainly don't sanction automated access.
  Treat this the same way OpenWA treats WhatsApp automation: functional, but
  carrying real account-restriction risk that no amount of code quality
  removes. Poll conservatively (`POLL_INTERVAL_MS`), don't hammer the site.
- Credentials and browser session state are encrypted at rest
  (`CREDENTIALS_ENCRYPTION_KEY`, AES-256-GCM) — never log them, never commit
  `.env`.

## How it works

1. **`POST /sessions`** — hotelier submits their GoMMT username/password.
   The engine launches a browser context and logs in.
2. **`POST /sessions/:id/otp`** — GoMMT's login typically requires an OTP;
   the hotelier submits it here to complete login. The browser's session
   state (cookies) is then saved, encrypted, so future polls don't need to
   log in again.
3. **`PUT /sessions/:id/webhook`** — point this session at wherever prices
   should be pushed (`targetUrl` + a shared `secret` for HMAC signing).
4. A background poller (`POLL_INTERVAL_MS`, default 60s) reuses the logged-in
   browser context to re-check the rates/inventory page, diffs it against the
   last known snapshot, and on any change fires a signed webhook:
   `POST <targetUrl>` with header `X-Signature: HMAC-SHA256(body, secret)`.
5. **`GET /sessions/:id/prices`** — latest known snapshot on demand.
   **`POST /sessions/:id/refresh`** — force an immediate scrape instead of
   waiting for the next poll.

## Before this works against a real account

`src/config/gommt-selectors.ts` holds every DOM selector and URL used to
drive the extranet UI — they are placeholders. Open the real GoMMT Extranet in
a browser, inspect the login form, OTP field, and rates/inventory table, and
fill in the real selectors there. That file is the single place to update
when GoMMT changes their frontend.

## Setup

```bash
cp .env.example .env
# generate CREDENTIALS_ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm install
npx playwright install --with-deps chromium
npm run start:dev
```

Or via Docker (Playwright's browsers are already baked into the base image):

```bash
docker compose up --build
```

## API

| Method | Path                        | Purpose                                   |
| ------ | --------------------------- | ------------------------------------------ |
| POST   | `/sessions`                 | Start login with hotelier credentials      |
| POST   | `/sessions/:id/otp`         | Complete login with the OTP                |
| GET    | `/sessions`                 | List sessions and their status             |
| DELETE | `/sessions/:id`             | Close the browser context, remove session  |
| PUT    | `/sessions/:id/webhook`     | Configure where change events get pushed   |
| GET    | `/sessions/:id/prices`      | Latest known price snapshot                |
| POST   | `/sessions/:id/refresh`     | Force an immediate scrape                  |

## Why not Python or Go

The bottleneck here is Chromium page-navigation time against GoMMT's servers,
not the host language — so raw runtime speed buys little. Node/TypeScript was
chosen to mirror OpenWA's stack (same engine-layer pattern, most mature
Playwright bindings) and because its event loop comfortably handles
concurrent session polling + webhook dispatch at this scale.
