// Scoring engine. Turns raw prices and fundamentals into named signals, two
// sub-scores and one verdict. Every signal carries the number it was derived
// from so the UI (and the bot's narration) can show its work.

import {
    annualisedVolatility,
    macd,
    maxDrawdown,
    percentChange,
    rangePosition,
    relativeStrengthIndex,
    simpleMovingAverage
} from './indicators.js';

// Each signal contributes `weight` points scaled by a -1..1 verdict, then the
// total is mapped back onto 0..100 with 50 as neutral.
function scoreFromSignals(signals) {
    const weighted = signals.filter((signal) => signal.impact !== null);
    if (!weighted.length) return null;

    const totalWeight = weighted.reduce((sum, signal) => sum + signal.weight, 0);
    const achieved = weighted.reduce((sum, signal) => sum + signal.impact * signal.weight, 0);
    return Math.round(clamp(50 + (achieved / totalWeight) * 50, 0, 100));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// Relative importance is expressed by scaling `impact` at each call site, so
// every signal carries the same base weight here.
function signal(label, value, impact, note, weight = 1) {
    return { label, value, impact, note, weight };
}

export function analyseTechnicals(candles) {
    const closes = candles.map((candle) => candle.close);
    const price = closes[closes.length - 1];

    const ma50 = simpleMovingAverage(closes, 50);
    const ma200 = simpleMovingAverage(closes, 200);
    const rsi = relativeStrengthIndex(closes, 14);
    const macdResult = macd(closes);
    const volatility = annualisedVolatility(closes);
    const drawdown = maxDrawdown(closes);
    const position = rangePosition(closes);

    const returns = {
        oneMonth: closes.length > 21 ? percentChange(closes[closes.length - 22], price) : null,
        threeMonths: closes.length > 63 ? percentChange(closes[closes.length - 64], price) : null,
        oneYear: percentChange(closes[0], price)
    };

    const signals = [];

    signals.push(
        signal(
            'מגמה מול ממוצע 50',
            ma50,
            ma50 === null ? null : clamp(percentChange(ma50, price) / 10, -1, 1),
            ma50 === null
                ? 'אין מספיק היסטוריה'
                : price >= ma50
                  ? 'המחיר מעל הממוצע הנע הקצר — מומנטום חיובי'
                  : 'המחיר מתחת לממוצע הנע הקצר — חולשה בטווח הקצר'
        )
    );

    signals.push(
        signal(
            'מגמה מול ממוצע 200',
            ma200,
            ma200 === null ? null : clamp(percentChange(ma200, price) / 20, -1, 1),
            ma200 === null
                ? 'אין מספיק היסטוריה (נדרשת שנה מלאה)'
                : price >= ma200
                  ? 'המחיר מעל הממוצע הנע הארוך — מגמת עלייה מבנית'
                  : 'המחיר מתחת לממוצע הנע הארוך — מגמת ירידה מבנית'
        )
    );

    if (ma50 !== null && ma200 !== null) {
        const golden = ma50 >= ma200;
        signals.push(
            signal(
                golden ? 'צלב זהב' : 'צלב מוות',
                percentChange(ma200, ma50),
                golden ? 0.6 : -0.6,
                golden
                    ? 'ממוצע 50 מעל ממוצע 200 — מבנה מגמה שורי'
                    : 'ממוצע 50 מתחת לממוצע 200 — מבנה מגמה דובי'
            )
        );
    }

    signals.push(signal('RSI (14)', rsi, rsiImpact(rsi), rsiNote(rsi)));

    if (macdResult) {
        const bullish = macdResult.histogram > 0;
        signals.push(
            signal(
                'MACD',
                macdResult.histogram,
                clamp(macdResult.histogram / (Math.abs(macdResult.signal) || 1), -1, 1),
                bullish
                    ? 'קו ה-MACD מעל קו הסיגנל — מומנטום מתחזק'
                    : 'קו ה-MACD מתחת לקו הסיגנל — מומנטום נחלש'
            )
        );
    }

    signals.push(
        signal(
            'מיקום בטווח השנתי',
            position,
            position === null ? null : clamp((position - 50) / 50, -1, 1) * 0.5,
            position === null
                ? 'לא זמין'
                : position > 80
                  ? 'נסחרת קרוב לשיא השנתי — חוזק, אך גם פחות מרווח ביטחון'
                  : position < 20
                    ? 'נסחרת קרוב לשפל השנתי — חולשה, אך אפשרי ערך'
                    : 'נסחרת באמצע הטווח השנתי'
        )
    );

    // Risk signals are capped at a mild negative: high volatility is a caution,
    // not a sell thesis on its own.
    signals.push(
        signal(
            'תנודתיות שנתית',
            volatility,
            volatility === null ? null : -clamp((volatility - 25) / 50, 0, 1) * 0.6,
            volatility === null
                ? 'לא זמין'
                : volatility > 45
                  ? 'תנודתיות גבוהה מאוד — סיכון משמעותי'
                  : volatility > 25
                    ? 'תנודתיות בינונית'
                    : 'תנודתיות נמוכה יחסית'
        )
    );

    signals.push(
        signal(
            'ירידה מקסימלית',
            drawdown,
            drawdown === null ? null : -clamp((drawdown - 15) / 40, 0, 1) * 0.5,
            drawdown === null
                ? 'לא זמין'
                : `הירידה העמוקה ביותר מהשיא בתקופה הנבדקת הייתה ${drawdown.toFixed(1)}%`
        )
    );

    return {
        score: scoreFromSignals(signals),
        signals,
        metrics: {
            price,
            ma50,
            ma200,
            rsi,
            macd: macdResult,
            volatility,
            maxDrawdown: drawdown,
            rangePosition: position,
            returns
        }
    };
}

function rsiImpact(rsi) {
    if (rsi === null) return null;
    // Oversold is an opportunity, overbought is a caution, and the healthy
    // 45-65 band scores best.
    if (rsi < 30) return 0.5;
    if (rsi < 45) return 0.2;
    if (rsi <= 65) return 0.6;
    if (rsi <= 75) return -0.2;
    return -0.7;
}

function rsiNote(rsi) {
    if (rsi === null) return 'אין מספיק היסטוריה';
    if (rsi < 30) return 'מכירת יתר — לעיתים נקודת כניסה, אך לרוב מגיע אחרי חולשה אמיתית';
    if (rsi < 45) return 'מומנטום חלש אך לא קיצוני';
    if (rsi <= 65) return 'מומנטום בריא, לא מתוח';
    if (rsi <= 75) return 'מתקרב לקניית יתר — היזהר מרדיפה אחרי המחיר';
    return 'קניית יתר — סיכון גבוה לתיקון בטווח הקצר';
}

export function analyseFundamentals(fundamentals) {
    if (!fundamentals) return null;

    const signals = [];
    const {
        trailingPE,
        forwardPE,
        pegRatio,
        profitMargin,
        revenueGrowth,
        earningsGrowth,
        returnOnEquity,
        debtToEquity,
        currentRatio,
        dividendYield,
        priceToBook
    } = fundamentals;

    const pe = trailingPE ?? forwardPE;
    signals.push(
        signal(
            'מכפיל רווח (P/E)',
            pe,
            // A negative P/E means the company is losing money — that is a real
            // negative, not a missing value.
            pe === null ? null : pe < 0 ? -0.8 : clamp((30 - pe) / 25, -1, 1),
            pe === null
                ? 'לא זמין (ייתכן שהחברה לא רווחית)'
                : pe < 0
                  ? 'מכפיל שלילי — החברה מפסידה'
                  : pe < 15
                    ? 'תמחור זול יחסית'
                    : pe < 30
                      ? 'תמחור סביר'
                      : 'תמחור יקר — השוק מתמחר צמיחה גבוהה'
        )
    );

    signals.push(
        signal(
            'PEG (מכפיל מול צמיחה)',
            pegRatio,
            pegRatio === null || pegRatio <= 0 ? null : clamp((2 - pegRatio) / 1.5, -1, 1),
            pegRatio === null || pegRatio <= 0
                ? 'לא זמין'
                : pegRatio < 1
                  ? 'מתחת ל-1 — הצמיחה מצדיקה את המכפיל'
                  : 'מעל 1 — המכפיל מקדים את הצמיחה'
        )
    );

    signals.push(
        signal(
            'צמיחת הכנסות',
            revenueGrowth,
            revenueGrowth === null ? null : clamp(revenueGrowth / 20, -1, 1),
            revenueGrowth === null
                ? 'לא זמין'
                : revenueGrowth > 15
                  ? 'צמיחה חזקה בהכנסות'
                  : revenueGrowth > 0
                    ? 'צמיחה מתונה בהכנסות'
                    : 'ההכנסות מתכווצות'
        )
    );

    signals.push(
        signal(
            'צמיחת רווח',
            earningsGrowth,
            earningsGrowth === null ? null : clamp(earningsGrowth / 25, -1, 1),
            earningsGrowth === null
                ? 'לא זמין'
                : earningsGrowth > 0
                  ? 'הרווח צומח'
                  : 'הרווח מתכווץ'
        )
    );

    signals.push(
        signal(
            'שולי רווח נקי',
            profitMargin,
            profitMargin === null ? null : clamp(profitMargin / 20, -1, 1),
            profitMargin === null
                ? 'לא זמין'
                : profitMargin > 20
                  ? 'רווחיות גבוהה מאוד'
                  : profitMargin > 5
                    ? 'רווחיות סבירה'
                    : profitMargin > 0
                      ? 'רווחיות דקה'
                      : 'החברה מפסידה'
        )
    );

    signals.push(
        signal(
            'תשואה על ההון (ROE)',
            returnOnEquity,
            returnOnEquity === null ? null : clamp(returnOnEquity / 25, -1, 1),
            returnOnEquity === null
                ? 'לא זמין'
                : returnOnEquity > 15
                  ? 'ההנהלה מייצרת תשואה טובה על ההון'
                  : returnOnEquity > 0
                    ? 'תשואה על ההון בינונית'
                    : 'תשואה שלילית על ההון'
        )
    );

    signals.push(
        signal(
            'יחס חוב להון',
            debtToEquity,
            debtToEquity === null ? null : -clamp((debtToEquity - 80) / 120, -0.5, 1),
            debtToEquity === null
                ? 'לא זמין'
                : debtToEquity > 200
                  ? 'מינוף גבוה מאוד — רגישות לריבית ולמיתון'
                  : debtToEquity > 80
                    ? 'מינוף בינוני'
                    : 'מאזן שמרני'
        )
    );

    signals.push(
        signal(
            'יחס שוטף',
            currentRatio,
            currentRatio === null ? null : clamp((currentRatio - 1) / 1.5, -1, 1) * 0.6,
            currentRatio === null
                ? 'לא זמין'
                : currentRatio >= 1.5
                  ? 'נזילות נוחה לטווח הקצר'
                  : currentRatio >= 1
                    ? 'נזילות מספיקה אך לא עודפת'
                    : 'ההתחייבויות השוטפות גדולות מהנכסים השוטפים'
        )
    );

    signals.push(
        signal(
            'מכפיל הון (P/B)',
            priceToBook,
            priceToBook === null || priceToBook <= 0 ? null : clamp((5 - priceToBook) / 4, -1, 1) * 0.5,
            priceToBook === null || priceToBook <= 0
                ? 'לא זמין'
                : priceToBook < 3
                  ? 'מכפיל הון נוח'
                  : 'מכפיל הון גבוה'
        )
    );

    signals.push(
        signal(
            'תשואת דיבידנד',
            dividendYield,
            dividendYield === null ? null : clamp(dividendYield / 4, 0, 1) * 0.4,
            dividendYield === null || dividendYield === 0
                ? 'החברה לא מחלקת דיבידנד'
                : `תשואת דיבידנד של ${dividendYield.toFixed(2)}% בשנה`
        )
    );

    return { score: scoreFromSignals(signals), signals };
}

const VERDICTS = [
    { min: 72, verdict: 'קנייה חזקה', tone: 'strong-buy' },
    { min: 60, verdict: 'קנייה', tone: 'buy' },
    { min: 45, verdict: 'החזקה', tone: 'hold' },
    { min: 33, verdict: 'מכירה', tone: 'sell' },
    { min: 0, verdict: 'מכירה חזקה', tone: 'strong-sell' }
];

// Technicals answer "when", fundamentals answer "what" — the long-horizon
// question gets the heavier weight when both are available.
export function combineScores(technicalScore, fundamentalScore) {
    let composite;
    if (technicalScore !== null && fundamentalScore !== null) {
        composite = Math.round(technicalScore * 0.4 + fundamentalScore * 0.6);
    } else {
        composite = technicalScore ?? fundamentalScore;
    }
    if (composite === null || composite === undefined) return null;

    const { verdict, tone } = VERDICTS.find((entry) => composite >= entry.min);
    return { score: composite, verdict, tone };
}

export function buildReport({ history, fundamentals, fundamentalsError }) {
    const technical = analyseTechnicals(history.candles);
    const fundamental = analyseFundamentals(fundamentals);
    const overall = combineScores(technical.score, fundamental?.score ?? null);

    return {
        symbol: history.symbol,
        name: fundamentals?.name || history.symbol,
        sector: fundamentals?.sector || null,
        industry: fundamentals?.industry || null,
        currency: history.currency,
        exchange: history.exchange,
        // Which provider actually served the prices, so the UI can say so when
        // it is the fallback rather than Yahoo.
        provider: history.provider || null,
        price: history.price,
        previousClose: history.previousClose,
        dayChange:
            history.previousClose && history.price ? percentChange(history.previousClose, history.price) : null,
        fiftyTwoWeekHigh: history.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: history.fiftyTwoWeekLow,
        overall,
        technical,
        fundamental,
        fundamentalsError: fundamental ? null : fundamentalsError || 'נתונים פונדמנטליים לא זמינים',
        analystConsensus: fundamentals
            ? {
                  recommendation: fundamentals.recommendationKey,
                  analysts: fundamentals.numberOfAnalysts,
                  targetPrice: fundamentals.targetMeanPrice,
                  upside:
                      fundamentals.targetMeanPrice && history.price
                          ? percentChange(history.price, fundamentals.targetMeanPrice)
                          : null
              }
            : null,
        raw: fundamentals || null,
        // A downsampled series is enough to draw a sparkline without shipping
        // a year of daily candles to the browser.
        sparkline: sample(history.candles, 80),
        asOf: history.candles[history.candles.length - 1].date,
        generatedAt: new Date().toISOString()
    };
}

function sample(candles, target) {
    if (candles.length <= target) return candles.map((candle) => candle.close);
    const step = candles.length / target;
    const out = [];
    for (let i = 0; i < target; i++) out.push(candles[Math.floor(i * step)].close);
    out.push(candles[candles.length - 1].close);
    return out;
}
