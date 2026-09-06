# Clickable preview of the storefront

One portable HTML file that walks the whole shop — catalogue, product page,
basket, size guide, shipping, about, contact — with no server and no network.

```bash
node store-preview/build.mjs
```

It reads the **real** stylesheet (`styles/store.css`) and uses the same class
names the React components do, so the preview and the deployed site stay in
step: restyle the site and rebuild, and the preview follows. Product photos are
inlined as base64, so the file opens from disk or behind a plain link.

What differs from the deployed site, and only this:

| | Deployed `/store` | This preview |
| --- | --- | --- |
| Products | Supabase | `design-directions/catalog.json` |
| Stock | `product_variants` rows | a fixed table in `build.mjs` |
| Checkout | Stripe | a notice |
| Accounts | Supabase Auth | not included |

Everything else — filtering, sorting, search, size selection, the basket and its
totals, free-shipping threshold, low-stock warnings — is the same behaviour.

The build refuses to emit a page whose inline script does not parse, or that
carries document tags (`<html>`, `<body>`) the artifact publisher supplies.
