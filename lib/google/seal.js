// Encrypts secrets (Google refresh tokens) before they are stored, with
// AES-256-GCM. The key comes from GOOGLE_TOKEN_KEY (32 random bytes, base64),
// set in the site's environment and never stored with the data, so a leaked
// database alone does not reveal anyone's Google access.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export class SealError extends Error {}

export function tokenKey(raw = process.env.GOOGLE_TOKEN_KEY) {
    if (!raw) return null;
    const key = Buffer.from(raw, 'base64');
    return key.length === 32 ? key : null;
}

export function seal(plain, key = tokenKey()) {
    if (!key) throw new SealError('חסר GOOGLE_TOKEN_KEY בהגדרות האתר.');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

export function open(sealed, key = tokenKey()) {
    if (!key) throw new SealError('חסר GOOGLE_TOKEN_KEY בהגדרות האתר.');
    const [version, iv, tag, data] = String(sealed ?? '').split('.');
    if (version !== 'v1' || !iv || !tag || !data) throw new SealError('הערך המוצפן אינו תקין.');
    try {
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
    } catch {
        throw new SealError('לא הצלחתי לפתוח את הערך המוצפן.');
    }
}
