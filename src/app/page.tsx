'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { ChatView } from '@/components/chat/chat-view';
import { SettingsPanel } from '@/components/settings-panel';
import { LogsPanel } from '@/components/logs-panel';
import { InboxPanel } from '@/components/inbox-panel';
import { DashboardPanel } from '@/components/dashboard-panel';
import { useUIStore } from '@/store/ui-store';
import { readAuthSession } from '@/lib/auth-session';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';

export default function Page() {
  const router = useRouter();
  const { isSidebarOpen, toggleSidebar, selectedView, selectedChatId } = useUIStore();
  const [checking, setChecking] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const session = readAuthSession();
    // Token is stored in httpOnly cookie, not in session
    // Just check if we have session data with email
    if (!session || !session.email) {
      router.push('/login');
    } else {
      setChecking(false);
    }
  }, [router]);

  // Show nothing while checking auth
  if (checking) {
    return null;
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_45%)]" />

      <div className="relative h-full w-full p-3 md:p-5">
        <div className="flex h-full w-full gap-3 md:gap-4">
          {/* Sidebar overlay on mobile */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
              onClick={toggleSidebar}
              aria-hidden="true"
            />
          )}

          {/* Sidebar */}
          <div className={cn(
              "transition-all duration-300 ease-in-out z-50",
              "md:relative md:z-0",
              isSidebarOpen
                ? "fixed md:relative w-[18.5rem] md:w-[18.5rem]"
                : "fixed md:relative w-[4rem] md:w-[4rem]"
          )}>
            <Sidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col relative min-w-0 rounded-3xl border border-slate-200/80 bg-white/80 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur overflow-hidden">
            <header className="h-14 border-b border-slate-200/80 flex items-center justify-between px-4 bg-white/70">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Workspace</p>
                  <h1 className="font-semibold text-slate-900 leading-tight">
                    {selectedView === 'inbox' ? 'Inbox' :
                     selectedView === 'dashboard' ? 'Dashboard' :
                     selectedChatId ? 'Chat' : 'Starbot'}
                  </h1>
                </div>
                {selectedView === 'chat' && (
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Chat Settings"
                  >
                    <Settings className="h-5 w-5 text-slate-600" />
                  </button>
                )}
            </header>

            {/* Settings Modal */}
            {showSettingsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Chat Settings</h2>
                    <button
                      onClick={() => setShowSettingsModal(false)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Delete All Messages
                      </label>
                      <p className="text-sm text-slate-600 mb-2">
                        Clear all messages from this chat thread and restart it as a fresh onboarding conversation.
                      </p>
                      <button
                        onClick={async () => {
                          if (!confirm('Delete all messages in this chat? This cannot be undone.')) return;
                          if (!selectedChatId) return;
                          try {
                            await fetch(`/api/chats/${selectedChatId}/messages`, { method: 'DELETE' });
                            // Navigate to refresh the chat view
                            window.location.reload();
                          } catch (error) {
                            console.error('Failed to delete messages:', error);
                            alert('Failed to delete messages. Please try again.');
                          }
                        }}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete All Messages
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <main className="flex-1 overflow-hidden relative">
                {selectedView === 'inbox' && <InboxPanel />}
                {selectedView === 'dashboard' && <DashboardPanel />}
                {selectedView === 'chat' && <ChatView />}
                <SettingsPanel />
                <LogsPanel />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
