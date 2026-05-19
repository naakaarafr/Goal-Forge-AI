import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;
  // Note: JWT parsing on edge is tricky without jose, so role-based redirects 
  // might be best handled client-side or at API layer if we can't read the role here.

  const isProtectedPath = pathname.startsWith('/employee') || pathname.startsWith('/manager') || pathname.startsWith('/admin') || pathname.startsWith('/dashboard');

  // 1. If trying to access /login or /signup while ALREADY authenticated, just go to root (or we could use a role-aware redirect on client)
  if ((pathname === '/login' || pathname === '/signup') && token) {
    // We don't know their role here. We can redirect to a generic / dispatcher route
    // Or we rely on client-side redirect. Let's send them to /employee/dashboard as a fallback, 
    // or better, a /dispatcher page. For now, /employee/dashboard is safe.
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Protect routes
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/login') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/employee/:path*', '/manager/:path*', '/admin/:path*', '/dashboard/:path*', '/login', '/signup'],
};
