import { API_BASE_URL } from './config';
import { z } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, public message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Retry logic with exponential backoff for transient failures
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number =3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include', // Include cookies for authentication
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;
      // Don't retry on abort (user cancelled)
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
      // Only retry on network errors, not HTTP errors
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff:1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

async function fetchApi<T>(path: string, options: RequestInit = {}, schema?: z.ZodSchema<T>): Promise<T> {
  const headers = new Headers(options.headers);

  // Only set Content-Type for requests with a body (not DELETE, etc.)
  if (!headers.has('Content-Type') && !(options.body instanceof FormData) && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Authentication is handled via httpOnly cookies (credentials: 'include')
  // No need to manually add Authorization header - it's automatic with cookies

  const url = `${API_BASE_URL}${path}`;
  const response = await fetchWithRetry(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorData;
    try {
      errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // ignore
    }
    throw new ApiError(response.status, errorMessage, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new ApiError(response.status, 'Invalid JSON response');
  }

  // DEBUG LOG
  console.log('[API DEBUG]', path, 'response data:', JSON.stringify(data));

  if (schema) {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.log('[API VALIDATION ERROR]', path, 'schema:', schema, 'error:', JSON.stringify(result.error.flatten()));
      throw new ApiError(response.status, 'Response validation failed: ' + JSON.stringify(result.error.flatten()));
    }
    return result.data;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, schema?: z.ZodSchema<T>) => fetchApi<T>(path, { method: 'GET' }, schema),
  post: <T>(path: string, body: any, schema?: z.ZodSchema<T>) => {
    return fetchApi<T>(path, { method: 'POST', body: JSON.stringify(body) }, schema);
  },
  put: <T>(path: string, body: any, schema?: z.ZodSchema<T>) => fetchApi<T>(path, { method: 'PUT', body: JSON.stringify(body) }, schema),
  delete: <T>(path: string) => fetchApi<T>(path, { method: 'DELETE' }),
  patch: <T>(path: string, body: any, schema?: z.ZodSchema<T>) => fetchApi<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, schema),
};
