# Four directions for the AM storefront

Four complete takes on the same shop, so the look can be chosen by using it
rather than by describing it. Every direction carries the same six products,
the same photography and a working cart — only the design language changes.

| Direction | The idea |
| --- | --- |
| `am-raw.html` | Streetwear. Near-black ground, one signal orange, headline type in outline at display size, cart as a full-screen takeover. |
| `am-journal.html` | Fashion magazine. Cool paper, a Hebrew serif at display size, the six garments walked in order as looks 01–06, cart in a side drawer. |
| `am-spec.html` | Technical document. Visible hairline grid, typewriter face, each garment stated as measured data — fabric, weight in g/m², chest and length in cm. Cart is an order manifest. |
| `am-shop.html` | Built to buy from. Dense grid on screen immediately, filter rail that stays put, size chosen on the card, a bar along the bottom that always shows the basket total. |

## Building

```bash
node design-directions/build.mjs
```

Each page is written next to the script as one self-contained file: the product
photos are inlined as base64, so a page opens with no server and no network.
The build refuses to emit a page whose inline script does not parse, whose
markup is missing an id that script reaches for, or that carries document tags
(`<html>`, `<body>`) — the artifact publisher supplies those.

## Where the pieces live

- `core.mjs` — product data (read from `catalog.json` and `../public/store/images`),
  the cart engine every direction shares, and the base reset.
- `style-raw.mjs`, `style-journal.mjs`, `style-spec.mjs`, `style-shop.mjs` — one
  direction each: its own palette, type pairing, markup and cart presentation.
- `build.mjs` — renders and validates all four.

The shared cart is the only contract between them. A direction reads `PRODUCTS`,
calls `addToCart` / `setLineQty` / `removeLine`, and redraws on the `am:cart`
event; anything carrying `data-cart-count` or `data-cart-total` is kept current
for it. Everything else — layout, palette, typography, how the cart appears — is
the direction's own.

## Not a checkout

These are presentation builds. The cart persists in the browser, but payment
runs only in the Next.js store under `/store`, which is wired to Stripe.
