# Amplify + NOWPayments

The production frontend is hosted on AWS Amplify. The browser should call the API through one of these two options.

## Preferred: same-origin Amplify rewrite

In Amplify Console, open the app, then go to **Hosting > Rewrites and redirects** and add this rule before any catch-all rule:

```json
{
  "source": "/api/<*>",
  "target": "https://32.196.242.92.sslip.io/api/<*>",
  "status": "200",
  "condition": null
}
```

Keep `VITE_API_BASE_URL` empty for the branch. The frontend will call `/api/payments/nowpayments`, and Amplify will proxy it to the HTTPS backend.

The frontend also has a defensive fallback to `https://32.196.242.92.sslip.io` when the same-origin `/api` route returns `404`. This keeps NOWPayments usable while the Amplify rewrite is missing or still deploying.

Validate after deployment:

```bash
curl https://dracma.club/api/health
curl https://dracma.club/api/presale/pricing
```

When both return `200`, update the backend IPN callback to the branded URL:

```bash
NOWPAYMENTS_IPN_CALLBACK_URL=https://dracma.club/api/webhooks/nowpayments
PUBLIC_API_URL=https://dracma.club
```

Restart `dracma-api.service` after changing `/etc/dracma/api.env`.

## Alternative: direct API URL

If you do not want an Amplify rewrite, set this public branch environment variable in Amplify:

```bash
VITE_API_BASE_URL=https://32.196.242.92.sslip.io
```

This value is bundled into the client-side JavaScript, so it must never contain secrets. NOWPayments keys stay only in `/etc/dracma/api.env` on the backend.
