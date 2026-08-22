// Curated scan universes.
//
// Deliberately hand-picked rather than scraped: an index constituent list goes
// stale and would need its own fetch (and its own failure mode) on every scan.
// These are large, liquid US names that Stooq carries under a .us ticker.

export const UNIVERSES = {
    mega: {
        label: 'מגה-קאפ (30)',
        description: 'שלושים החברות הגדולות והנסחרות ביותר בוול סטריט',
        symbols: [
            'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'AVGO', 'TSLA', 'BRK-B', 'LLY',
            'JPM', 'V', 'XOM', 'UNH', 'MA', 'COST', 'HD', 'PG', 'JNJ', 'WMT',
            'NFLX', 'ABBV', 'BAC', 'CRM', 'ORCL', 'CVX', 'MRK', 'KO', 'AMD', 'PEP'
        ]
    },
    tech: {
        label: 'טכנולוגיה (25)',
        description: 'מניות טכנולוגיה, שבבים ותוכנה',
        symbols: [
            'AAPL', 'MSFT', 'NVDA', 'AVGO', 'AMD', 'INTC', 'QCOM', 'TXN', 'MU', 'AMAT',
            'LRCX', 'KLAC', 'ADI', 'CRM', 'ORCL', 'ADBE', 'NOW', 'INTU', 'PANW', 'SNPS',
            'CDNS', 'ANET', 'CSCO', 'IBM', 'ACN'
        ]
    },
    dividend: {
        label: 'דיבידנד ויציבות (25)',
        description: 'חברות בוגרות עם תזרים יציב והיסטוריית חלוקה',
        symbols: [
            'JNJ', 'PG', 'KO', 'PEP', 'MCD', 'WMT', 'CVX', 'XOM', 'MRK', 'ABBV',
            'HD', 'VZ', 'T', 'PFE', 'CSCO', 'IBM', 'MMM', 'CAT', 'HON', 'UNP',
            'LMT', 'RTX', 'DUK', 'SO', 'NEE'
        ]
    },
    broad: {
        label: 'רחב (100)',
        description: 'מאה שמות גדולים מכל הסקטורים — הסריקה הארוכה ביותר',
        symbols: [
            'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'AVGO', 'TSLA', 'BRK-B', 'LLY',
            'JPM', 'V', 'XOM', 'UNH', 'MA', 'COST', 'HD', 'PG', 'JNJ', 'WMT',
            'NFLX', 'ABBV', 'BAC', 'CRM', 'ORCL', 'CVX', 'MRK', 'KO', 'AMD', 'PEP',
            'ADBE', 'TMO', 'LIN', 'CSCO', 'ACN', 'MCD', 'ABT', 'DHR', 'WFC', 'TXN',
            'INTU', 'VZ', 'DIS', 'CAT', 'QCOM', 'AMGN', 'PFE', 'IBM', 'GE', 'NOW',
            'CMCSA', 'UNP', 'SPGI', 'RTX', 'HON', 'NEE', 'LOW', 'AXP', 'BKNG', 'GS',
            'ISRG', 'BLK', 'PGR', 'SYK', 'ETN', 'T', 'TJX', 'MS', 'VRTX', 'LMT',
            'C', 'MDT', 'BSX', 'ADP', 'MU', 'CB', 'ADI', 'SCHW', 'GILD', 'MMC',
            'DE', 'AMAT', 'PLD', 'SBUX', 'CI', 'ELV', 'SO', 'MO', 'DUK', 'ZTS',
            'INTC', 'PANW', 'ANET', 'KLAC', 'LRCX', 'REGN', 'EOG', 'SLB', 'PYPL', 'UBER'
        ]
    }
};

export const DEFAULT_UNIVERSE = 'mega';

// Netlify functions time out at roughly ten seconds, so a scan cannot be one
// long request. The client walks the universe in batches of this size and
// accumulates results, which also lets it show progress.
export const SCAN_BATCH_SIZE = 12;

export function getUniverse(key) {
    return UNIVERSES[key] || UNIVERSES[DEFAULT_UNIVERSE];
}

export function batchSymbols(symbols, size = SCAN_BATCH_SIZE) {
    const batches = [];
    for (let i = 0; i < symbols.length; i += size) batches.push(symbols.slice(i, i + size));
    return batches;
}
