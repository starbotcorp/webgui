'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, User, KeyRound, Trash2, RotateCcw,
  MessageSquare, FolderOpen, Monitor, Calendar, Pencil, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ONBOARDING_COLOR: Record<string, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatDateShort(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- Inline fact editor row ----
function FactRow({
  userId,
  factKey,
  factValue,
  confidence,
  source,
  onMutated,
}: {
  userId: string;
  factKey: string;
  factValue: string;
  confidence: number;
  source: string;
  onMutated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(factValue);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateFact(userId, factKey, { factValue: draft }),
    onSuccess: () => { setEditing(false); onMutated(); toast.success('Fact updated'); },
    onError: () => toast.error('Failed to update fact'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteFact(userId, factKey),
    onSuccess: () => { setConfirmDelete(false); onMutated(); toast.success('Fact deleted'); },
    onError: () => toast.error('Failed to delete fact'),
  });

  return (
    <>
      <div className="grid grid-cols-[1fr_2fr_auto_auto] items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0">
        <span className="truncate font-mono text-xs font-medium text-slate-700">{factKey}</span>
        {editing ? (
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="h-7 rounded-lg border-slate-300 text-xs"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') updateMutation.mutate();
              if (e.key === 'Escape') { setEditing(false); setDraft(factValue); }
            }}
          />
        ) : (
          <span className="truncate text-xs text-slate-600">{factValue}</span>
        )}
        <span className="text-[10px] text-slate-400">{source}</span>
        <div className="flex gap-1">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setDraft(factValue); }}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setDraft(factValue); setEditing(true); }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete fact</DialogTitle>
            <DialogDescription>
              Delete <span className="font-mono font-medium">{factKey}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} className="rounded-xl">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-xl"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- Main page ----
export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminApi.getUser(id),
    enabled: !!id,
  });

  const resetOnboardingMutation = useMutation({
    mutationFn: () => adminApi.resetOnboarding(id),
    onSuccess: () => { query.refetch(); toast.success('Onboarding reset'); },
    onError: () => toast.error('Failed to reset onboarding'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      router.push('/admin/users');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const { user, facts, projects, recentChats, sessions } = query.data ?? {};

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">User not found.</div>
    );
  }

  const displayName = user.displayName || user.name || user.email;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-white p-5">
        <button
          type="button"
          onClick={() => router.push('/admin/users')}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All users
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">User</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <User className="h-6 w-6 text-slate-600" />
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', ONBOARDING_COLOR[user.onboardingStatus])}>
                {user.onboardingStatus.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-400">Joined {formatDateShort(user.createdAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => resetOnboardingMutation.mutate()}
              disabled={resetOnboardingMutation.isPending}
              className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset onboarding
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="rounded-xl border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete user
            </Button>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: FolderOpen, label: 'Projects', value: user._count.projects },
          { icon: MessageSquare, label: 'Chats', value: recentChats?.length ?? '—' },
          { icon: Monitor, label: 'Sessions', value: user._count.sessions },
          { icon: KeyRound, label: 'Facts', value: user._count.facts },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="rounded-2xl border-slate-200/90 bg-white/90">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Icon className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Facts */}
      <Card className="rounded-2xl border-slate-200/90 bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">User Facts</CardTitle>
          <CardDescription>Stored facts about this user. Click the pencil icon to edit inline.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!facts || facts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No facts stored.</p>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-3 border-b border-slate-100 px-4 pb-2">
                {['Key', 'Value', 'Source', ''].map(h => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{h}</span>
                ))}
              </div>
              {facts.map(fact => (
                <FactRow
                  key={fact.factKey}
                  userId={id}
                  factKey={fact.factKey}
                  factValue={fact.factValue}
                  confidence={fact.confidence}
                  source={fact.source}
                  onMutated={() => query.refetch()}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      {projects && projects.length > 0 && (
        <Card className="rounded-2xl border-slate-200/90 bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <FolderOpen className="h-4 w-4 text-slate-600" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {projects.map(project => (
                <div key={project.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{project.name}</div>
                    <div className="text-xs text-slate-400">{formatDateShort(project.createdAt)}</div>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>{project._count.chats} chat{project._count.chats === 1 ? '' : 's'}</span>
                    <span>{project._count.workspaces} workspace{project._count.workspaces === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent chats */}
      {recentChats && recentChats.length > 0 && (
        <Card className="rounded-2xl border-slate-200/90 bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <MessageSquare className="h-4 w-4 text-slate-600" />
              Recent Chats
            </CardTitle>
            <CardDescription>Last 20 most recently updated chats.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentChats.map(chat => (
                <div key={chat.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <span className="truncate text-sm text-slate-800">{chat.title || 'Untitled chat'}</span>
                    {chat.isMain && (
                      <span className="ml-2 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Main</span>
                    )}
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3 text-xs text-slate-500">
                    <span>{chat._count.messages} msg{chat._count.messages === 1 ? '' : 's'}</span>
                    <span>{formatDateShort(chat.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions */}
      {sessions && sessions.length > 0 && (
        <Card className="rounded-2xl border-slate-200/90 bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <Monitor className="h-4 w-4 text-slate-600" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {sessions.map(session => {
                const expired = new Date(session.expiresAt) < new Date();
                return (
                  <div key={session.id} className="flex items-start justify-between px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800">
                        {session.deviceName || 'Unknown device'}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 truncate">
                        {session.ipAddress || '—'} · {session.userAgent?.slice(0, 60) || '—'}
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 text-right text-xs text-slate-500">
                      <div>Last used {formatDateShort(session.lastUsedAt)}</div>
                      <span className={cn('text-[10px] font-medium', expired ? 'text-red-500' : 'text-emerald-600')}>
                        {expired ? 'Expired' : 'Active'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete user dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Permanently delete <span className="font-medium">{user.email}</span> and all their data — projects, chats, facts, sessions, calendar events. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
              className="rounded-xl"
            >
              {deleteUserMutation.isPending ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
