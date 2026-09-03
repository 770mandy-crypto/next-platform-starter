import { providerName } from 'lib/provider-names';
import { ScoreGauge } from './score-gauge';
import { Sparkline } from './sparkline';
import { SaveToPortfolio } from './save-to-portfolio';

const CONSENSUS_LABELS = {
    strong_buy: 'קנייה חזקה',
    buy: 'קנייה',
    hold: 'החזקה',
    underperform: 'תשואת חסר',
    sell: 'מכירה',
    none: 'אין קונצנזוס'
};

export function formatValue(value, { digits = 2, suffix = '' } = {}) {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)} טריליון`;
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)} מיליארד`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)} מיליון`;
    return `${value.toFixed(digits)}${suffix}`;
}

function Change({ value, digits = 2 }) {
    if (!Number.isFinite(value)) return <span className="opacity-50">—</span>;
    const positive = value >= 0;
    return (
        <span className={positive ? 'text-green-400' : 'text-red-400'}>
            {positive ? '▲' : '▼'} {Math.abs(value).toFixed(digits)}%
        </span>
    );
}

function SignalRow({ signal }) {
    const impact = signal.impact;
    const tone =
        impact === null ? 'bg-white/20' : impact > 0.15 ? 'bg-green-400' : impact < -0.15 ? 'bg-red-400' : 'bg-yellow-400';

    return (
        <li className="flex items-start gap-3 py-2 border-b border-white/10 last:border-0">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-semibold">{signal.label}</span>
                    {/* dir="ltr" keeps a leading minus sign attached to the number. */}
                    <span className="text-sm tabular-nums opacity-70" dir="ltr">
                        {formatValue(signal.value)}
                    </span>
                </div>
                <p className="text-sm opacity-70">{signal.note}</p>
            </div>
        </li>
    );
}

function describeSources(report) {
    const parts = [];
    if (report.provider) parts.push(`מחירים מ-${providerName(report.provider)}`);
    const fundamentalsProvider = report.raw?.provider;
    if (fundamentalsProvider) {
        parts.push(`נתוני חברה מ-${providerName(fundamentalsProvider)}`);
    }
    return parts.length ? parts.join(' · ') : 'לא ידוע';
}

function Stat({ label, children }) {
    return (
        <div className="px-3 py-2 rounded bg-white/5">
            <div className="text-xs opacity-60">{label}</div>
            <div className="font-semibold tabular-nums" dir="ltr">
                {children}
            </div>
        </div>
    );
}

export function ReportView({ report }) {
    const { technical, fundamental, overall, analystConsensus } = report;
    const metrics = technical?.metrics ?? {};
    const returns = metrics.returns ?? {};

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-wrap items-start justify-between gap-6 p-6 rounded-lg bg-white/5">
                <div className="min-w-0">
                    {/* Company name, ticker and price are Latin/numeric — force LTR so
                        punctuation and currency codes keep their place, but stay
                        right-aligned to match the surrounding RTL page. */}
                    <div dir="ltr" className="text-right">
                        <h2 className="truncate">{report.name}</h2>
                        <p className="opacity-70">
                            {report.symbol}
                            {report.exchange && ` · ${report.exchange}`}
                            {report.sector && ` · ${report.sector}`}
                        </p>
                    </div>
                    <div className="flex items-baseline gap-3 mt-3">
                        <span className="text-3xl font-bold tabular-nums" dir="ltr">
                            {formatValue(report.price)} {report.currency}
                        </span>
                        <Change value={report.dayChange} />
                    </div>
                    <div className="mt-4 max-w-sm">
                        <Sparkline values={report.sparkline} />
                        <p className="mt-1 text-xs opacity-50">שנה אחרונה · נכון ל-{report.asOf}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <ScoreGauge score={overall?.score} verdict={overall?.verdict} tone={overall?.tone} />
                    <SaveToPortfolio symbol={report.symbol} />
                </div>
            </header>

            {report.narration && (
                <section className="p-6 border rounded-lg border-primary/40 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl" aria-hidden="true">
                            🤖
                        </span>
                        <h3>מה שוקי אומר</h3>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 opacity-70">
                            {report.narration.source === 'claude' ? 'נוסח על ידי Claude' : 'סיכום אוטומטי'}
                        </span>
                    </div>
                    <p className="leading-relaxed">{report.narration.text}</p>
                </section>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="תשואה חודש">
                    <Change value={returns.oneMonth} digits={1} />
                </Stat>
                <Stat label="תשואה 3 חודשים">
                    <Change value={returns.threeMonths} digits={1} />
                </Stat>
                <Stat label="תשואה שנה">
                    <Change value={returns.oneYear} digits={1} />
                </Stat>
                <Stat label="תנודתיות שנתית">{formatValue(metrics.volatility, { digits: 1, suffix: '%' })}</Stat>
                <Stat label="RSI (14)">{formatValue(metrics.rsi, { digits: 1 })}</Stat>
                <Stat label="ממוצע נע 50">{formatValue(metrics.ma50)}</Stat>
                <Stat label="ממוצע נע 200">{formatValue(metrics.ma200)}</Stat>
                <Stat label="ירידה מקסימלית">{formatValue(metrics.maxDrawdown, { digits: 1, suffix: '%' })}</Stat>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="p-6 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <h3>ניתוח טכני</h3>
                        <ScoreGauge score={technical?.score} size={72} />
                    </div>
                    <ul>
                        {technical?.signals?.map((signal) => (
                            <SignalRow key={signal.label} signal={signal} />
                        ))}
                    </ul>
                </section>

                <section className="p-6 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <h3>ניתוח פונדמנטלי</h3>
                        {fundamental && <ScoreGauge score={fundamental.score} size={72} />}
                    </div>
                    {fundamental ? (
                        <ul>
                            {fundamental.signals.map((signal) => (
                                <SignalRow key={signal.label} signal={signal} />
                            ))}
                        </ul>
                    ) : (
                        <p className="opacity-70">{report.fundamentalsError}</p>
                    )}
                </section>
            </div>

            {analystConsensus?.recommendation && (
                <section className="p-6 rounded-lg bg-white/5">
                    <h3 className="mb-3">קונצנזוס אנליסטים בוול סטריט</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Stat label="המלצה">
                            {CONSENSUS_LABELS[analystConsensus.recommendation] || analystConsensus.recommendation}
                        </Stat>
                        <Stat label="מחיר יעד ממוצע">{formatValue(analystConsensus.targetPrice)}</Stat>
                        <Stat label="פוטנציאל מול המחיר">
                            <Change value={analystConsensus.upside} digits={1} />
                        </Stat>
                    </div>
                    {analystConsensus.analysts && (
                        <p className="mt-2 text-xs opacity-50">מבוסס על {analystConsensus.analysts} אנליסטים</p>
                    )}
                </section>
            )}

            <p className="text-xs leading-relaxed opacity-50">
                {/* Name the providers that actually served this report — a fixed
                    "Yahoo Finance" line is wrong whenever a fallback served it. */}
                מקורות הנתונים: {describeSources(report)}. הציון מופק ממודל אוטומטי. אין לראות בניתוח ייעוץ השקעות,
                שיווק השקעות או תחליף לייעוץ אישי המתחשב בנתונים ובצרכים של כל אדם.
            </p>
        </div>
    );
}
