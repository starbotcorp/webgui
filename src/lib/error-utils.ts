import { ApiError } from './api';

/**
 * Extracts a user-friendly error message from an unknown error.
 * Handles ApiError, Error, and unknown error types consistently.
 */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
