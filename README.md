# DRACMA Web

Frontend Astro con componentes React para el catálogo ilustrativo de proyectos, la información de servicios y la consulta/cotización del token DRACMA. El dominio principal es https://dracma.club y se publica en el proyecto Cloudflare Pages `dracmaweb1`; los pagos y la entrega de tokens pertenecen a una API separada.

## Desarrollo y publicación

```sh
npm install
npm run dev
npm run build
npm run verify:pages
npm run verify:seo
npm run verify:publication
npm run deploy:pages
```

La salida estática se genera en `dist`. El script de publicación elimina metadatos de macOS y conserva la Function de API. Configuración y límites: [Cloudflare Pages](docs/cloudflare-pages.md).

## SEO y revisión de enlaces

La fuente del dominio canonical es `src/config/site.mjs`; títulos y descripciones de secciones están en `src/data/pencil-pages.json`, y el contenido explicativo en `src/data/page-guides.json`. La navegación visible y los datos estructurados comparten `src/config/breadcrumbs.mjs`.

Después de publicar el mismo build, ejecutar:

```sh
npm run verify:seo:live -- --report /tmp/dracma-seo-live.json
```

La revisión comprueba páginas, archivos, metadatos, canonical, anclas, redirecciones, respuestas 404 y enlaces externos. Los destinos externos bloqueados se reportan como no verificados. Consulta [el alcance de la revisión](docs/seo-review.md) y [el reporte publicado](docs/seo-live-report.json). No equivale a una puntuación de Semrush ni acredita indexación en Google.

## Métricas públicas de Quant

`src/data/quant-track-record.json` conserva la captura fechada de la cuenta TNG Gold EA HFM de ConfirmedTrades, con atribución a su publicador en el registro de origen. El frontend no incluye nombre de la cuenta, publicador, broker ni enlaces específicos que revelen esa identidad. Para actualizarla, consultar la ficha pública, comprobar sus estadísticas actuales y cambiar valores y `observedAt`; después ejecutar `node scripts/quant-track-record.mjs`. El importador de Pencil aplica el mismo normalizador. La página muestra la fecha y aclara que no hay sincronización automática; identifica el historial como una cuenta externa de referencia, sin presentar sus resultados como propios ni dibujar una serie inventada. El drawdown histórico de la cuenta y el umbral de riesgo del servicio se identifican por separado.

## Compra DRACMA: API Go y SQLite

`/comprar/` y el CTA principal utilizan la API Go versionada. Calcula la cotización en el servidor con el precio del par Dexscreener BSC y persiste órdenes, reservas y entregas en SQLite. El backend está en `https://github.com/devfidubit-a11y/dracmabackend` y se publica por separado en Railway. Salud del servicio: `https://api-production-a401.up.railway.app/health/ready`. Las compras permanecen deshabilitadas hasta completar su configuración y controles de producción.

En Cloudflare Pages, configurar `GO_API_ORIGIN` con el origen HTTPS del servidor Go. `PUBLIC_CHECKOUT_API_BASE_URL` queda vacío para usar la Function de la misma procedencia. Si falta ese origen, el checkout muestra indisponibilidad explícita y no genera facturas. No hay un precio fijo de respaldo.

Para desarrollo con Go en `127.0.0.1:8787`:

```sh
PUBLIC_CHECKOUT_API_BASE_URL=http://127.0.0.1:8787 npm run dev -- --port 4323
```

Abrir `http://localhost:4323/comprar/` y configurar `PUBLIC_APP_URL`/`CORS_ORIGIN` del Go API como `http://localhost:4323`. La API permanece con `CHECKOUT_ENABLED=false` hasta configurar NOWPayments, IPN público y la wallet de ventas. El recibo privado de consulta permanece en la pestaña; un retorno desde NOWPayments nunca marca una compra como entregada.

La Function mantiene `API_ORIGIN` para callbacks del backend Node y `GO_API_ORIGIN` para `/api/v1/*`. Antes de habilitar compras nuevas en Go, conciliar las órdenes antiguas, pausar su creación en Node y dedicar una wallet de ventas a la nueva instancia. Los datos JSON del backend Node no se migran automáticamente.

## API Node de preventa anterior

El backend anterior está en `server/`: Node/Express, persistencia JSON y precio escalonado de preventa. Se conserva para sus flujos y órdenes existentes. La disponibilidad del origen histórico indicado abajo no está verificada; no es el servicio Go del checkout principal.

Key production values:

- Current backend HTTPS origin: `https://32.196.242.92.sslip.io`
- Preferred branded webhook after the Amplify rewrite is active: `https://dracma.club/api/webhooks/nowpayments`
- Sale token: `0x8A9f07fdBc75144C9207373597136c6E280A872D`
- Base price: `BASE_TOKEN_PRICE_USD=0.30`
- Price step: `PRICE_STEP_TOKENS=100000`
- Step increase: `PRICE_STEP_INCREASE_RATE=0.10`
- Max sale inventory: `MAX_SALE_TOKENS=400000000`

Useful endpoints:

- `GET /api/presale/pricing`
- `GET /api/presale/ledger`
- `POST /api/presale/quote`
- `POST /api/payments/nowpayments`
- `POST /api/webhooks/nowpayments`

Amplify Hosting should proxy `/api/<*>` to the HTTPS backend or set `VITE_API_BASE_URL` to the HTTPS backend. The frontend falls back to the HTTPS backend when same-origin `/api` returns `404`, so NOWPayments can still open while Amplify rewrites are being applied. See `docs/amplify-nowpayments.md`.

Do not commit real NOWPayments, SSH, AWS, or distributor private keys. Use `.env.example` as the template and keep real values in server/hosting secrets.

### Huff token distributor

The backend contract distribution mode calls:

```text
releaseTokens(address recipient, uint256 amount, string orderId)
```

The Huff distributor lives at `contracts/src/TokenDistributor.huff` and blocks duplicate `orderId` releases. Test it locally with:

```shell
npm run test:huff
```

Deploy it to BSC with:

```shell
npm run deploy:huff:distributor
```

Required deploy env vars: `BSC_RPC_URL`, `TOKEN_DISTRIBUTOR_PRIVATE_KEY`, and optionally `TOKEN_DISTRIBUTOR_OWNER`. After deploy, transfer the DRACMA inventory to the distributor contract and set `TOKEN_DISTRIBUTION_MODE=contract`, `TOKEN_DISTRIBUTOR_CONTRACT_ADDRESS`, and `TOKEN_DISTRIBUTOR_FUNCTION=releaseTokens` in the backend `.env`.
