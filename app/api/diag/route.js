// Diagnostic probe for the Yahoo Finance data path.
//
// This exists because the development sandbox cannot reach Yahoo at all, so a
// failure that only reproduces on the deployed host is otherwise invisible.
// It deliberately uses raw fetches rather than lib/yahoo.js so it reports what
// the wire actually returned, not what the wrapper made of it.
//
// It reports Yahoo request outcomes only — no credentials, no environment
// values. Safe to remove once the data path is confirmed healthy.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*', 'Accept-Language': 'en-US,en;q=0.9' };

async function probe(name, url, options = {}) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(url, {
            headers: HEADERS,
            cache: 'no-store',
            signal: controller.signal,
            ...options
        });
        const body = await response.text();
        const setCookie =
            typeof response.headers.getSetCookie === 'function'
                ? response.headers.getSetCookie()
                : [response.headers.get('set-cookie')].filter(Boolean);

        return {
            name,
            url,
            ok: response.ok,
            status: response.status,
            ms: Date.now() - started,
            contentType: response.headers.get('content-type'),
            server: response.headers.get('server'),
            setCookieCount: setCookie.length,
            setCookieNames: setCookie.map((value) => value.split('=')[0].trim()),
            // The body prefix is the most informative field: a datacenter-IP
            // block or a rate limit answers with an HTML page, not JSON.
            bodyPrefix: body.slice(0, 220).replace(/\s+/g, ' ')
        };
    } catch (error) {
        return {
            name,
            url,
            ok: false,
            status: null,
            ms: Date.now() - started,
            error: error.name === 'AbortError' ? 'timeout after 12s' : `${error.name}: ${error.message}`
        };
    } finally {
        clearTimeout(timer);
    }
}

export async function GET() {
    const steps = [];

    // 1. Plain price fetch — the endpoint everything else depends on.
    steps.push(await probe('chart / AAPL', 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1mo&interval=1d'));

    // 2. Same endpoint with a caret symbol, which the market map relies on.
    steps.push(
        await probe('chart / ^GSPC (index)', 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1mo&interval=1d')
    );

    // 3. Each cookie source, unfollowed, so the Set-Cookie on a 30x is visible.
    for (const host of ['https://fc.yahoo.com', 'https://finance.yahoo.com', 'https://login.yahoo.com']) {
        steps.push(await probe(`cookie / ${host}`, host, { redirect: 'manual' }));
    }

    // 4. Crumb, using whatever cookie step 3 managed to collect.
    const cookieStep = steps.find((step) => step.name.startsWith('cookie') && step.setCookieCount > 0);
    const cookieHeader = cookieStep ? cookieStep.setCookieNames.map((name) => `${name}=probe`).join('; ') : null;
    steps.push(
        await probe(
            `crumb ${cookieHeader ? '(with cookie)' : '(no cookie available)'}`,
            'https://query1.finance.yahoo.com/v1/test/getcrumb',
            cookieHeader ? { headers: { ...HEADERS, Cookie: cookieHeader } } : {}
        )
    );

    // 5. Fundamentals, which needs a valid crumb — expected to fail without one.
    steps.push(
        await probe(
            'quoteSummary / AAPL (no crumb)',
            'https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=price'
        )
    );

    // 6. Fallback providers. Yahoo blocks datacenter IPs, so when it refuses
    // every request the question becomes which alternative this host can reach.
    steps.push(await probe('stooq / aapl.us (fallback)', 'https://stooq.com/q/d/l/?s=aapl.us&i=d'));
    steps.push(await probe('stooq / ^spx (fallback index)', 'https://stooq.com/q/d/l/?s=%5Espx&i=d'));

    const chartWorks = steps[0].ok && steps[0].bodyPrefix?.includes('chart');
    const anyCookie = steps.some((step) => step.setCookieCount > 0);
    const stooqStep = steps.find((step) => step.name.startsWith('stooq / aapl'));
    const stooqWorks = Boolean(stooqStep?.ok && stooqStep.bodyPrefix?.toLowerCase().startsWith('date'));

    return NextResponse.json({
        verdict: chartWorks
            ? anyCookie
                ? 'Prices reachable and a cookie was issued — the crumb exchange is the remaining suspect.'
                : 'Prices reachable but NO cookie from any Yahoo host — fundamentals cannot work.'
            : stooqWorks
              ? 'Yahoo is blocked from this host, but Stooq works — prices will be served by the fallback, and fundamentals need an API-key provider.'
              : 'Neither Yahoo nor Stooq is reachable from this host — an API-key provider is required.',
        chartWorks,
        anyCookie,
        stooqWorks,
        runtime: {
            region: process.env.AWS_REGION || process.env.NETLIFY_REGION || null,
            node: process.version,
            context: process.env.CONTEXT || null
        },
        steps,
        generatedAt: new Date().toISOString()
    });
}
