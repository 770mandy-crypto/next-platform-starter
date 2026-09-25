import crypto from 'crypto';

const USERS_BLOB_KEY = 'fixnow-users';

export function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

export function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

export async function getUserFromBlob(blobc, email) {
    try {
        const data = await blobc.get(USERS_BLOB_KEY);
        if (!data) return null;
        const users = JSON.parse(data);
        return users[email] || null;
    } catch (error) {
        console.error('Error reading users from blob:', error);
        return null;
    }
}

export async function saveUserToBlob(blobc, email, userData) {
    try {
        let users = {};
        const data = await blobc.get(USERS_BLOB_KEY);
        if (data) {
            users = JSON.parse(data);
        }
        users[email] = userData;
        await blobc.set(USERS_BLOB_KEY, JSON.stringify(users));
        return true;
    } catch (error) {
        console.error('Error saving user to blob:', error);
        return false;
    }
}

export async function getAllUsersFromBlob(blobc) {
    try {
        const data = await blobc.get(USERS_BLOB_KEY);
        if (!data) return {};
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users from blob:', error);
        return {};
    }
}
