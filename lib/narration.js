// Rule-based Hebrew summaries, assembled from the strongest signals.
//
// Deliberately free of imports. These are what the bot says when no Claude key
// is configured, and keeping them dependency-free is also what lets the desktop
// build run on Node's standard library alone — no npm install, which is the
// whole point of that build.

export function formatNumber(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : 'לא זמין';
}

export function fallbackNarration(report) {
    const { overall, technical, fundamental } = report;
    if (!overall) return 'לא הצלחתי להפיק ניתוח עבור הנייר הזה.';

    const allSignals = [...(technical?.signals ?? []), ...(fundamental?.signals ?? [])].filter(
        (item) => item.impact !== null
    );
    const positives = allSignals
        .filter((item) => item.impact > 0.25)
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 2);
    const negatives = allSignals
        .filter((item) => item.impact < -0.15)
        .sort((a, b) => a.impact - b.impact)
        .slice(0, 2);

    const oneYear = technical?.metrics?.returns?.oneYear;
    const parts = [`השורה התחתונה על ${report.name} (${report.symbol}): ${overall.verdict}, בציון ${overall.score} מתוך 100.`];

    if (Number.isFinite(oneYear)) {
        parts.push(
            `בשנה האחרונה הנייר ${oneYear >= 0 ? 'עלה' : 'ירד'} ב-${Math.abs(oneYear).toFixed(1)}%.`
        );
    }

    if (positives.length) {
        parts.push(`מה שעובד לטובתו: ${positives.map((item) => item.note).join('; ')}.`);
    }

    if (negatives.length) {
        parts.push(`מה שמדאיג אותי: ${negatives.map((item) => item.note).join('; ')}.`);
    } else {
        parts.push('לא זיהיתי סיגנל שלילי בולט, אבל היעדר דגל אדום הוא לא ערובה לכלום.');
    }

    parts.push('זו אינה המלצת השקעה אישית — קבל החלטות לפי המצב והצרכים שלך.');
    return parts.join(' ');
}

export function fallbackMarketNarration(map) {
    const { breadth, verdict, sectors, vix } = map;
    if (!breadth || !verdict) return 'לא הצלחתי להרכיב תמונת מצב של השוק כרגע.';

    const leader = sectors.find((entry) => entry.ok);
    const laggard = [...sectors].reverse().find((entry) => entry.ok);
    const parts = [`תמונת המצב של השוק: ${verdict.verdict}, בציון ${verdict.score} מתוך 100.`];

    parts.push(
        `${breadth.aboveMa50} מתוך ${breadth.total} הסקטורים נסחרים מעל הממוצע הנע של 50 ימים, כלומר ${
            breadth.participation >= 70
                ? 'העלייה רחבה ומשתתפים בה רוב חלקי השוק'
                : breadth.participation >= 40
                  ? 'ההשתתפות חלקית — חלק מהשוק מוביל וחלק נגרר'
                  : 'ההשתתפות צרה, והשוק נשען על מעט סקטורים'
        }.`
    );

    if (leader && laggard && leader.symbol !== laggard.symbol) {
        parts.push(`${leader.label} מוביל בציון ${leader.score}, בעוד ${laggard.label} מפגר בציון ${laggard.score}.`);
    }

    if (vix?.ok && Number.isFinite(vix.price)) {
        parts.push(
            `ה-VIX עומד על ${vix.price.toFixed(1)} — ${
                vix.price > 28 ? 'רמת פחד גבוהה' : vix.price > 18 ? 'תנודתיות בינונית' : 'שאננות יחסית בשוק'
            }.`
        );
    }

    parts.push('זו אינה המלצת השקעה אישית — קבל החלטות לפי המצב והצרכים שלך.');
    return parts.join(' ');
}
