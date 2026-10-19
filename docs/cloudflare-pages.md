# Cloudflare Pages

This repository builds a static Astro frontend with React islands. The existing
Express payment service remains a separate backend; it does not run on Pages.

Project: `dracmaweb1`. Build: `npm run build`. Output: `dist`. Deploy with
`npm run deploy:pages` from the repository root so Wrangler includes `functions/`.
The older `dracma-web` project contains a different app and must not be replaced.

## Payment API

`functions/api/[[path]].js` proxies the frontend endpoints and signed NOWPayments
webhook to `API_ORIGIN` (Pages environment variable). It defaults to the existing
HTTPS backend documented in this repository. Keep `VITE_API_BASE_URL` empty to
use the same-origin proxy. Keys, signature validation, order storage and token
distribution remain on the backend. Never add provider keys to Vite variables.

An unavailable backend returns a JSON 502 after at most 12 seconds. A successful
frontend deployment does not establish that payments or token delivery work.
Before changing the production webhook URL, verify `/api/health`, pricing and an
authorized payment end to end, including the signed callback and distribution.

## Verification

- `npm run build` generates all 14 localized routes.
- Run the existing payment/UI regression tests and `node --test tests/pages-api.test.mjs`.
- Check the published homepage, localized pages, mobile menu, theme and whitepaper.
- Check `/api/presale/pricing` returns real JSON; a 502 needs backend recovery.
