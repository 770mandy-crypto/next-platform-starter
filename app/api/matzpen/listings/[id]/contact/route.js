import { NextResponse } from 'next/server';
import { formatPrice } from 'components/matzpen/format';
import { getListing, recordContact, whatsappLink } from 'lib/nadlan/listings';
import { consumeLimit } from 'lib/pilot/auth';
import { getDb } from 'lib/pilot/db';
import { clientIp, HttpError, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

// Phone numbers are handed out one listing at a time and rate limited, so
// they cannot be scraped from the listing pages.
const CONTACT_LIMIT = { limit: 30, windowMs: 60 * 60_000 };

export const POST = route(async (request, { params }) => {
    const { id } = await params;
    const db = await getDb();
    const listing = await getListing(db, id);
    if (!listing) throw new HttpError('המודעה לא נמצאה.', 404);
    if (!(await consumeLimit(`matzpen-contact:${clientIp(request)}`, CONTACT_LIMIT))) {
        throw new HttpError('יותר מדי בקשות. נסו שוב בעוד שעה.', 429);
    }
    await recordContact(db, listing);
    const text = `שלום ${listing.ownerName}, ראיתי במצפן נדל״ן את הדירה שלך ב${listing.areaName}, ${listing.cityName} (${listing.rooms} חד׳, ${formatPrice(listing.price)}). אשמח לפרטים.`;
    return NextResponse.json({ name: listing.ownerName, phone: listing.phone, whatsapp: whatsappLink(listing.phone, text) });
});
