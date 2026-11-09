import { NextResponse } from 'next/server';
import { getArea } from 'lib/nadlan/dataset';
import { createListing, listingInput } from 'lib/nadlan/listings';
import { announceListing } from 'lib/nadlan/notify';
import { consumeLimit } from 'lib/pilot/auth';
import { getDb } from 'lib/pilot/db';
import { clientIp, HttpError, readJson, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

const PUBLISH_LIMIT = { limit: 5, windowMs: 24 * 60 * 60_000 };

// An owner publishes an apartment. Returns the listing id and the private
// management link (the only way to delete it later).
export const POST = route(async (request) => {
    const body = await readJson(request);
    // Honeypot: a field people never see; bots fill it.
    if (body?.website) throw new HttpError('הבקשה נדחתה.', 400);
    const parsed = listingInput.safeParse(body);
    if (!parsed.success) throw new HttpError(parsed.error.issues[0]?.message ?? 'פרטים חסרים.', 400);

    const area = await getArea(parsed.data.areaId);
    if (!area) throw new HttpError('השכונה לא נמצאה. בחרו שכונה מהרשימה.', 400);
    if (!(await consumeLimit(`matzpen-publish:${clientIp(request)}`, PUBLISH_LIMIT))) {
        throw new HttpError('פרסמתם כבר כמה דירות היום. נסו שוב מחר.', 429);
    }
    const db = await getDb();
    const listing = await createListing(db, parsed.data, area);
    // Followers of the neighborhood hear about it; a mail failure never fails the publish.
    await announceListing(db, listing).catch((error) => console.error('Listing alert failed:', error));
    return NextResponse.json({ id: listing.id, token: listing.editToken, manageUrl: `/matzpen/listings/${listing.id}?token=${listing.editToken}` });
});
