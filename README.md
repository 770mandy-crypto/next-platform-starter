# מאיה בוטיק — Maya Boutique

A Hebrew, right-to-left storefront for an independent clothing boutique, built on
Next.js 16 (App Router) and Tailwind CSS, and deployed on Netlify.

The site ships with a working catalog, product pages, a persistent cart and a
contact form. It runs with no configuration at all, and upgrades to a live Shopify
catalog and hosted checkout the moment Storefront credentials are provided.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Home — hero, brand promises, featured products, category shortcuts |
| `/shop` | Full catalog, filterable via `?category=` |
| `/product/[slug]` | Product page with size/colour pickers, quantity and related items |
| `/cart` | Cart with quantity editing, shipping threshold and checkout |
| `/about` | Brand story |
| `/contact` | Contact form (Netlify Forms) plus boutique details |
| `/netlify` and below | The original Netlify platform demos, untouched |

## Where the products come from

`lib/catalog.js` is the single entry point for catalog data:

- **No Shopify credentials** — products are served from `data/products.js`, a local
  catalog of 14 items with Hebrew copy, sizes, colours and ILS prices.
- **Shopify credentials set** — products are fetched live through the Storefront
  API and normalized into the same shape, so no component knows the difference.
- **Shopify unreachable or empty** — the site logs the failure and falls back to the
  local catalog rather than rendering an empty store.

### Enabling Shopify

Copy `.env.example` to `.env.local` and fill in both values:

```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=...
```

Create the token in Shopify admin under **Settings → Apps and sales channels →
Develop apps**, granting the Storefront API scopes
`unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory`
and `unauthenticated_write_checkouts`.

With both set, "מעבר לתשלום" creates a Shopify cart and redirects to Shopify's
hosted checkout. Without them it shows a message pointing shoppers at the contact
page, since there is no real checkout to send them to.

Category mapping is keyword-based (`lib/shopify.js`): a Shopify product is placed in
a boutique category by its product type or tags, in Hebrew or English.

## Project structure

```
app/
  layout.jsx            root shell — <html lang="he" dir="rtl">
  not-found.jsx         branded 404 for unmatched URLs
  (store)/              the boutique — its own layout, header, footer, cart provider
  (netlify)/            the original platform demos, wrapped in an LTR layout
components/store/       storefront components (cart, header, product card, forms)
data/products.js        local catalog
lib/                    catalog source, Shopify client, checkout action, formatters
public/images/products/ generated SVG product imagery
```

The two route groups keep the boutique and the Netlify demos fully separate: the
demos keep their English, left-to-right dark theme, and all boutique styling is
scoped to `.store` in `styles/globals.css`.

## Cart behaviour

The cart is client-side and persisted to `localStorage` under
`maya-boutique-cart`. A line is keyed by product + size + colour, so the same dress
in two sizes is two lines. Cart state is restored after mount, which keeps the
server-rendered markup and the first client render identical.

## Developing locally

```
npm install
npm run dev
```

For Netlify primitives (edge functions, blob store) used by the demo pages, use the
Netlify CLI instead:

```
npm install netlify-cli@latest -g
netlify link
netlify dev
```

## Deploying to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify-templates/next-platform-starter)

Remember to add `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN` to the
site's environment variables if you want the live catalog and checkout.

## Known issue

`npm run lint` does not work in this repo, and did not before this work either:
`next lint` was removed in Next.js 16, and the repo's `.eslintrc.json` is the old
format that ESLint 9 no longer reads. Migrating to a flat `eslint.config.js` would
fix it.

## Resources

- [Next.js on Netlify docs](https://docs.netlify.com/frameworks/next-js/overview/)
- [Shopify Storefront API](https://shopify.dev/docs/api/storefront)
