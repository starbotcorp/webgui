'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock3, Mail, UserRound, Plus, Trash2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AUTH_CHANGED_EVENT,
  clearAuthSession,
  clearServerSession,
  readAuthSession,
  type AuthSession,
} from '@/lib/auth-session';
import { userFactsApi, type UserFact, type OnboardingStatus } from '@/lib/api/user-facts';

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newFactKey, setNewFactKey] = useState('');
  const [newFactValue, setNewFactValue] = useState('');

  const fetchData = async () => {
    try {
      const [fetchedFacts, fetchedStatus] = await Promise.all([
        userFactsApi.list(),
        userFactsApi.getOnboardingStatus(),
      ]);
      setFacts(fetchedFacts);
      setOnboardingStatus(fetchedStatus);
    } catch (error) {
      console.error('Failed to fetch user facts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const refresh = () => setSession(readAuthSession());
    refresh();

    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const handleAddFact = async () => {
    if (!newFactKey.trim() || !newFactValue.trim()) return;

    try {
      await userFactsApi.set({
        factKey: newFactKey.trim(),
        factValue: newFactValue.trim(),
        source: 'manual',
        confidence: 1.0,
      });
      setNewFactKey('');
      setNewFactValue('');
      setIsEditing(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to add fact:', error);
    }
  };

  const handleDeleteFact = async (factKey: string) => {
    try {
      await userFactsApi.delete(factKey);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete fact:', error);
    }
  };

  const handleResetOnboarding = async () => {
    if (!confirm('This will clear your onboarding information (name, timezone, role). Starbot will ask you for this information again in your next conversation. Continue?')) {
      return;
    }
    try {
      await userFactsApi.resetOnboarding();
      await fetchData();
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
      alert('Failed to reset onboarding. Please try again.');
    }
  };

  const handleStartOnboarding = async () => {
    try {
      const result = await userFactsApi.restartMainOnboarding();
      // Navigate to the main chat which has been cleared for onboarding
      router.push(`/?chat=${result.chatId}`);
    } catch (error) {
      console.error('Failed to restart main onboarding:', error);
      alert('Failed to restart main onboarding. Please try again.');
    }
  };

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">No active session</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in or continue as guest to access account details.</p>
          <div className="mt-6">
            <Button onClick={() => router.push('/login')} className="bg-slate-900 text-white hover:bg-slate-800">
              Go to login
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-start p-6 pt-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-semibold text-slate-900">Account</h1>
        <p className="mt-1 text-sm text-slate-600">Session details and preferences for this browser.</p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-900">
              <UserRound className="h-4 w-4 text-slate-500" />
              {session.name}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-900">
              <Mail className="h-4 w-4 text-slate-500" />
              {session.email}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Signed in at</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-900">
              <Clock3 className="h-4 w-4 text-slate-500" />
              {new Date(session.loggedInAt).toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Role</p>
            <p className="mt-1 text-sm text-slate-900">{session.role || 'user'}</p>
          </div>
        </div>

        {/* User Facts Section */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">User Facts</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isEditing ? 'Cancel' : 'Add Fact'}
            </Button>
          </div>

          {/* Onboarding Status */}
          {!isLoading && onboardingStatus && (
            <div className={`mb-4 rounded-2xl border p-4 ${
              onboardingStatus.isComplete
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {onboardingStatus.isComplete ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  <p className="text-sm font-medium text-slate-900">
                    {onboardingStatus.isComplete ? 'Onboarding Complete' : 'Onboarding In Progress'}
                  </p>
                </div>
                {onboardingStatus.isComplete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleResetOnboarding}
                    className="text-slate-500 hover:text-amber-600"
                    title="Restart onboarding"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {!onboardingStatus.isComplete && (
                <p className="mt-1 text-sm text-slate-600">
                  Missing: {onboardingStatus.requiredKeys.filter(k => !onboardingStatus.collectedFacts.includes(k)).join(', ')}
                </p>
              )}
              {!onboardingStatus.isComplete && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={handleStartOnboarding}
                    className="bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Start Onboarding Chat
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Add New Fact Form */}
          {isEditing && (
            <div className="mb-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label htmlFor="factKey" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Fact Key
                </label>
                <Input
                  id="factKey"
                  placeholder="e.g., birthday, favorite_color, hobby"
                  value={newFactKey}
                  onChange={(e) => setNewFactKey(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="factValue" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Value
                </label>
                <Input
                  id="factValue"
                  placeholder="e.g., January 1st, Blue, Photography"
                  value={newFactValue}
                  onChange={(e) => setNewFactValue(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddFact} size="sm">
                  Save Fact
                </Button>
                <Button onClick={() => { setIsEditing(false); setNewFactKey(''); setNewFactValue(''); }} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Facts List */}
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading facts...</p>
          ) : facts.length === 0 ? (
            <p className="text-sm text-slate-600">No facts stored yet. Start a conversation to begin onboarding.</p>
          ) : (
            <div className="space-y-3">
              {facts.map((fact) => (
                <div
                  key={fact.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{fact.factKey}</p>
                    <p className="mt-1 text-sm text-slate-900">{fact.factValue}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Source: {fact.source} • Confidence: {(fact.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteFact(fact.factKey)}
                    className="text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={async () => {
              await clearServerSession();
              clearAuthSession();
              router.push('/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
