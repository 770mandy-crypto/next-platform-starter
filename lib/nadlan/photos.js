// Listing photos. Bytes live in their own Netlify Blobs store (the JSON
// database keeps only photo ids on the listing); locally they go to files
// under .data/photos, and tests use memory. The browser shrinks each photo
// before upload, so the server only checks type and size.

import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const MAX_PHOTOS = 8;
export const MAX_BYTES = 2 * 1024 * 1024;

// The real type from the first bytes, never from what the client claims.
export function sniffImage(bytes) {
    const b = new Uint8Array(bytes.slice(0, 12));
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
    const ascii = String.fromCharCode(...b);
    if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
    return null;
}

export const newPhotoId = () => randomBytes(6).toString('base64url');
export const validPhotoId = (id) => /^[\w-]{4,20}$/.test(id ?? '');

function memoryStore() {
    const map = new Map();
    return {
        put: async (key, bytes, type) => void map.set(key, { bytes: Buffer.from(bytes), type }),
        get: async (key) => map.get(key) ?? null,
        remove: async (key) => void map.delete(key)
    };
}

function fileStore(root = path.join(process.cwd(), '.data', 'photos')) {
    const file = (key) => path.join(root, ...key.split('/').map((p) => p.replace(/[^\w-]/g, '_')));
    return {
        async put(key, bytes, type) {
            await fs.mkdir(path.dirname(file(key)), { recursive: true });
            await fs.writeFile(file(key), Buffer.from(bytes));
            await fs.writeFile(`${file(key)}.type`, type);
        },
        async get(key) {
            try {
                return { bytes: await fs.readFile(file(key)), type: await fs.readFile(`${file(key)}.type`, 'utf8') };
            } catch {
                return null;
            }
        },
        async remove(key) {
            await fs.rm(file(key), { force: true });
            await fs.rm(`${file(key)}.type`, { force: true });
        }
    };
}

async function netlifyStore() {
    const { getStore } = await import('@netlify/blobs');
    const store = () => getStore({ name: 'matzpen-photos', consistency: 'strong' });
    return {
        put: (key, bytes, type) => store().set(key, bytes, { metadata: { type } }),
        async get(key) {
            const found = await store().getWithMetadata(key, { type: 'arrayBuffer' });
            return found ? { bytes: Buffer.from(found.data), type: found.metadata?.type ?? 'image/jpeg' } : null;
        },
        remove: (key) => store().delete(key)
    };
}

let cached;
export async function getPhotoStore() {
    if (cached) return cached;
    const pinned = process.env.MASLUL_STORE;
    if (pinned === 'memory') return (cached = memoryStore());
    const blobs = Boolean(globalThis.netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT);
    if (pinned === 'netlify' || (pinned !== 'file' && (blobs || process.env.NODE_ENV === 'production'))) return (cached = await netlifyStore());
    return (cached = fileStore());
}

export const photoKey = (listingId, photoId) => `${listingId}/${photoId}`;
export const photoUrl = (listingId, photoId) => `/api/matzpen/photos/${listingId}/${photoId}`;

export { memoryStore as _memoryStore };
