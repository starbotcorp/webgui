'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Folder as FolderIcon, BarChart3, Clock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface SidebarDashboardProps {
  totalChats: number;
  totalFolders: number;
  recentChats: Array<{ id: string; title: string; updatedAt: string }>;
  onNewChat: () => void;
  onNewFolder: () => void;
  onChatClick: (chatId: string) => void;
  isCreatingChat?: boolean;
  isCreatingFolder?: boolean;
}

export function SidebarDashboard({
  totalChats,
  totalFolders,
  recentChats,
  onNewChat,
  onNewFolder,
  onChatClick,
  isCreatingChat = false,
  isCreatingFolder = false,
}: SidebarDashboardProps) {
  const [activeTab, setActiveTab] = React.useState<'recent' | 'stats'>('recent');

  return (
    <div className="px-4 pt-4 pb-3 border-b border-slate-200/80">
      {/* Header with branding */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Starbot</p>
        <h2 className="text-sm font-semibold text-slate-900">Inbox</h2>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        <Button
          onClick={onNewChat}
          className="flex-1 justify-start bg-slate-900 text-slate-50 hover:bg-slate-800 border-0 shadow-sm"
          size="sm"
          aria-label="Create new chat"
          disabled={isCreatingChat}
        >
          {isCreatingChat ? (
            <Plus className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {isCreatingChat ? 'Creating...' : 'New Chat'}
        </Button>
        <Button
          onClick={onNewFolder}
          variant="outline"
          size="sm"
          className="border-slate-300"
          aria-label="Create new folder"
          disabled={isCreatingFolder}
        >
          {isCreatingFolder ? (
            <Plus className="h-4 w-4 animate-spin" />
          ) : (
            <FolderIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'recent' | 'stats')}>
        <TabsList className="w-full bg-slate-100/80">
          <TabsTrigger value="recent" className="flex-1">
            <Clock className="mr-1.5 h-3 w-3" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1">
            <BarChart3 className="mr-1.5 h-3 w-3" />
            Stats
          </TabsTrigger>
        </TabsList>

        {/* Recent chats tab */}
        <TabsContent value="recent" className="mt-2">
          {recentChats.length > 0 ? (
            <div className="space-y-1">
              {recentChats.slice(0, 3).map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onChatClick(chat.id)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors truncate"
                >
                  {chat.title}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">No recent chats</p>
          )}
        </TabsContent>

        {/* Stats tab */}
        <TabsContent value="stats" className="mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-semibold text-slate-900">{totalChats}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Chats</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-semibold text-slate-900">{totalFolders}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Folders</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
