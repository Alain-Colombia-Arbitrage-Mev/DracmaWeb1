# DRACMA Web

Frontend React/Vite para la preventa de DRACMA en BNB Smart Chain, con backend local para crear invoices de NOWPayments y recibir IPN de pagos.

## Desarrollo local

1. Instala dependencias:
   `npm install`
2. Crea un `.env.local` usando `.env.example` como referencia.
3. Levanta el API:
   `npm run api`
4. En otra terminal, levanta el frontend:
   `npm run dev`

Vite redirige `/api` a `http://localhost:8787`.

## Servidor

Servidor actual: `32.196.242.92`

Usuario SSH validado: `ubuntu`

Llave local: `C:/Users/alain/Desktop/dracma/DracmaWeb1/dracma.pem`

Conexion con keep-alive:

```bash
ssh -i ./dracma.pem \
  -o IdentitiesOnly=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o TCPKeepAlive=yes \
  ubuntu@32.196.242.92
```

Backend desplegado:

- Codigo: `/opt/dracma/api`
- Variables: `/etc/dracma/api.env`
- Store de ordenes: `/var/lib/dracma/payments.json`
- Servicio: `dracma-api.service`
- Puerto interno: `8787`

Comandos utiles:

```bash
sudo systemctl status dracma-api.service
sudo systemctl restart dracma-api.service
sudo journalctl -u dracma-api.service -f
curl http://127.0.0.1:8787/api/health
```

Para que NOWPayments pueda llamar el webhook, abre en AWS/Security Group el inbound TCP `8787` hacia el servidor o publica el servicio detras de nginx en `80/443`.

## Variables principales

- `NOWPAYMENTS_API_KEY`: clave privada de API. Solo servidor.
- `NOWPAYMENTS_IPN_SECRET`: secreto para verificar `x-nowpayments-sig`.
- `NOWPAYMENTS_IPN_CALLBACK_URL`: URL publica del webhook `/api/webhooks/nowpayments`.
- `BASE_TOKEN_PRICE_USD`: precio inicial por token. Valor actual: `0.10`.
- `PRICE_STEP_TOKENS`: tamano de cada tramo. Valor actual: `100000`.
- `PRICE_STEP_INCREASE_RATE`: incremento por tramo. Valor actual: `0.10` = 10%.
- `QUOTE_HOLD_MINUTES`: minutos durante los que una orden abierta reserva tokens para el calculo del siguiente precio.
- `MAX_SALE_TOKENS`: inventario maximo de tokens disponibles en preventa. Valor actual recomendado: `400000000`.
- `SALE_TOKEN_ADDRESS`: token vendido en BNB Smart Chain. Valor actual: `0x8A9f07fdBc75144C9207373597136c6E280A872D`.
- `TOKEN_DISTRIBUTION_MODE`: `disabled`, `erc20-transfer` o `contract`.

## Flujo de pago

1. El usuario conecta wallet, cambia a BNB Smart Chain e indica la wallet BSC/EVM donde quiere recibir los tokens.
2. El frontend envia wallet conectada, wallet receptora y cantidad de tokens a `POST /api/payments/nowpayments`.
3. El backend valida ambas wallets, recalcula el total USD por tramos y crea un invoice en NOWPayments.
4. NOWPayments envia IPN a `POST /api/webhooks/nowpayments`.
5. El webhook valida HMAC SHA-512, monto y orden.
6. Solo con `payment_status=finished` se intenta liberar tokens.

## Precio dinamico

El precio inicia en `$0.10` y sube 10% por cada `100,000` tokens vendidos o reservados por invoices activos. Si una compra cruza un limite de tramo, el backend calcula un precio ponderado. Ejemplo: si quedan `10,000` tokens a `$0.10` y el usuario compra `20,000`, los primeros `10,000` se cobran a `$0.10` y los siguientes `10,000` a `$0.11`.

## Control de tokens vendidos

El backend es la fuente de verdad del inventario de preventa. Cada orden creada reserva tokens en `/var/lib/dracma/payments.json` con estado `creating_invoice` o `invoice_created`; solo un IPN valido de NOWPayments con `payment_status=finished` pasa esos tokens a vendidos y permite la distribucion. Los estados `failed`, `expired` y `refunded` no cuentan como vendidos ni reservados.

La API rechaza con HTTP `409` cualquier cotizacion u orden que supere `MAX_SALE_TOKENS`. Las reservas se calculan dentro de una transaccion local del store para evitar que dos compras simultaneas lean el mismo contador.

Endpoints utiles:

- `GET /api/presale/pricing`: estado del tramo actual.
- `GET /api/presale/ledger`: tokens vendidos, reservados, disponibles e inventario total.
- `POST /api/presale/quote`: cotizacion para una cantidad de tokens.

## Distribucion de tokens

Para produccion, configura uno de estos modos:

- `erc20-transfer`: la wallet de `TOKEN_DISTRIBUTOR_PRIVATE_KEY` transfiere `SALE_TOKEN_ADDRESS` a la wallet receptora indicada en la orden.
- `contract`: llama `TOKEN_DISTRIBUTOR_FUNCTION(recipient, amount, orderId)` en `TOKEN_DISTRIBUTOR_CONTRACT_ADDRESS`.

En `disabled`, el webhook registra el pago como pendiente de distribucion sin enviar tokens.
