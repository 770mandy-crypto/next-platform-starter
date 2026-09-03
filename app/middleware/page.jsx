import { ContextAlert } from 'components/context-alert';
import { Markdown } from 'components/markdown';

export const metadata = {
    title: 'Middleware'
};

const explainer = `
[Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware) runs before every request is completed, allowing you to modify the request and response. This is useful for adding security headers, logging, authentication, and more.

This site demonstrates middleware with several features:

- **Security headers**: Every response includes \`X-Frame-Options\`, \`X-Content-Type-Options\`, and \`Referrer-Policy\` headers
- **Request logging**: All requests are logged with timestamp and method
- **Path protection**: \`/admin\` paths require a password; anyone without the admin cookie is redirected to \`/admin/login\`
- **API versioning**: API routes receive an \`X-API-Version\` header

Try accessing [\`/admin\`](/admin) to see the login redirect in action. The password is set via the \`ADMIN_PASSWORD\` environment variable. Check your browser's network inspector to see the security headers on this page's response.
`;

const codeSnippet = `
~~~js
// middleware.js
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, sessionToken } from 'lib/admin-token';

export function middleware(request) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const pathname = request.nextUrl.pathname;

  // Require the admin session cookie for everything under /admin
  const isAdminLoginRoute = pathname === '/admin/login' || pathname === '/api/admin/login';
  if (pathname.startsWith('/admin') && !isAdminLoginRoute) {
    const authed = request.cookies.get(ADMIN_COOKIE)?.value === sessionToken();
    if (!authed) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
~~~
`;

export default function Page() {
    return (
        <>
            <ContextAlert className="mb-6" />
            <h1 className="mb-8">Middleware</h1>
            <Markdown content={explainer} className="mb-8" />
            <Markdown content={codeSnippet} />
        </>
    );
}
