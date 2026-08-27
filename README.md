# Multi-Site Price Watcher

Read-only price/inventory watcher for hotel booking sites — **GoMMT
(MakeMyTrip/Goibibo) Extranet**, **Swiftbook**, and any other site you add an
adapter for. It watches a property's room prices/availability in the
background and fires an HMAC-signed webhook the moment something changes —
so another system can update prices elsewhere without touching the source
site itself.

Architecture follows [OpenWA](https://github.com/rmyndharis/OpenWA)'s
pattern, generalized to multiple sites: a site-agnostic **engine layer**
owns the browser/session lifecycle (Playwright/Chromium, the way OpenWA
drives `whatsapp-web.js`/`baileys`), and every site-specific detail — URLs,
DOM selectors, whether login is even required — lives in a small
**`SiteAdapter`** plugged into it. Adding a new site means adding one
adapter; nothing else in the engine, session, price, or webhook modules
changes.

| Site        | `siteType`   | Needs login?                         | Risk profile                                                    |
| ----------- | ------------ | ------------------------------------- | ----------------------------------------------------------------- |
| GoMMT       | `gommt`      | Yes — hotelier credentials + OTP      | Real account-restriction risk (see disclaimer below)              |
| Swiftbook   | `swiftbook`  | No — public booking widget, URL-only  | Lower — no account to restrict, but still automated scraping      |

## ⚠️ Read this before pointing it at a real property

- Both adapters work by driving a real Chromium session, the same way OpenWA
  drives WhatsApp Web — not through an official API. For **GoMMT**, only ever
  use a hotelier's own account, with their explicit knowledge and consent.
- This is **read-only by design** — no adapter submits a price change back to
  the source site, only reads what's already there.
- Neither site's terms of service sanction automated access. Treat this the
  same way OpenWA treats WhatsApp automation: functional, but carrying real
  risk (account restriction on GoMMT; IP/rate-limit blocks on either) that no
  amount of code quality removes. Poll conservatively (`POLL_INTERVAL_MS`),
  don't hammer either site, and prefer a residential proxy over a cheap
  datacenter IP if you're running this at any scale.
- Credentials and browser session state are encrypted at rest
  (`CREDENTIALS_ENCRYPTION_KEY`, AES-256-GCM) — never log them, never commit
  `.env`.

## How it works

1. **`POST /sessions`** — register a property to watch:
   - `{ hotelName, siteType: "gommt", username, password }` — logs in via
     the GoMMT adapter.
   - `{ hotelName, siteType: "swiftbook", siteConfig: { baseUrl, propertyId, roomIds } }`
     — no credentials needed, just opens the public widget.
2. **`POST /sessions/:id/otp`** — only for login-required sites (GoMMT):
   submit the OTP to complete login. The browser's session state (cookies)
   is then saved, encrypted, so future polls don't need to log in again.
3. **`PUT /sessions/:id/webhook`** — point this session at wherever prices
   should be pushed (`targetUrl` + a shared `secret` for HMAC signing).
4. A background poller (`POLL_INTERVAL_MS`, default 60s) reuses the same
   browser context, re-reads the property's current prices via its adapter,
   diffs against the last known snapshot, and on any change fires a signed
   webhook: `POST <targetUrl>` with header `X-Signature: HMAC-SHA256(body, secret)`.
5. **`GET /sessions/:id/prices`** — latest known snapshot on demand.
   **`POST /sessions/:id/refresh`** — force an immediate scrape instead of
   waiting for the next poll.

## Adding a new site

1. Create `src/config/<site>-selectors.ts` with its URLs/DOM selectors.
2. Create `src/modules/engine/adapters/<site>.adapter.ts` implementing
   `SiteAdapter` (`src/modules/engine/site-adapter.interface.ts`) — either
   `login`/`submitOtp` (login-gated sites) or `open` (public sites), plus
   `scrapePrices`.
3. Register it in `AdapterRegistryService` and `EngineModule`'s providers.

That's the entire surface — `EngineService`, `SessionService`, `PriceService`,
and `WebhookService` never need to know a new site exists.

## Before this works against a real property

Every selector in `src/config/gommt-selectors.ts` and
`src/config/swiftbook-selectors.ts` is a **placeholder** — this environment
couldn't reach either site to inspect the real DOM (network policy blocked
`swiftbook.io`, and GoMMT needs a real hotelier login to even see the
dashboard). Open the real site in a browser, inspect the login form/OTP
field/room-price elements, and replace the placeholders. Those two files are
the only place to update when a site changes its frontend.

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

| Method | Path                        | Purpose                                        |
| ------ | --------------------------- | ------------------------------------------------ |
| POST   | `/sessions`                 | Register a property (`siteType` + credentials/config) |
| POST   | `/sessions/:id/otp`         | Complete login with the OTP (login-required sites only) |
| GET    | `/sessions`                 | List sessions and their status                    |
| DELETE | `/sessions/:id`             | Close the browser context, remove session          |
| PUT    | `/sessions/:id/webhook`     | Configure where change events get pushed           |
| GET    | `/sessions/:id/prices`      | Latest known price snapshot                        |
| POST   | `/sessions/:id/refresh`     | Force an immediate scrape                          |

## Why not Python or Go

The bottleneck here is Chromium page-navigation time against the target
site's servers, not the host language — so raw runtime speed buys little.
Node/TypeScript was chosen to mirror OpenWA's stack (same engine-layer
pattern, most mature Playwright bindings) and because its event loop
comfortably handles concurrent session polling + webhook dispatch at this
scale.
