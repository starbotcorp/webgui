'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock3, Mail, UserRound, Plus, Trash2, CheckCircle, AlertCircle, RotateCcw, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AUTH_CHANGED_EVENT,
  clearAuthSession,
  clearServerSession,
  readAuthSession,
  type AuthSession,
} from '@/lib/auth-session';
import { userFactsApi, type UserFact, type OnboardingStatus, type NewOnboardingStatus } from '@/lib/api/user-facts';
import { userApi } from '@/lib/api/user';

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [newOnboardingStatus, setNewOnboardingStatus] = useState<NewOnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newFactKey, setNewFactKey] = useState('');
  const [newFactValue, setNewFactValue] = useState('');

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchData = async () => {
    try {
      const [fetchedFacts, fetchedStatus, fetchedNewStatus] = await Promise.all([
        userFactsApi.list(),
        userFactsApi.getOnboardingStatus(),
        userFactsApi.getOnboardingStatusV2(),
      ]);
      setFacts(fetchedFacts);
      setOnboardingStatus(fetchedStatus);
      setNewOnboardingStatus(fetchedNewStatus);
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

  // New restart onboarding flow - sets status to IN_PROGRESS, clears chat, preserves facts
  const handleRestartOnboarding = async () => {
    if (!confirm('This will clear the current chat and let you re-enter your personal info. Your existing facts will be temporarily hidden until you finish. Continue?')) {
      return;
    }
    try {
      // 1. Set status to IN_PROGRESS (hides facts from AI)
      await userFactsApi.resetOnboardingV2();

      // 2. Clear main chat messages
      const result = await userFactsApi.restartMainOnboarding();

      // 3. Navigate to the main chat
      router.push(`/?chat=${result.chatId}`);
    } catch (error) {
      console.error('Failed to restart onboarding:', error);
      alert('Failed to restart onboarding. Please try again.');
    }
  };

  // Legacy reset - deletes facts
  const handleResetOnboarding = async () => {
    if (!confirm('This will permanently delete your onboarding information (name, timezone, role). Starbot will ask you for this information again. Continue?')) {
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

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsChangingPassword(true);
    try {
      await userApi.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordSection(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Determine effective status
  const isComplete = newOnboardingStatus?.status === 'COMPLETED' || onboardingStatus?.isComplete;
  const isInProgress = newOnboardingStatus?.status === 'IN_PROGRESS';

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

        {/* Change Password Section */}
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Security</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              {showPasswordSection ? 'Cancel' : 'Change Password'}
            </Button>
          </div>

          {showPasswordSection && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {passwordError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600">
                  {passwordSuccess}
                </div>
              )}

              <div>
                <label htmlFor="currentPassword" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleChangePassword}
                  size="sm"
                  disabled={isChangingPassword}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </Button>
                <Button
                  onClick={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
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
          {!isLoading && (
            <div className={`mb-4 rounded-2xl border p-4 ${
              isInProgress
                ? 'border-blue-200 bg-blue-50'
                : isComplete
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isInProgress ? (
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  ) : isComplete ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  <p className="text-sm font-medium text-slate-900">
                    {isInProgress
                      ? 'Onboarding In Progress'
                      : isComplete
                        ? 'Onboarding Complete'
                        : 'Onboarding Required'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isComplete && !isInProgress && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRestartOnboarding}
                      className="text-slate-500 hover:text-blue-600"
                      title="Restart onboarding (preserves facts)"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {isInProgress && (
                <p className="mt-1 text-sm text-slate-600">
                  Your facts are temporarily hidden. Complete the onboarding conversation to update them.
                </p>
              )}
              {!isComplete && !isInProgress && onboardingStatus && (
                <p className="mt-1 text-sm text-slate-600">
                  Missing: {onboardingStatus.requiredKeys.filter(k => !onboardingStatus.collectedFacts.includes(k)).join(', ')}
                </p>
              )}
              {!isComplete && !isInProgress && (
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
              {isInProgress && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={handleStartOnboarding}
                    className="bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Continue Onboarding
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
                  className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 ${
                    isInProgress ? 'opacity-50' : ''
                  }`}
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
                    disabled={isInProgress}
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
