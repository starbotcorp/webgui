'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const errorMessages: Record<string, { title: string; message: string }> = {
  backend_unavailable: {
    title: 'Service Temporarily Unavailable',
    message: 'The server is currently unavailable. Please try again in a moment.',
  },
  default: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
  },
};

export default function ErrorPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const errorType = searchParams.type || 'default';
  const { title, message } = errorMessages[errorType] || errorMessages.default;

  useEffect(() => {
    // Log the error for debugging
    console.error('Error page displayed:', errorType);
  }, [errorType]);

  const handleRetry = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-amber-100 p-6">
            <AlertTriangle className="h-12 w-12 text-amber-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600 mb-6">{message}</p>
        <Button
          onClick={handleRetry}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
