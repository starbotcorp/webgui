'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, Users, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { adminApi, type AdminUser, type ListUsersParams } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ONBOARDING_LABEL: Record<AdminUser['onboardingStatus'], string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

const ONBOARDING_COLOR: Record<AdminUser['onboardingStatus'], string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ListUsersParams['sortBy']>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    const id = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(id);
  }, []);

  const toggleSort = useCallback((col: ListUsersParams['sortBy']) => {
    if (sortBy === col) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
    setPage(1);
  }, [sortBy]);

  const query = useQuery({
    queryKey: ['admin-users', debouncedSearch, page, sortBy, sortOrder],
    queryFn: () => adminApi.listUsers({ search: debouncedSearch || undefined, page, sortBy, sortOrder }),
  });

  const users = query.data?.users ?? [];
  const pagination = query.data?.pagination;

  const SortButton = ({ col, label }: { col: ListUsersParams['sortBy']; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(col)}
      className={cn(
        'flex items-center gap-1 text-xs font-semibold uppercase tracking-wide',
        sortBy === col ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
      )}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Users</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Users className="h-6 w-6 text-slate-700" />
          Registered Users
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {pagination ? `${pagination.total} user${pagination.total === 1 ? '' : 's'} total` : 'Loading…'}
        </p>
      </header>

      <Card className="rounded-2xl border-slate-200/90 bg-white/90">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search by email or name…"
                className="h-9 rounded-xl border-slate-300 pl-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 px-5 py-2">
            <SortButton col="email" label="User" />
            <SortButton col="createdAt" label="Joined" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Onboarding</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Projects</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Sessions</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Facts</span>
          </div>

          {/* Rows */}
          {query.isLoading ? (
            <div className="space-y-0 divide-y divide-slate-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3.5 w-20 self-center" />
                  <Skeleton className="h-5 w-20 rounded-full self-center" />
                  <Skeleton className="h-3.5 w-6 self-center ml-auto" />
                  <Skeleton className="h-3.5 w-6 self-center ml-auto" />
                  <Skeleton className="h-3.5 w-6 self-center ml-auto" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No users found{debouncedSearch ? ` matching "${debouncedSearch}"` : ''}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="grid w-full grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {user.displayName || user.name || user.email}
                    </div>
                    {(user.displayName || user.name) && (
                      <div className="truncate text-xs text-slate-500">{user.email}</div>
                    )}
                  </div>
                  <div className="self-center text-xs text-slate-600">{formatDate(user.createdAt)}</div>
                  <div className="self-center">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', ONBOARDING_COLOR[user.onboardingStatus])}>
                      {ONBOARDING_LABEL[user.onboardingStatus]}
                    </span>
                  </div>
                  <div className="self-center text-right text-sm font-medium text-slate-700">{user._count.projects}</div>
                  <div className="self-center text-right text-sm font-medium text-slate-700">{user._count.sessions}</div>
                  <div className="self-center text-right text-sm font-medium text-slate-700">{user._count.facts}</div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 rounded-lg border-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 rounded-lg border-slate-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
