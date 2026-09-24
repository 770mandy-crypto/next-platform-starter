// Items: validation, persistence, and the public/private split of what a
// listing reveals.

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CATEGORIES, CONDITIONS, STATUSES, cityByName } from './catalog.js';
import { approximate, distanceKm, isCoord } from './geo.js';
import { geocodeAddress } from './geocode.js';
import { data, listJSON, photos } from './store.js';

export class InputError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 1_500_000;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

// Israel and the West Bank with a margin. A GPS fix outside it is almost
// certainly a VPN or a desktop browser guessing, and would rank badly.
function inIsrael({ lat, lng }) {
    return lat > 29.3 && lat < 33.5 && lng > 34.2 && lng < 35.95;
}

const point = z.object({ lat: z.number(), lng: z.number() }).refine(isCoord);

const newItemSchema = z.object({
    title: z.string().trim().min(2, 'כותרת קצרה מדי').max(80, 'כותרת ארוכה מדי'),
    description: z.string().trim().max(1000, 'תיאור ארוך מדי').default(''),
    category: z.enum(CATEGORIES.map((c) => c.id)),
    condition: z.enum(CONDITIONS.map((c) => c.id)),
    city: z.string().refine((name) => Boolean(cityByName(name)), 'יש לבחור עיר מהרשימה'),
    neighborhood: z.string().trim().max(40).default(''),
    address: z.string().trim().max(120).default(''),
    gps: point.nullable().optional(),
    photos: z.array(z.string()).max(MAX_PHOTOS, `עד ${MAX_PHOTOS} תמונות`).default([])
});

function decodePhoto(dataUrl) {
    const match = DATA_URL.exec(dataUrl);
    if (!match) throw new InputError('קובץ תמונה לא נתמך');
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > MAX_PHOTO_BYTES) throw new InputError('תמונה גדולה מדי');
    return { contentType: match[1], bytes };
}

// Where the item is, best source first: the typed address (if Google can pin it
// to the door), then the phone's GPS, then the city centre.
async function resolveLocation({ city, address, gps }) {
    const cityPoint = cityByName(city);
    if (address) {
        const pinned = await geocodeAddress(`${address}, ${city}`);
        if (pinned && inIsrael(pinned)) return { location: pinned, precise: true };
    }
    if (gps && inIsrael(gps)) return { location: { lat: gps.lat, lng: gps.lng }, precise: true };
    return { location: { lat: cityPoint.lat, lng: cityPoint.lng }, precise: false };
}

export async function createItem(owner, input) {
    const parsed = newItemSchema.safeParse(input);
    if (!parsed.success) throw new InputError(parsed.error.issues[0]?.message ?? 'פרטים חסרים');
    const fields = parsed.data;

    const decoded = fields.photos.map(decodePhoto);
    const { location, precise } = await resolveLocation(fields);

    const id = randomUUID();
    const now = Date.now();
    await Promise.all(
        decoded.map(({ contentType, bytes }, n) => photos().set(`${id}/${n}`, bytes, { metadata: { contentType } }))
    );

    const item = {
        id,
        ownerId: owner.id,
        ownerName: owner.name,
        title: fields.title,
        description: fields.description,
        category: fields.category,
        condition: fields.condition,
        city: fields.city,
        area: fields.neighborhood ? `${fields.neighborhood}, ${fields.city}` : fields.city,
        address: fields.address,
        location,
        precise,
        status: 'available',
        photoCount: decoded.length,
        createdAt: now,
        updatedAt: now
    };
    await data().setJSON(`item/${id}`, item);
    return item;
}

export async function getItem(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) return null;
    return data().get(`item/${id}`, { type: 'json' });
}

export function listItems() {
    return listJSON('item/');
}

export async function setItemStatus(user, id, status) {
    if (!STATUSES[status]) throw new InputError('סטטוס לא מוכר');
    const item = await getItem(id);
    if (!item) throw new InputError('הפריט לא נמצא', 404);
    if (item.ownerId !== user.id) throw new InputError('רק מי שפרסם יכול לעדכן', 403);
    const updated = { ...item, status, updatedAt: Date.now(), givenAt: status === 'given' ? Date.now() : null };
    await data().setJSON(`item/${id}`, updated);
    return updated;
}

export async function getPhoto(itemId, n) {
    const hit = await photos().getWithMetadata(`${itemId}/${n}`, { type: 'arrayBuffer' });
    if (!hit) return null;
    return { bytes: hit.data, contentType: hit.metadata?.contentType ?? 'image/jpeg' };
}

// What anyone may see. The exact coordinates and street address stay on the
// server; only the owner gets their own address back.
export function publicItem(item, { viewer = null, origin = null, distance } = {}) {
    const isOwner = viewer?.id === item.ownerId;
    const km = distance !== undefined ? distance : origin ? distanceKm(origin, item.location) : null;
    return {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        condition: item.condition,
        area: item.area,
        approx: approximate(item.location),
        distanceKm: km,
        status: item.status,
        ownerName: item.ownerName,
        photos: Array.from({ length: item.photoCount }, (_, n) => `/api/giveback/photos/${item.id}/${n}`),
        createdAt: item.createdAt,
        isOwner,
        ...(isOwner ? { address: item.address, precise: item.precise } : {})
    };
}
