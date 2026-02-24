import { NextRequest, NextResponse } from 'next/server';
import { getAdminCookieName, verifyAdminCookieToken } from '@/lib/server/admin-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3737';

function resolveConsoleHosts(): Set<string> {
  const configured = String(process.env.ADMIN_CONSOLE_HOSTS || process.env.NEXT_PUBLIC_ADMIN_CONSOLE_HOSTS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length > 0) {
    return new Set(configured);
  }

  return new Set([
    'console.sgauth0.com',
    'www.console.sgauth0.com',
    'console.starbot.cloud',
    'www.console.starbot.cloud',
  ]);
}

const CONSOLE_HOSTS = resolveConsoleHosts();

function normalizeHost(rawHost: string | null): string {
  if (!rawHost) return '';
  return rawHost.split(':')[0].toLowerCase();
}

const ADMIN_COOKIE_NAME = getAdminCookieName();
const SESSION_COOKIE_NAME = 'starbot_auth';

function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/signup';
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
    const response = await fetch(`${API_URL}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${sessionCookie.value}`,
      },
    });

    if (!response.ok) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      redirectResponse.cookies.delete(SESSION_COOKIE_NAME);
      return redirectResponse;
    }
  } catch (e) {
    // Backend unavailable - let through
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
