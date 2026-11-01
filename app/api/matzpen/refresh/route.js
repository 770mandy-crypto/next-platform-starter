import { NextResponse } from 'next/server';
import { getDb } from 'lib/pilot/db';
import { refreshCycle } from 'lib/nadlan/importer';
import { loadDataset } from 'lib/nadlan/dataset';

export const dynamic = 'force-dynamic';
export const maxDuration = 26;

// Runs one refresh cycle on demand (the scheduled function does the same every
// 30 minutes). Protected by MATZPEN_REFRESH_SECRET:
//   POST /api/matzpen/refresh   with header  x-refresh-secret: <secret>
export async function POST(request) {
    const secret = process.env.MATZPEN_REFRESH_SECRET;
    if (!secret || request.headers.get('x-refresh-secret') !== secret) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const result = await refreshCycle({ db: await getDb() });
    await loadDataset({ fresh: true });
    return NextResponse.json(result);
}
