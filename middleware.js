import { NextResponse } from "next/server";

// האתר פתוח לכולם ללא הרשמה. כאן רק כותרות אבטחה.
export function middleware() {
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.svg|images|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};
