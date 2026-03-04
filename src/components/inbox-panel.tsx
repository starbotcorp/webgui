'use client';

import { Bell, Clock, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InboxItem {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Mock inbox data - in real app, this would come from API
const mockInboxItems: InboxItem[] = [
  {
    id: '1',
    title: 'Reminder: Meeting Tomorrow',
    message: 'Don\'t forget about the project review meeting at 10am tomorrow.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    read: false,
  },
  {
    id: '2',
    title: 'Task Completed',
    message: 'Your task "Review documentation" has been marked as complete.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
  },
  {
    id: '3',
    title: 'Welcome to Starbot',
    message: 'Welcome! This is your inbox where you\'ll find reminders and updates from Starbot.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
  },
];

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function InboxPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-600" />
          <h1 className="text-lg font-semibold text-slate-900">Inbox</h1>
          <span className="ml-auto text-xs text-slate-500">
            {mockInboxItems.filter(item => !item.read).length} unread
          </span>
        </div>
      </div>

      {/* Inbox Items */}
      <div className="flex-1 overflow-y-auto">
        {mockInboxItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Bell className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mockInboxItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer",
                  !item.read && "bg-blue-50/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-1 h-2 w-2 rounded-full shrink-0",
                    item.read ? "bg-slate-300" : "bg-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "font-medium truncate",
                        item.read ? "text-slate-700" : "text-slate-900"
                      )}>
                        {item.title}
                      </h3>
                      {!item.read && (
                        <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-100 text-blue-700 rounded-full shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(item.timestamp)}
                      </div>
                      <button
                        onClick={() => {/* TODO: Mark as read */}}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        title={item.read ? "Mark as unread" : "Mark as read"}
                      >
                        <Check className="h-3 w-3" />
                        {item.read ? "Mark unread" : "Mark read"}
                      </button>
                      <button
                        onClick={() => {/* TODO: Delete message */}}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
