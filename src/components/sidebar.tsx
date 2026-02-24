'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '@/lib/api/chats';
import { foldersApi } from '@/lib/api/folders';
import { projectsApi } from '@/lib/api/projects';
import { useUIStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Folder as FolderIcon, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { readAuthSession } from '@/lib/auth-session';

export function Sidebar() {
  const {
    selectedChatId,
    setSelectedChatId,
    isSidebarOpen
  } = useUIStore();

  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const session = readAuthSession();
  const userEmail = session?.email;

  const { data: projects } = useQuery({
    queryKey: ['projects', userEmail],
    queryFn: () => userEmail ? projectsApi.list(userEmail) : Promise.resolve([]),
    enabled: !!userEmail,
  });

  const currentProjectId = projects?.[0]?.id;

  const { data: folders } = useQuery({
    queryKey: ['folders', currentProjectId],
    queryFn: () => currentProjectId ? foldersApi.list(currentProjectId) : Promise.resolve([]),
    enabled: !!currentProjectId,
  });

  const { data: chats } = useQuery({
    queryKey: ['chats', currentProjectId],
    queryFn: () => currentProjectId ? chatsApi.list(currentProjectId, 'webgui') : Promise.resolve([]),
    enabled: !!currentProjectId,
  });

  // Separate chats into folder groups
  const chatsInFolders = new Map<string, typeof chats>();
  const unfolderedChats: typeof chats = [];

  chats?.forEach(chat => {
    if (chat.folderId) {
      const folderChats = chatsInFolders.get(chat.folderId) || [];
      folderChats.push(chat);
      chatsInFolders.set(chat.folderId, folderChats);
    } else {
      unfolderedChats.push(chat);
    }
  });

  const createChatMutation = useMutation({
    mutationFn: async ({ title, folderId }: { title: string; folderId?: string }) => {
      if (!userEmail) throw new Error('Not logged in');

      let projectId = currentProjectId;

      if (!projectId) {
        const project = await projectsApi.create({ name: 'My Project', email: userEmail });
        projectId = project.id;
      }

      return chatsApi.create(projectId, { title, folderId, clientSource: 'webgui' });
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (currentProjectId) {
        queryClient.invalidateQueries({ queryKey: ['chats', currentProjectId] });
      }
      setSelectedChatId(newChat.id);
    },
    onError: (error) => {
      const message = error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Failed to create chat';
      toast.error(message);
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentProjectId) throw new Error('No project selected');
      return foldersApi.create(currentProjectId, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', currentProjectId] });
      toast.success('Folder created');
    },
    onError: (error) => {
      const message = error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Failed to create folder';
      toast.error(message);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => foldersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ['chats', currentProjectId] });
      toast.success('Folder deleted (chats moved to root)');
    },
    onError: (error) => {
      toast.error('Failed to delete folder');
    },
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateChat = (folderId?: string) => {
    createChatMutation.mutate({ title: 'New Chat', folderId });
  };

  const handleCreateFolder = () => {
    const name = prompt('Enter folder name:');
    if (name?.trim()) {
      createFolderMutation.mutate(name.trim());
    }
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    if (confirm('Delete folder? Chats will be moved to root.')) {
      deleteFolderMutation.mutate(folderId);
    }
  };

  if (!isSidebarOpen) return null;

  return (
    <aside className="h-full w-full rounded-3xl border border-slate-200/80 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/65 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Starbot</p>
          <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleCreateChat()}
            className="flex-1 justify-start bg-slate-900 text-slate-50 hover:bg-slate-800 border-0 shadow-sm"
            aria-label="Create new chat"
            disabled={createChatMutation.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
          <Button
            onClick={handleCreateFolder}
            variant="outline"
            size="sm"
            className="border-slate-300"
            aria-label="Create new folder"
            disabled={createFolderMutation.isPending}
          >
            <FolderIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <div className="space-y-2" role="list" aria-label="Chat list">
          {/* Render folders with nested chats */}
          {folders?.map((folder) => {
            const isExpanded = expandedFolders.has(folder.id);
            const folderChats = chatsInFolders.get(folder.id) || [];

            return (
              <div key={folder.id}>
                <Button
                  variant="ghost"
                  className="w-full justify-start font-semibold h-9 rounded-xl px-3 text-slate-700 hover:bg-slate-100"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="mr-2 h-4 w-4" />
                  ) : (
                    <ChevronRight className="mr-2 h-4 w-4" />
                  )}
                  <FolderIcon className="mr-2 h-4 w-4 text-slate-500" />
                  <span className="truncate flex-1 text-left">{folder.name}</span>
                  <span className="text-xs text-slate-400 ml-2">({folderChats.length})</span>
                  <button
                    onClick={(e) => handleDeleteFolder(e, folder.id)}
                    className="ml-2 p-1 hover:bg-red-100 rounded"
                    aria-label="Delete folder"
                  >
                    <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                  </button>
                </Button>

                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {folderChats.map((chat) => (
                      <Button
                        key={chat.id}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start font-normal h-8 rounded-lg px-3 ml-2",
                          selectedChatId === chat.id
                            ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        )}
                        onClick={() => setSelectedChatId(chat.id)}
                      >
                        <MessageSquare className="mr-2 h-3.5 w-3.5" />
                        <span className="truncate text-sm">{chat.title}</span>
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full justify-start font-normal h-8 rounded-lg px-3 ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      onClick={() => handleCreateChat(folder.id)}
                    >
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      <span className="text-xs">Add chat</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Render unfoldered chats */}
          {unfolderedChats.length > 0 && (
            <div className="space-y-1">
              {folders && folders.length > 0 && (
                <p className="text-xs font-medium text-slate-400 px-3 py-1">Unfiled</p>
              )}
              {unfolderedChats.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start font-normal h-10 rounded-xl px-3",
                    selectedChatId === chat.id
                      ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                  onClick={() => setSelectedChatId(chat.id)}
                  aria-label={`Chat: ${chat.title}`}
                  aria-current={selectedChatId === chat.id ? "page" : undefined}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="truncate">{chat.title}</span>
                </Button>
              ))}
            </div>
          )}

          {!chats?.length && (
            <div className="mx-2 mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-sm text-slate-500 text-center">
              No chats yet. Click New Chat to create one.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-200/80 mt-auto bg-white/70">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Use account menu for settings</p>
      </div>
    </aside>
  );
}
