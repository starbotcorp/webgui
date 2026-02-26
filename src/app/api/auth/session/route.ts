import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  evaluateAdmin,
  getAdminCookieName,
  issueAdminCookieToken,
} from '@/lib/server/admin-cookie';

const CSRF_COOKIE_NAME = 'csrf_token';

const SessionBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  adminCode: z.string().optional(),
  password: z.string().optional(),
});

const ADMIN_COOKIE_NAME = getAdminCookieName();
const SESSION_COOKIE_NAME = 'starbot_auth';

// Backend API URL - use environment or default to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3737';

// Resolve API URL correctly (handle relative paths like /v1)
function resolveApiUrl(endpoint: string): string {
  // If API_URL is a full URL, append the endpoint
  if (API_URL.startsWith('http')) {
    return `${API_URL}${endpoint}`;
  }
  // If API_URL is a relative path like /v1 and endpoint starts with it, use endpoint directly
  // (nginx proxies /v1/* to the API)
  if (endpoint.startsWith(API_URL)) {
    return endpoint;
  }
  // Otherwise just use the endpoint directly
  return endpoint;
}

// CSRF validation helper - uses async cookies() from next/headers
async function validateCsrfToken(headerToken: string | null): Promise<boolean> {
  if (!headerToken) return false;

  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);

  if (!cookie) return false;

  // Timing-safe comparison
  const cookieValue = cookie.value;
  if (cookieValue.length !== headerToken.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < cookieValue.length; i++) {
    diff |= cookieValue.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }

  return diff === 0;
}

export async function POST(request: Request) {
  // Validate CSRF token for security
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!await validateCsrfToken(csrfHeader)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  let body: z.infer<typeof SessionBodySchema>;
  try {
    body = SessionBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 });
  }

  // Password is ALWAYS required - no exceptions
  if (!body.password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  // Verify against backend API
  let isValidUser = false;
  let backendRole = 'user';
  let backendToken = '';

  try {
    const apiResponse = await fetch(resolveApiUrl('/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      isValidUser = true;
      backendRole = 'user';
      backendToken = data.token || '';
    } else {
      // Password provided but auth failed - reject login
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (e) {
    // Backend not available - reject login
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }

  // Check admin allowlist (only after password validation passes)
  const isAdmin = evaluateAdmin(body.email, body.adminCode);
  const role = isAdmin ? 'admin' : 'user';
  const response = NextResponse.json({ role, token: backendToken });

  // Set session cookie for server-side auth verification
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: backendToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  if (isAdmin) {
    const token = await issueAdminCookieToken(body.email);
    if (token) {
      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8,
      });
    }
  } else {
    response.cookies.delete(ADMIN_COOKIE_NAME);
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
