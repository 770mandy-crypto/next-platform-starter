// Admin sign-in. Only a SHA-256 digest of the code is kept here, so the code
// itself does not appear in the source. This is a game lock, not real security.
const DIGEST = '18a61150baf58ebff5cc32f361aa7f80a66c34d24097e395b96f9d45d313ba7f';

export async function checkAdminCode(code) {
    if (!globalThis.crypto?.subtle || typeof code !== 'string') return false;
    const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim()));
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('') === DIGEST;
}
