'use client';

import { FormEvent, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, KeyRound, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { syncServerSession, writeAuthSession } from '@/lib/auth-session';
import { isConsoleHost } from '@/lib/console-hosts';
import { toast } from 'sonner';

function subscribeLocation() {
  return () => {};
}

function readIsConsoleHost() {
  if (typeof window === 'undefined') return false;
  return isConsoleHost(window.location.hostname);
}

function normalizeNextPath(value: string | null, fallback: string): string {
  if (!value) return fallback;

  // Must start with single /
  if (!value.startsWith('/')) return fallback;

  // Block double slashes and backslashes
  if (value.startsWith('//') || value.includes('\\')) return fallback;

  // Block URL-like patterns (e.g., /https://evil.com)
  if (/^\/[a-z]+:\/\//i.test(value)) return fallback;

  // Block protocol-relative URLs and dangerous prefixes
  if (value.startsWith('/.') || value.startsWith('/~')) return fallback;

  // Only allow safe characters in path
  if (!/^\/[a-zA-Z0-9\-_/.?=&%]*$/.test(value)) return fallback;

  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const isConsoleHost = useSyncExternalStore(subscribeLocation, readIsConsoleHost, () => false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.trim().length > 0;
  }, [email, password]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    const displayName = email.split('@')[0] || 'User';
    const { role, token } = await syncServerSession({
      name: displayName,
      email: email.trim(),
      adminCode: adminCode.trim() || undefined,
      password: password,
    });

    if (isConsoleHost && role !== 'admin') {
      toast.error('Admin access denied');
      return;
    }

    writeAuthSession({
      name: displayName,
      email: email.trim(),
      loggedInAt: new Date().toISOString(),
      // Token is handled via httpOnly cookie - not stored in localStorage
      role,
    });

    toast.success('Signed in');
    const nextPath = normalizeNextPath(searchParams.get('next'), isConsoleHost ? '/admin' : '/');
    if (isConsoleHost) {
      router.push(nextPath);
      return;
    }
    router.push(nextPath);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(2,132,199,0.16),transparent_45%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-6">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_24px_55px_rgba(15,23,42,0.10)] md:grid-cols-[1.1fr_1fr]">
          <section className="hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-10 text-slate-100 md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Starbot</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight">Welcome back</h1>
              <p className="mt-3 text-sm text-slate-300">
                Sign in to keep your workspace, settings, and diagnostics experience consistent.
              </p>
            </div>
            <p className="text-xs text-slate-300">Built for focused AI workflows</p>
          </section>

          <section className="p-6 sm:p-8">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isConsoleHost
                ? 'Admin access only. Sign in with your allowlisted email and admin code.'
                : 'Use your account credentials to continue.'}
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 rounded-xl border-slate-300 pl-9 focus-visible:ring-slate-400"
                  />
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 rounded-xl border-slate-300 pl-9 focus-visible:ring-slate-400"
                  />
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Admin access code (optional)</span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Required for console admin access"
                    className="h-11 rounded-xl border-slate-300 pl-9 focus-visible:ring-slate-400"
                  />
                </div>
              </label>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  Sign in
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
