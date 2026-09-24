// Storage for GiveBack, on Netlify Blobs.
//
// Outside Netlify (plain `next dev`, tests) there is no Blobs context, so the
// same interface is served from an in-memory map instead. That keeps the app
// runnable locally with zero setup; the data simply does not survive a restart.

import { getStore } from '@netlify/blobs';

const memory = (globalThis.__givebackMemory ??= new Map());
let warned = false;

function memoryStore(name) {
    if (!memory.has(name)) memory.set(name, new Map());
    const map = memory.get(name);
    return {
        async get(key, { type } = {}) {
            if (!map.has(key)) return null;
            const { data } = map.get(key);
            return type === 'json' ? JSON.parse(data) : data;
        },
        async getWithMetadata(key) {
            return map.has(key) ? map.get(key) : null;
        },
        async setJSON(key, value) {
            map.set(key, { data: JSON.stringify(value), metadata: {} });
        },
        async set(key, data, { metadata = {} } = {}) {
            map.set(key, { data, metadata });
        },
        async delete(key) {
            map.delete(key);
        },
        async list({ prefix = '' } = {}) {
            return { blobs: [...map.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
        }
    };
}

export function store(name) {
    try {
        return getStore({ name, consistency: 'strong' });
    } catch (error) {
        if (error?.name !== 'MissingBlobsEnvironmentError') throw error;
        if (!warned) {
            warned = true;
            console.warn('[giveback] Netlify Blobs unavailable — using in-memory storage (data resets on restart).');
        }
        return memoryStore(name);
    }
}

export const data = () => store('giveback');
export const photos = () => store('giveback-photos');

export async function listJSON(prefix) {
    const s = data();
    const { blobs } = await s.list({ prefix });
    const values = await Promise.all(blobs.map(({ key }) => s.get(key, { type: 'json' })));
    return values.filter(Boolean);
}
