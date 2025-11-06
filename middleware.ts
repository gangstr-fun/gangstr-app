import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy basic routes to Pro dashboard
  const legacyBasics = ['/dashboard', '/portfolio', '/settings'];
  if (legacyBasics.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/pro/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// See https://nextjs.org/docs/app/building-your-application/routing/middleware
export const config = {
  matcher: [
    // Protect and/or redirect legacy basic routes
    '/dashboard/:path*',
    '/portfolio/:path*',
    '/settings/:path*',
  ],
};
