# Cloudflare Pages

This repository builds a static Astro frontend with React islands. The Go and
legacy Express APIs are separate services; neither runs on Pages.

Project: `dracmaweb1`. Build: `npm run build`. Output: `dist`. Deploy with
`npm run deploy:pages` from the repository root so Wrangler includes `functions/`.
The older `dracma-web` project contains a different app and must not be replaced.

## Payment API

`functions/api/[[path]].js` proxies `/api/v1/*` to `GO_API_ORIGIN` and approved
legacy endpoints to `API_ORIGIN`. Keep `PUBLIC_CHECKOUT_API_BASE_URL` empty for
the current same-origin checkout. Keys, signature validation, order storage and
token distribution remain on the backend. Never add provider keys to public
build variables. Preserve the separate legacy origin during migration.

An unavailable backend returns a JSON 502 after at most 12 seconds. A successful
frontend deployment does not establish that payments or token delivery work.
Before changing the production webhook URL, verify `/api/health`, pricing and an
authorized payment end to end, including the signed callback and distribution.

## Verification

- `npm run build` currently generates 43 HTML documents, including the 404 page.
- Run `npm run verify:pages`, `npm run verify:seo`, `npm run verify:publication`,
  and `node --test tests/pages-api.test.mjs` before publishing.
- Run `node scripts/prepare-pages.mjs` to exclude macOS metadata from upload.
- After publishing, run `npm run verify:seo:live`. This checks the deployed
  documents, generated assets, redirects, genuine 404 responses and external links.
  External blocks/timeouts are reported as unverified, not successful checks.
- Check `/api/v1/market/price` returns live JSON and honors `checkoutAvailable`.
  A successful frontend build does not establish payment or delivery functionality.

## Chat del Agente DRACMA

`functions/api/chat/[[path]].js` tiene prioridad sobre el proxy general de pagos.
Configurar `CHAT_API_ORIGIN` y `CHAT_PROXY_SECRET` como secretos de Pages; no
usar variables `PUBLIC_*` para credenciales. El proxy permite solo preguntas,
sesiones y mensajes, conserva el token opaco de sesión y rechaza escrituras de
otros orígenes. Chatwoot y el bot Go se despliegan por separado en Railway.
Consultar [operación y límites](../deploy/chatwoot/README.md). Probar las rutas
públicas después de cada despliegue y ejecutar `node --test tests/chat-api.test.mjs`.
