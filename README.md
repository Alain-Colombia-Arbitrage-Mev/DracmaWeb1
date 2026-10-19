# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run api`             | Starts the DRACMA payment API at `localhost:8787` |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Métricas públicas de Quant

`src/data/quant-track-record.json` conserva la captura fechada de la cuenta TNG Gold EA HFM de ConfirmedTrades, con atribución a su publicador. Para actualizarla, consultar la ficha pública, comprobar sus estadísticas actuales y cambiar valores y `observedAt`; después ejecutar `node scripts/quant-track-record.mjs`. El importador de Pencil aplica el mismo normalizador. La página muestra la fecha y aclara que no hay sincronización automática; enlaza la curva original en lugar de dibujar una serie de resultados inventada. El drawdown histórico de la cuenta y el umbral de riesgo del servicio se identifican por separado.

## Compra DRACMA: API Go y SQLite

`/comprar/` y el CTA principal utilizan la API Go versionada. Calcula la cotización en el servidor con el precio del par Dexscreener BSC y persiste órdenes, reservas y entregas en SQLite. El código del backend se prepara en `/Volumes/KINGSTON/dracmabackend`; su remoto previsto es `https://github.com/devfidubit-a11y/dracmabackend.git` (pendiente de acceso).

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
