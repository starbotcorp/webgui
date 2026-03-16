'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { ChatView } from '@/components/chat/chat-view';
import { SettingsPanel } from '@/components/settings-panel';
import { LogsPanel } from '@/components/logs-panel';
import { HomePanel } from '@/components/home-panel';
import { useUIStore } from '@/store/ui-store';
import { readAuthSession } from '@/lib/auth-session';
import { cn } from '@/lib/utils';

export default function Page() {
  const router = useRouter();
  const { isSidebarOpen, toggleSidebar, selectedView, selectedChatId, loadSettings } = useUIStore();
  const [checking, setChecking] = useState(true);


  // Check authentication on mount
  useEffect(() => {
    const session = readAuthSession();
    // Token is stored in httpOnly cookie, not in session
    // Just check if we have session data with email
    if (!session || !session.email) {
      router.push('/login');
    } else {
      setChecking(false);
      loadSettings();
    }
  }, [router, loadSettings]);

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
                    {selectedView === 'home' ? 'Home' :
                     selectedChatId ? 'Chat' : 'Starbot'}
                  </h1>
                </div>

            </header>

            <main className="flex-1 overflow-hidden relative">
                {selectedView === 'home' && <HomePanel />}
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
