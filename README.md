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

## DRACMA Presale API

The backend in `server/` creates NOWPayments invoices, receives IPN webhooks, tracks reserved/sold tokens, and blocks over-sales with `MAX_SALE_TOKENS`.

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
