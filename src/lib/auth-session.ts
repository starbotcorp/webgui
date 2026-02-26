export interface AuthSession {
  email: string;
  name: string;
  loggedInAt: string;
  // Token is NOT stored here - it's in httpOnly cookie for security
  // Including it here would expose it to XSS attacks
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
  // Only store non-sensitive display info in localStorage
  // Token is handled via httpOnly cookie (already set by server)
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
    email: session.email,
    name: session.name,
    loggedInAt: session.loggedInAt,
    role: session.role,
  }));
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

  // Get CSRF token first
  let csrfToken = '';
  try {
    const csrfResponse = await fetch('/api/auth/csrf');
    if (csrfResponse.ok) {
      const csrfData = await csrfResponse.json();
      csrfToken = csrfData.token;
    }
  } catch {
    // CSRF token fetch failed, continue without it
  }

  // Validate against backend
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: JSON.stringify({
      email: input.email,
      name: input.name,
      adminCode: input.adminCode,
      password: input.password,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Invalid credentials' : 'Authentication failed');
  }

  const data = (await response.json()) as { role?: 'admin' | 'user'; token: string };
  return { role: data.role === 'admin' ? 'admin' : 'user', token: data.token || '' };
}

export async function clearServerSession() {
  if (!isBrowser()) return;

  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // no-op
  }
}

// Token refresh mechanism
export async function refreshSession(): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const response = await fetch('/api/auth/session/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      clearAuthSession();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Hook for periodic session refresh
export function useSessionRefresh() {
  if (typeof window === 'undefined') return;

  const interval = setInterval(() => {
    refreshSession();
  }, 5 * 60 * 1000); // Every 5 minutes

  return () => clearInterval(interval);
}
