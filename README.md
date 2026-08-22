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

### Endpoints

```
GET /api/analyze?symbol=AAPL          # full report for one symbol
GET /api/analyze?symbol=AAPL&narrate=false   # skip the verbal summary
GET /api/compare?symbols=AAPL,MSFT,NVDA      # ranked comparison, up to 6 symbols
```

### Configuration

| Variable | Required | Effect |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | No | When set, the verbal summary is written by Claude. Without it a built-in rule-based Hebrew summary is used instead — all numeric analysis works either way. |
| `YAHOO_CHART_HOST` / `YAHOO_QUOTE_HOST` / `YAHOO_COOKIE_HOST` | No | Point the data layer at a fixture server for local development or CI. Defaults to the real Yahoo Finance hosts. |

Price data comes from Yahoo Finance and needs no API key. Fundamentals go through Yahoo's
cookie+crumb flow; if that fails the report degrades to technicals only rather than erroring.

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
