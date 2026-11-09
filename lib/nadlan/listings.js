// Apartments for sale that owners publish on Matzpen themselves. A listing is
// tied to one neighborhood from the dataset, so buyers see it next to that
// neighborhood's score. The owner's phone is never sent with the public
// listing: a buyer asks for it (rate limited) through the contact endpoint.
//
// Storage: matzpen/listing/{id} = { ...public fields, phone, editToken }

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { MAX_BYTES, MAX_PHOTOS, newPhotoId, photoKey, sniffImage, validPhotoId } from './photos.js';
import { z } from 'zod';

const LIFETIME_MS = 60 * 24 * 60 * 60_000; // listings expire after 60 days
// Short, because each server instance has its own copy: a deleted listing
// may show in search for a few seconds (its own page 404s right away).
const CACHE_MS = 10_000;
let cache = null;

// Israeli phone numbers: 05X-XXXXXXX mobile or a landline, also as +972.
export function normalizePhone(raw) {
    let digits = String(raw ?? '').replace(/[^\d+]/g, '');
    if (digits.startsWith('+972')) digits = `0${digits.slice(4)}`;
    else if (digits.startsWith('972')) digits = `0${digits.slice(3)}`;
    return /^0(5\d{8}|[2-9]\d{7})$/.test(digits) ? digits : null;
}

export const listingInput = z.object({
    ownerName: z.string().trim().min(2, 'שם קצר מדי').max(60),
    phone: z.string().transform((v, ctx) => normalizePhone(v) ?? (ctx.addIssue({ code: 'custom', message: 'מספר טלפון לא תקין' }), z.NEVER)),
    areaId: z.string().min(1, 'בחרו שכונה').max(40),
    rooms: z.coerce.number().min(1).max(12),
    sqm: z.coerce.number().int().min(15).max(1000),
    price: z.coerce.number().int().min(100_000, 'מחיר נמוך מדי').max(100_000_000),
    // An empty field means "not given", not ground floor.
    floor: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().int().min(-2).max(80).optional()),
    street: z.string().trim().max(60).optional().default(''),
    description: z.string().trim().max(1500).optional().default(''),
    consent: z.literal(true, { message: 'יש לאשר את התנאים' })
});

export const publicListing = ({ phone, editToken, ...rest }) => rest;

const token = (bytes) => randomBytes(bytes).toString('base64url');

export async function createListing(db, input, area, now = Date.now()) {
    const id = token(6);
    const listing = {
        id,
        areaId: area.id,
        areaName: area.name,
        city: area.city,
        cityName: area.cityName,
        ownerName: input.ownerName,
        phone: input.phone,
        rooms: input.rooms,
        sqm: input.sqm,
        price: input.price,
        pricePerSqm: Math.round(input.price / input.sqm),
        floor: input.floor ?? null,
        street: input.street,
        description: input.description,
        createdAt: now,
        expiresAt: now + LIFETIME_MS,
        contacts: 0,
        photos: [],
        editToken: token(18)
    };
    await db.set(`matzpen/listing/${id}`, listing);
    cache = null;
    return listing;
}

export async function getListing(db, id) {
    if (!/^[\w-]{4,20}$/.test(id ?? '')) return null;
    const listing = await db.get(`matzpen/listing/${id}`);
    return listing && listing.expiresAt > Date.now() ? listing : null;
}

// Constant-time comparison of the owner's management token.
export function tokenMatches(listing, editToken) {
    if (!listing?.editToken || typeof editToken !== 'string') return false;
    const a = Buffer.from(listing.editToken);
    const b = Buffer.from(editToken);
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function deleteListing(db, id, editToken, photoStore) {
    const listing = await db.get(`matzpen/listing/${id}`);
    if (!tokenMatches(listing, editToken)) return false;
    await db.delete(`matzpen/listing/${id}`);
    await Promise.all((listing.photos ?? []).map((p) => photoStore?.remove(photoKey(id, p)).catch(() => {})));
    cache = null;
    return true;
}

export class PhotoError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Adds one photo to a listing (owner only). Returns the listing's photo ids.
export async function addPhoto(db, photoStore, id, editToken, bytes) {
    const listing = await getListing(db, id);
    if (!tokenMatches(listing, editToken)) throw new PhotoError('אין הרשאה לערוך את המודעה.', 403);
    const photos = listing.photos ?? [];
    if (photos.length >= MAX_PHOTOS) throw new PhotoError(`אפשר עד ${MAX_PHOTOS} תמונות למודעה.`);
    if (!bytes?.byteLength || bytes.byteLength > MAX_BYTES) throw new PhotoError('התמונה גדולה מדי.', 413);
    const type = sniffImage(bytes);
    if (!type) throw new PhotoError('אפשר להעלות רק תמונות JPG, PNG או WebP.', 415);
    const photoId = newPhotoId();
    await photoStore.put(photoKey(id, photoId), bytes, type);
    const next = [...photos, photoId];
    await db.set(`matzpen/listing/${id}`, { ...listing, photos: next });
    cache = null;
    return next;
}

export async function removePhoto(db, photoStore, id, editToken, photoId) {
    const listing = await getListing(db, id);
    if (!tokenMatches(listing, editToken)) throw new PhotoError('אין הרשאה לערוך את המודעה.', 403);
    if (!validPhotoId(photoId) || !(listing.photos ?? []).includes(photoId)) throw new PhotoError('התמונה לא נמצאה.', 404);
    const next = listing.photos.filter((p) => p !== photoId);
    await db.set(`matzpen/listing/${id}`, { ...listing, photos: next });
    await photoStore.remove(photoKey(id, photoId));
    cache = null;
    return next;
}

export async function recordContact(db, listing) {
    await db.set(`matzpen/listing/${listing.id}`, { ...listing, contacts: (listing.contacts ?? 0) + 1 });
}

async function allListings(db) {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.list;
    const keys = await db.list('matzpen/listing/');
    const now = Date.now();
    const list = (await Promise.all(keys.map((k) => db.get(k))))
        .filter((l) => l && l.expiresAt > now)
        .map(publicListing)
        .sort((a, b) => b.createdAt - a.createdAt);
    cache = { at: Date.now(), list };
    return list;
}

// Public listings (no phone), newest first, filtered.
export async function searchListings(db, { areaId, city, maxPrice, minRooms, limit = 20 } = {}) {
    let list = await allListings(db);
    if (areaId) list = list.filter((l) => l.areaId === areaId);
    if (city) list = list.filter((l) => l.city === city || l.cityName.includes(city) || city.includes(l.cityName));
    if (maxPrice) list = list.filter((l) => l.price <= maxPrice);
    if (minRooms) list = list.filter((l) => l.rooms >= minRooms);
    return list.slice(0, Math.min(Math.max(limit, 1), 100));
}

export function whatsappLink(phone, text) {
    const intl = `972${phone.replace(/^0/, '')}`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function resetListingsCache() {
    cache = null;
}
