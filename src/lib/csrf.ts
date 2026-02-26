/**
 * CSRF token management for secure form submissions
 */

let cachedToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const response = await fetch('/api/auth/csrf');
    if (!response.ok) {
      throw new Error('Failed to get CSRF token');
    }
    const data = await response.json();
    cachedToken = data.token;
    return cachedToken!;
  } catch (error) {
    console.error('CSRF token fetch failed:', error);
    throw error;
  }
}

export function clearCsrfToken(): void {
  cachedToken = null;
}

export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getCsrfToken();

  const headers = new Headers(options.headers);
  headers.set('x-csrf-token', token);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
