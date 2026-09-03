// The "downloads a file to my computer" part: the personal watchlist as a
// CSV, sent with a Content-Disposition that makes the browser save it
// instead of rendering it.
import { auth } from 'lib/auth.js';
import { getPortfolio, toCsv } from 'lib/portfolio.js';

export async function GET() {
    const session = await auth();
    if (!session?.user?.email) {
        return new Response('צריך להתחבר קודם.', { status: 401 });
    }

    const holdings = await getPortfolio(session.user.email);
    const csv = toCsv(holdings);

    return new Response(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="my-stocks.csv"'
        }
    });
}
