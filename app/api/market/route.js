import { NextResponse } from 'next/server';
import { narrateMarket } from 'lib/bot';
import { fetchMarketMap } from 'lib/market';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const withNarration = request.nextUrl.searchParams.get('narrate') !== 'false';
    const force = request.nextUrl.searchParams.get('force') === 'true';

    try {
        const map = await fetchMarketMap({ force });

        // Every instrument failing means the data source is down, not that the
        // market is quiet — say so rather than rendering an empty board.
        if (!map.breadth && !map.indices.some((entry) => entry.ok)) {
            return NextResponse.json(
                { error: 'לא הצלחתי לשלוף נתוני שוק מ-Yahoo כרגע.', failures: map.failures },
                { status: 502 }
            );
        }

        if (withNarration) {
            map.narration = await narrateMarket(map);
        }

        return NextResponse.json(map);
    } catch (error) {
        console.error('Market map failed:', error);
        return NextResponse.json({ error: 'הפקת מפת השוק נכשלה. נסה שוב בעוד רגע.' }, { status: 500 });
    }
}
