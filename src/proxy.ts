import { NextRequest, NextResponse } from 'next/server';
import { getAdminCookieName, verifyAdminCookieToken } from '@/lib/server/admin-cookie';
import { getConsoleHosts } from '@/lib/console-hosts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3737';
const CONSOLE_HOSTS = getConsoleHosts();

function normalizeHost(rawHost: string | null): string {
  if (!rawHost) return '';
  return rawHost.split(':')[0].toLowerCase();
}

const ADMIN_COOKIE_NAME = getAdminCookieName();
const SESSION_COOKIE_NAME = 'starbot_auth';

function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/signup' || pathname === '/error';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths for all hosts
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check if this is a console host (admin area)
  const host = normalizeHost(request.headers.get('host'));
  const isConsoleHost = CONSOLE_HOSTS.has(host);

  if (isConsoleHost) {
    // Console host: check admin cookie
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isAdmin = await verifyAdminCookieToken(token);

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      url.searchParams.set('next', nextPath);
      return NextResponse.redirect(url);
    }

    if (isAdmin && pathname === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (isAdmin && pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // Non-console host: check auth token
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // No session? Redirect to login
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token with backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${API_URL}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${sessionCookie.value}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      redirectResponse.cookies.delete(SESSION_COOKIE_NAME);
      return redirectResponse;
    }
  } catch (e) {
    // Backend unavailable - redirect to error page, don't let through
    const errorUrl = new URL('/error', request.url);
    errorUrl.searchParams.set('type', 'backend_unavailable');
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
