'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Database } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Doc = {
  id: string;
  label: string;
  description: string;
  content: string;
  group: string;
  liveVersion?: boolean;
};

export default function AdminDocsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin-docs'],
    queryFn: adminApi.getDocs,
    staleTime: Infinity,
  });

  const docs = query.data?.docs ?? [];
  const selected = docs.find(d => d.id === selectedId) ?? docs[0] ?? null;

  // Group docs
  const groups = Array.from(new Set(docs.map(d => d.group)));

  return (
    <div className="flex h-full gap-0 -m-4 md:-m-6" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-slate-50/60 overflow-y-auto">
        <div className="px-3 py-3 border-b border-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Static Docs</p>
        </div>

        {query.isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <nav className="py-2">
            {groups.map(group => (
              <div key={group}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group}
                </p>
                {docs.filter(d => d.group === group).map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition',
                      (selected?.id === doc.id)
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {doc.liveVersion
                      ? <Database className="h-3 w-3 shrink-0" />
                      : <FileText className="h-3 w-3 shrink-0" />
                    }
                    <span className="truncate leading-snug">{doc.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        )}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!selected && !query.isLoading && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Select a document
          </div>
        )}

        {query.isLoading && (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        )}

        {selected && (
          <div className="p-5 md:p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                {selected.liveVersion
                  ? <Database className="h-4 w-4 text-sky-600" />
                  : <FileText className="h-4 w-4 text-slate-500" />
                }
                <h1 className="text-lg font-semibold text-slate-900">{selected.label}</h1>
                {selected.liveVersion && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">LIVE</span>
                )}
              </div>
              {selected.description && (
                <p className="mt-1 text-xs text-slate-500">{selected.description}</p>
              )}
            </div>

            <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-relaxed text-slate-100">
              {selected.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
