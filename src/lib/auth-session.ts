export interface AuthSession {
  email: string;
  name: string;
  loggedInAt: string;
  token?: string;
  role?: 'admin' | 'user' | 'guest';
}

export const AUTH_SESSION_KEY = 'starbot_session';
export const AUTH_CHANGED_EVENT = 'starbot-auth-changed';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function readAuthSession(): AuthSession | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.email || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession) {
  if (!isBrowser()) return;
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearAuthSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(AUTH_SESSION_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export async function syncServerSession(input: {
  email: string;
  name: string;
  adminCode?: string;
  password?: string;
}): Promise<{ role: 'admin' | 'user'; token: string }> {
  if (!isBrowser()) return { role: 'user', token: '' };

  // Validate against backend
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: input.email,
      name: input.name,
      adminCode: input.adminCode,
      password: input.password,
    }),
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Invalid credentials' : 'Authentication failed');
  }

  const data = (await response.json()) as { role?: 'admin' | 'user'; token: string };
  return { role: data.role === 'admin' ? 'admin' : 'user', token: data.token || '' };
}

export async function clearServerSession() {
  if (!isBrowser()) return;

  // Get token to invalidate on backend
  const session = readAuthSession();

  try {
    // Invalidate on backend
    if (session?.token) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3737';
      await fetch(`${API_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
      });
    }
  } catch {
    // no-op
  }

  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
    });
  } catch {
    // no-op
  }
}
