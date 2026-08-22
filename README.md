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

## שוקי — Stock Analyst Bot (`/bot`)

A Hebrew-language stock analysis bot. Enter a ticker and it fetches a year of prices plus
company fundamentals, computes the indicators itself, and returns a weighted 0–100 score,
a buy/hold/sell verdict, and a short spoken-language explanation. Enter several tickers and
it ranks them against each other.

### How the score is built

| Layer | Weight | Inputs |
| --- | --- | --- |
| Technical | 40% | Price vs. MA50/MA200, golden/death cross, RSI(14), MACD, position in the 52-week range, annualised volatility, max drawdown |
| Fundamental | 60% | P/E, PEG, revenue & earnings growth, profit margin, ROE, debt-to-equity, current ratio, P/B, dividend yield |

Each signal produces a `-1..1` verdict which is averaged and remapped onto 0–100, where 50
is neutral. Signals whose input is missing are excluded rather than counted as zero, so a
stock with no fundamentals data still gets a valid technical-only score. The bands are:
72+ קנייה חזקה, 60+ קנייה, 45+ החזקה, 33+ מכירה, below that מכירה חזקה.

Every signal keeps the number it came from, so the UI shows its work rather than just a verdict.

### Market map (`/market`)

A whole-market view: the major indices (S&P 500, Nasdaq, Dow, Russell 2000, TA-125) and all
eleven SPDR sector ETFs, each scored by the same technical engine and ranked strongest to
weakest as a heat map.

The headline number is not just the benchmark. It blends the S&P 500's score with **breadth** —
how many sectors are actually above their 50-day moving average — in equal parts, because an
index carried by two or three sectors is a weaker market than its level suggests. The VIX is
shown as a level with a plain-language reading, and is deliberately excluded from both the
breadth maths and the ranking: it measures fear, so scoring it on the same scale would be
backwards.

Indices and ETFs have no company fundamentals, so this page is technical-only and never
touches the cookie+crumb handshake. Results are cached in memory for 60 seconds; `?force=true`
bypasses it.

### Scanner (`/scan`)

Scans a curated universe — 25 to 100 large US names, by preset — and ranks every symbol
by its technical score. Results are sortable by a minimum-score slider, and each symbol
deep-links into `/bot?symbol=X` for the full report.

Netlify functions time out at roughly ten seconds, which a hundred-symbol scan will not fit
inside. So the scan is not one long request: the client walks the universe in batches of 12,
publishing results after each one. That keeps every request well within the timeout, shows
progress as it goes, and makes the scan cancellable mid-run. A batch of 12 completes in
under a second against a local fixture.

The universes are hand-written rather than scraped from an index — a constituent list would
go stale and add its own fetch and its own failure mode to every scan. A test asserts that
every symbol in every universe passes validation and has a Stooq mapping, so a bad ticker
fails at `npm test` rather than silently on every run.

### Endpoints

```
GET /api/analyze?symbol=AAPL                 # full report for one symbol
GET /api/analyze?symbol=AAPL&narrate=false   # skip the verbal summary
GET /api/compare?symbols=AAPL,MSFT,NVDA      # ranked comparison, up to 6 symbols
GET /api/market                              # indices + sectors + breadth
GET /api/market?force=true                   # bypass the 60s cache
GET /api/scan?symbols=AAPL,MSFT,…            # technical-only rows, max 12 per call
GET /api/diag                                # per-stage provider connectivity probe
```

### Configuration

| Variable | Required | Effect |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | No | When set, the verbal summary is written by Claude. Without it a built-in rule-based Hebrew summary is used instead — all numeric analysis works either way. |
| `FINNHUB_API_KEY` | No | Enables fundamentals. Required in practice wherever Yahoo is blocked, which includes most cloud hosts. Free key from finnhub.io. |
| `FUNDAMENTALS_PROVIDER` | No | Pin fundamentals to one provider (`finnhub` or `yahoo`) instead of trying them in order. |
| `FINNHUB_HOST` | No | Point the fundamentals provider at a fixture server for local development or CI. |
| `YAHOO_CHART_HOST` / `YAHOO_QUOTE_HOST` / `YAHOO_COOKIE_HOST` | No | Point the data layer at a fixture server for local development or CI. Defaults to the real Yahoo Finance hosts. |
| `STOOQ_HOST` | No | Same, for the fallback price provider. |
| `PRICE_PROVIDER` | No | Pin prices to one provider (`yahoo` or `stooq`) instead of trying them in order. |

### Price providers and the datacenter-IP problem

Yahoo blocks datacenter IP ranges. The practical consequence is that the price
endpoint works fine from a laptop and can refuse *every* request from a serverless host —
which is exactly what happened on the deploy preview here, taking down both `/bot` and
`/market` even though the market map never touches the fundamentals handshake.

So prices go through a fallback chain (`lib/prices.js`): Yahoo first, because it carries
currency and exchange metadata, then Stooq, which serves plain CSV with no key and no such
blocking. Each report says which provider served it. A genuine 404 does not trigger a
fallback — a symbol that does not exist gets the same answer everywhere, so there is no point
asking twice.

Fundamentals have their own chain (`lib/fundamentals.js`), ordered the **opposite** way:
Finnhub first whenever `FINNHUB_API_KEY` is set, Yahoo only as a fallback. Prices put Yahoo
first because it carries metadata Stooq lacks; fundamentals cannot, because Yahoo's blocked
handshake takes seconds to fail and putting it first would add that delay to every report.

Finnhub's numbers are **not on Yahoo's scale**, and the conversion is the risky part of that
integration: it reports margins, growth and ROE as ready percentages where Yahoo reports
fractions, and debt-to-equity as a ratio (1.45) where Yahoo reports a percentage (145). The
scoring thresholds are calibrated to Yahoo, so `providers/finnhub.js` normalises to that
scale, and a test asserts the same company scores identically through either provider — a
silent mismatch would produce confidently wrong scores rather than an obvious failure.

Limits worth knowing:

- **Stooq has no fundamentals**, and **Finnhub's free tier has no price targets or PEG.**
  Those fields stay null and drop out of the score rather than counting as zero.
- **Stooq has no Tel Aviv mapping.** `^TA125.TA` and `.TA` tickers are declined rather than
  guessed at, so they show as unavailable when Yahoo is unreachable.

`/diag` probes every stage of both providers and prints what the wire returned. It exists
because this failure mode is invisible from a development machine that can reach Yahoo — or,
as here, from one that can reach neither.

Price data comes from Yahoo Finance and needs no API key. Fundamentals go through Yahoo's
cookie+crumb handshake; if that fails the report degrades to technicals only rather than
erroring.

That handshake is the fragile part of the flow, so when it breaks the fundamentals panel
names the stage that failed (cookie, crumb or quoteSummary) and what each Yahoo host
returned, rather than a generic "unavailable". Two things matter for it to work at all:
the cookie request must not follow redirects (Yahoo sets the session cookie on the 30x
itself, and `fetch` only exposes the final response's headers), and every `Set-Cookie` on
that response has to be forwarded, not just the first.

### Tests

```
npm test
```

Covers the indicator math (RSI is checked against Wilder's published worked example), the
scoring engine's behaviour on synthetic up/down trends, symbol validation, and the Yahoo
response parsers against fixture payloads. No network access required.

> The analysis is generated automatically and is not investment advice.

## Resources

- Check out the [Next.js on Netlify docs](https://docs.netlify.com/frameworks/next-js/overview/)
