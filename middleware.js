import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export const middleware = withAuth(
  function middleware(request) {
    const response = NextResponse.next();

    // Add security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    const pathname = request.nextUrl.pathname;
    console.log(
      `[Middleware] ${request.method} ${pathname} - ${new Date().toISOString()}`
    );

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // /auth/* - תמיד מעביר
        if (req.nextUrl.pathname.startsWith("/auth")) {
          return true;
        }
        // /adigo/* - צריך להיות מחובר
        if (req.nextUrl.pathname.startsWith("/adigo")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.svg|images|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};
