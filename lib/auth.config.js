// The edge-safe half of the NextAuth config: no bcrypt, no Netlify Blobs, so
// it is cheap to import from middleware. lib/auth.js spreads this and adds
// the actual providers, which do need Node.
export const authConfig = {
    pages: { signIn: '/login' },
    session: { strategy: 'jwt' },
    // Netlify's request doesn't look like Vercel's to NextAuth's host
    // detection, so without this every callback URL resolves to localhost.
    trustHost: true,
    providers: [],
    callbacks: {
        async jwt({ token, user }) {
            if (user?.email) token.email = user.email;
            if (user?.name) token.name = user.name;
            if (user?.image) token.picture = user.image;
            return token;
        },
        async session({ session, token }) {
            if (token?.email) session.user.email = token.email;
            if (token?.name) session.user.name = token.name;
            if (token?.picture) session.user.image = token.picture;
            return session;
        }
    }
};
