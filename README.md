# Next.js on Netlify Platform Starter

[Live Demo](https://nextjs-platform-starter.netlify.app/)

A modern starter based on Next.js 16 (App Router), Tailwind, and [Netlify Core Primitives](https://docs.netlify.com/core/overview/#develop) (Edge Functions, Image CDN, Blob Store).

In this site, Netlify Core Primitives are used both implictly for running Next.js features (e.g. Route Handlers, image optimization via `next/image`, and more) and also explicitly by the user code.

Implicit usage means you're using any Next.js functionality and everything "just works" when deployed - all the plumbing is done for you. Explicit usage is framework-agnostic and typically provides more features than what Next.js exposes.

## Deploying to Netlify

Click the button below to deploy this template to your Netlify account.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify-templates/next-platform-starter)

## Developing Locally

1. Clone this repository, then run `npm install` in its root directory.

2. For the starter to have full functionality locally (e.g. edge functions, blob store), please ensure you have an up-to-date version of Netlify CLI. Run:

```
npm install netlify-cli@latest -g
```

3. Link your local repository to the deployed Netlify site. This will ensure you're using the same runtime version for both local development and your deployed site.

```
netlify link
```

4. Then, run the Next.js development server via Netlify CLI:

```
netlify dev
```

If your browser doesn't navigate to the site automatically, visit [localhost:8888](http://localhost:8888).

## Store (Stripe checkout + automatic fulfillment)

This starter includes a working storefront with hands-off shipping:

- Catalog at `/store`, product pages at `/store/[slug]`, cart at `/store/cart`
- Client-side cart (React Context + `localStorage`)
- Real payments via **Stripe Checkout** (`app/api/checkout/route.js`)
- Shipping-address collection + free-shipping option at checkout
- Automatic order fulfillment: paid orders are forwarded to a shipping partner (`lib/fulfillment.js`)

### Enabling real payments

1. Create a [Stripe account](https://dashboard.stripe.com/register) and copy your **secret key** from
   https://dashboard.stripe.com/apikeys (start with the `sk_test_...` key).
2. Copy `.env.example` to `.env.local` and set `STRIPE_SECRET_KEY`.
3. In your deployed Netlify site, add the same `STRIPE_SECRET_KEY` under **Site settings → Environment variables**.

Without a key, checkout runs in **demo mode** (a local confirmation, no charge) so the store works out of the box.

### Promo codes

Checkout has `allow_promotion_codes` enabled. The `LAUNCH` code shown in the site banner is **not** automatic —
create a matching coupon + promotion code named `LAUNCH` in the
[Stripe dashboard](https://dashboard.stripe.com/coupons) so it actually applies at checkout. Remove or edit the
banner text in `components/store/announcement-bar.jsx` if you don't want to run the sale.

### Hands-off order fulfillment (shipping)

You never touch inventory or the post office. When a payment succeeds, Stripe calls our webhook
(`app/api/webhook/route.js`), which forwards the order — items **and** the customer's shipping address — to a
fulfillment partner that picks, packs, and ships directly to the buyer. Pick a partner with the
`FULFILLMENT_PROVIDER` env var:

| `FULFILLMENT_PROVIDER` | What happens | Extra env |
| --- | --- | --- |
| _(unset)_ | **Demo mode** — the order is logged, nothing ships. Works out of the box. | — |
| `webhook` | POSTs the full order to any URL — your supplier's intake endpoint, a 3PL, or an automation like Zapier/Make/n8n. Most flexible. | `FULFILLMENT_WEBHOOK_URL`, optional `FULFILLMENT_WEBHOOK_SECRET` |
| `printful` | Sends the order to **Printful** (print-on-demand — they produce and ship for you). | `PRINTFUL_API_KEY`, plus a `printfulVariantId` on each product in `data/products.json` |

**One-time setup to go live:**

1. **Sign up with a fulfillment partner** (5 minutes). Easiest hands-off options:
   [Printful](https://www.printful.com/) or [Printify](https://printify.com/) for print-on-demand, or a
   dropshipping supplier ([CJ Dropshipping](https://cjdropshipping.com/), [Spocket](https://www.spocket.co/)) wired
   through the `webhook` provider.
2. **Turn on the Stripe webhook** so paid orders are forwarded automatically:
   - In the [Stripe dashboard → Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint pointing to
     `https://YOUR_SITE/api/webhook` and subscribe to the **`checkout.session.completed`** event.
   - Copy the endpoint's **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
   - Locally, forward events with `stripe listen --forward-to localhost:8888/api/webhook`.
3. Set `FULFILLMENT_PROVIDER` (and its env vars from the table) in `.env.local` and in Netlify.

After that, every order flows **customer → Stripe → your fulfillment partner → shipped**, with zero manual work
on your side.

### Managing products

Edit `data/products.json`. Each product has a `price` (USD), catalog metadata, and a `file` that maps to a
deliverable in `public/downloads/`. Prices are read from this file **on the server** at checkout, so the amount
charged can't be tampered with from the browser.

> Note: the files in `public/downloads/` are placeholders and are publicly reachable. For paid products, store the
> real files privately (e.g. Netlify Blobs or S3) and serve them from `/store/success` via short-lived signed URLs
> after verifying the Stripe session.

## Resources

- Check out the [Next.js on Netlify docs](https://docs.netlify.com/frameworks/next-js/overview/)
- [Stripe Checkout docs](https://docs.stripe.com/payments/checkout)
