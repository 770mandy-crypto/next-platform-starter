import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// ההתחברות נאכפת רק כשהוגדר Google OAuth. בלי הגדרה האתר פתוח ועובד,
// והנתונים נשמרים בדפדפן של המשתמש.
const authConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.NEXTAUTH_SECRET &&
    !process.env.GOOGLE_CLIENT_ID.includes("YOUR_")
);

function withSecurityHeaders(response) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

const openMiddleware = () => withSecurityHeaders(NextResponse.next());

const guardedMiddleware = withAuth(
  () => withSecurityHeaders(NextResponse.next()),
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/auth")) return true;
        if (req.nextUrl.pathname.startsWith("/adigo")) return Boolean(token);
        return true;
      },
    },
  }
);

export const middleware = authConfigured ? guardedMiddleware : openMiddleware;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.svg|images|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};
