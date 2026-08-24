// שוקי Desktop — a local stock analyst.
//
// This exists because free market-data providers serve browsers, not cloud
// servers: from a hosted app Yahoo answers 429, so the hosted build needs an API
// key. From a home connection it answers normally, so running here needs no key
// at all — which is the entire reason this build exists.
//
// Two rules shape the code:
//
//   1. No dependencies. Node's standard library only, so there is no
//      `npm install` step between double-clicking and using it.
//   2. The fetch happens in this process, not the browser. Yahoo sends no CORS
//      headers, so a page cannot call it directly however it is served.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { analyseFundamentals, analyseTechnicals, buildReport, combineScores } from '../lib/analysis.js';
import { fallbackNarration } from '../lib/narration.js';
import { fetchFundamentals, fetchPriceHistory, normaliseSymbol } from '../lib/yahoo.js';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4173;

function json(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        'Cache-Control': 'no-store'
    });
    res.end(payload);
}

async function analyse(symbol) {
    // Fundamentals are optional — Yahoo's cookie+crumb handshake is fragile even
    // from a home connection, and a technical-only score is still a real answer.
    const [historyResult, fundamentalsResult] = await Promise.allSettled([
        fetchPriceHistory(symbol),
        fetchFundamentals(symbol)
    ]);

    if (historyResult.status === 'rejected') throw historyResult.reason;

    const report = buildReport({
        history: historyResult.value,
        fundamentals: fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null,
        fundamentalsError:
            fundamentalsResult.status === 'rejected'
                ? 'נתוני החברה לא נטענו — הניתוח מבוסס על מחירים בלבד.'
                : null
    });

    report.narration = { text: fallbackNarration(report), source: 'rules' };
    return report;
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === '/' || url.pathname === '/index.html') {
        const html = await readFile(join(here, 'ui.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
    }

    if (url.pathname === '/api/analyze') {
        const symbol = normaliseSymbol(url.searchParams.get('symbol'));
        if (!symbol) return json(res, 400, { error: 'הזן סימבול תקין, למשל AAPL.' });

        try {
            return json(res, 200, await analyse(symbol));
        } catch (error) {
            const missing = error?.status === 404 || error?.status === 422;
            return json(res, missing ? 404 : 502, {
                error: missing
                    ? `לא מצאתי נתונים עבור ${symbol}. בדוק את הסימבול.`
                    : 'לא הצלחתי להגיע לשירות הנתונים. בדוק את חיבור האינטרנט ונסה שוב.',
                detail: error?.message || null
            });
        }
    }

    // A watchlist: several symbols scored technically, ranked best first.
    if (url.pathname === '/api/watchlist') {
        const symbols = [...new Set((url.searchParams.get('symbols') || '').split(',').map(normaliseSymbol).filter(Boolean))].slice(0, 10);
        if (!symbols.length) return json(res, 400, { error: 'הזן סימבול אחד לפחות.' });

        const rows = await Promise.all(
            symbols.map(async (symbol) => {
                try {
                    const history = await fetchPriceHistory(symbol);
                    const technical = analyseTechnicals(history.candles);
                    const overall = combineScores(technical.score, null);
                    return {
                        symbol,
                        ok: true,
                        price: history.price,
                        currency: history.currency,
                        score: technical.score,
                        verdict: overall?.verdict ?? null,
                        tone: overall?.tone ?? null,
                        returns: technical.metrics.returns,
                        rsi: technical.metrics.rsi
                    };
                } catch (error) {
                    return { symbol, ok: false, error: error?.status === 404 ? 'לא נמצא' : 'שליפה נכשלה' };
                }
            })
        );

        rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
        return json(res, 200, { rows });
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
});

server.listen(PORT, () => {
    console.log(`\n  שוקי רץ:  http://localhost:${PORT}\n`);
    console.log('  לעצירה: סגור את החלון הזה או הקש Ctrl+C\n');
});
