import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3737';
const SESSION_COOKIE_NAME = 'starbot_auth';

export async function POST(request: Request) {
  const sessionCookie = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split('=')[1];

  if (!sessionCookie) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_URL}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${sessionCookie}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorResponse = NextResponse.json({ error: 'Session invalid' }, { status: 401 });
      errorResponse.cookies.delete(SESSION_COOKIE_NAME);
      return errorResponse;
    }

    // Session is still valid
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Backend unavailable - don't invalidate session, just report error
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
