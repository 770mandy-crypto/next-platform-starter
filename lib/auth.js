// Full NextAuth config — only ever imported from Node-runtime code (API
// routes, server components), never from middleware. Two ways in: Google,
// and email+password checked against lib/users.js's Netlify Blobs store.
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';

import { authConfig } from './auth.config.js';
import { upsertOAuthUser, verifyUserCredentials } from './users.js';

export function isGoogleConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const providers = [
    Credentials({
        name: 'אימייל וסיסמה',
        credentials: {
            email: { label: 'אימייל', type: 'email' },
            password: { label: 'סיסמה', type: 'password' }
        },
        authorize: async (credentials) => {
            const email = credentials?.email;
            const password = credentials?.password;
            if (!email || !password) return null;
            return verifyUserCredentials(email, password);
        }
    })
];

// Only registered when keys exist — an unconfigured Google provider would
// otherwise redirect to a Google error page instead of degrading quietly.
if (isGoogleConfigured()) {
    providers.push(Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers,
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account }) {
            // Credentials sign-in already went through verifyUserCredentials;
            // this only needs to run for the OAuth path, to create/refresh the
            // shared user record the portfolio store keys off.
            if (account?.provider === 'google' && user?.email) {
                await upsertOAuthUser({ email: user.email, name: user.name, image: user.image });
            }
            return true;
        }
    }
});
