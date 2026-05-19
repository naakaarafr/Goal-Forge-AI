import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  const isProtectedPath = pathname.startsWith('/employee') || pathname.startsWith('/manager') || pathname.startsWith('/admin') || pathname.startsWith('/dashboard');

  // 1. If trying to access /login or /signup while ALREADY authenticated, redirect to home
  if ((pathname === '/login' || pathname === '/signup') && token) {
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
