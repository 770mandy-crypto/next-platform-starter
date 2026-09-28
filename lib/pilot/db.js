// Maslul's storage. One small key-value interface with three backends:
//
//   netlify — Netlify Blobs, used automatically on Netlify (no setup needed).
//   file    — JSON files under .data/, for local development (MASLUL_STORE=file,
//             or any non-production run without Blobs).
//   memory  — in-process, for tests (MASLUL_STORE=memory).
//
// Everything above this file speaks only get/set/create/delete/list (plus
// getVersioned/setIfUnchanged for compare-and-set writes), so moving to
// Postgres later means writing one more backend, not touching the app.
//
// getVersioned returns { value, etag } (etag null when the key is absent), and
// setIfUnchanged writes only if the key still has that etag (null: only if it
// is still absent), returning whether it wrote.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const STORE_NAME = 'maslul';

export class StorageUnavailableError extends Error {
    constructor() {
        super('אחסון הנתונים אינו זמין בשרת. ב-Netlify הוא מוגדר אוטומטית; מקומית הריצו עם MASLUL_STORE=file.');
        this.status = 503;
    }
}

function memoryBackend() {
    const map = new Map();
    const tags = new Map();
    let writes = 0;
    const clone = (value) => (value === undefined ? null : structuredClone(value));
    const put = (key, value) => {
        map.set(key, clone(value));
        tags.set(key, `m${(writes += 1)}`);
    };
    return {
        name: 'memory',
        async get(key) {
            return clone(map.get(key));
        },
        async set(key, value) {
            put(key, value);
        },
        async create(key, value) {
            if (map.has(key)) return false;
            put(key, value);
            return true;
        },
        async getVersioned(key) {
            return map.has(key) ? { value: clone(map.get(key)), etag: tags.get(key) } : { value: null, etag: null };
        },
        async setIfUnchanged(key, value, etag) {
            if ((tags.get(key) ?? null) !== etag) return false;
            put(key, value);
            return true;
        },
        async delete(key) {
            map.delete(key);
            tags.delete(key);
        },
        async list(prefix) {
            return [...map.keys()].filter((key) => key.startsWith(prefix)).sort();
        },
        _clear() {
            map.clear();
            tags.clear();
        }
    };
}

const hashOf = (text) => createHash('sha256').update(text).digest('hex');

function fileBackend(root = path.join(process.cwd(), '.data', STORE_NAME)) {
    // Keys contain "/", which maps onto real directories; encode each segment so
    // no key can climb out of the root.
    const toPath = (key) => path.join(root, ...key.split('/').map((part) => encodeURIComponent(part))) + '.json';
    const fromPath = (file) =>
        path
            .relative(root, file)
            .replace(/\.json$/, '')
            .split(path.sep)
            .map((part) => decodeURIComponent(part))
            .join('/');

    async function walk(dir) {
        let entries = [];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return [];
        }
        const nested = await Promise.all(
            entries.map((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))
        );
        return nested.flat();
    }

    return {
        name: 'file',
        async get(key) {
            try {
                return JSON.parse(await fs.readFile(toPath(key), 'utf8'));
            } catch (error) {
                if (error.code === 'ENOENT') return null;
                throw error;
            }
        },
        async set(key, value) {
            const file = toPath(key);
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, JSON.stringify(value));
        },
        async create(key, value) {
            const file = toPath(key);
            await fs.mkdir(path.dirname(file), { recursive: true });
            try {
                await fs.writeFile(file, JSON.stringify(value), { flag: 'wx' });
                return true;
            } catch (error) {
                if (error.code === 'EEXIST') return false;
                throw error;
            }
        },
        // Local development only: the check and the write are not one atomic
        // step here, which is fine for a single dev server.
        async getVersioned(key) {
            try {
                const text = await fs.readFile(toPath(key), 'utf8');
                return { value: JSON.parse(text), etag: hashOf(text) };
            } catch (error) {
                if (error.code === 'ENOENT') return { value: null, etag: null };
                throw error;
            }
        },
        async setIfUnchanged(key, value, etag) {
            if ((await this.getVersioned(key)).etag !== etag) return false;
            await this.set(key, value);
            return true;
        },
        async delete(key) {
            await fs.rm(toPath(key), { force: true });
        },
        async list(prefix) {
            const files = await walk(root);
            return files.map(fromPath).filter((key) => key.startsWith(prefix)).sort();
        }
    };
}

const UNTAGGED = 'untagged';

async function netlifyBackend() {
    const { getStore } = await import('@netlify/blobs');
    // The Blobs context is attached per request on Netlify, so the store is
    // resolved on each call rather than once at import.
    const store = () => {
        try {
            return getStore({ name: STORE_NAME, consistency: 'strong' });
        } catch (error) {
            console.error('Netlify Blobs unavailable:', error);
            throw new StorageUnavailableError();
        }
    };
    return {
        name: 'netlify',
        async get(key) {
            return (await store().get(key, { type: 'json' })) ?? null;
        },
        async set(key, value) {
            await store().setJSON(key, value);
        },
        async create(key, value) {
            const result = await store().setJSON(key, value, { onlyIfNew: true });
            return result?.modified !== false;
        },
        async getVersioned(key) {
            const found = await store().getWithMetadata(key, { type: 'json' });
            if (!found) return { value: null, etag: null };
            return { value: found.data ?? null, etag: found.etag ?? UNTAGGED };
        },
        async setIfUnchanged(key, value, etag) {
            // Blobs normally reports an etag; without one there is nothing to
            // compare against, so the write goes through as a plain one.
            if (etag === UNTAGGED) return (await this.set(key, value), true);
            const result = await store().setJSON(key, value, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
            return result?.modified !== false;
        },
        async delete(key) {
            await store().delete(key);
        },
        async list(prefix) {
            const { blobs } = await store().list({ prefix });
            return blobs.map((blob) => blob.key).sort();
        }
    };
}

function hasBlobsContext() {
    return Boolean(globalThis.netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT);
}

let memory;
let file;
let netlify;

export async function getDb() {
    const pinned = process.env.MASLUL_STORE;
    if (pinned === 'memory') return (memory ??= memoryBackend());
    if (pinned === 'file') return (file ??= fileBackend());
    // Production always means Blobs: local files on a serverless host vanish
    // between requests, which would silently lose accounts. If Blobs turns out
    // to be unavailable there, the call fails loudly instead.
    if (pinned === 'netlify' || hasBlobsContext() || process.env.NODE_ENV === 'production') {
        return (netlify ??= await netlifyBackend());
    }
    return (file ??= fileBackend());
}

// Test hook: a fresh, empty in-memory store.
export function resetMemoryDb() {
    memory?._clear();
}
