'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatsApi } from '@/lib/api/chats';
import { foldersApi } from '@/lib/api/folders';
import { projectsApi } from '@/lib/api/projects';
import { useUIStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, MessageSquare, Folder as FolderIcon, ChevronDown, ChevronRight, Trash2, MoreVertical, Pencil, Loader2, Inbox, LayoutDashboard, Menu, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readAuthSession } from '@/lib/auth-session';
import { Chat } from '@/lib/types';
import { useSidebarMutations } from './sidebar/use-sidebar-mutations';
import { AccountMenu, AccountMenuIcon } from './account-menu';
import { SortableChatItem } from './sidebar/sidebar-chat-item';
import {
  CreateFolderDialog,
  DeleteFolderDialog,
  DeleteChatDialog,
  RenameChatDialog,
} from './sidebar/sidebar-dialogs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';

export function Sidebar() {
  const router = useRouter();
  const {
    selectedChatId,
    setSelectedChatId,
    isSidebarOpen,
    selectedView,
    setSelectedView,
    toggleSidebar,
  } = useUIStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localChats, setLocalChats] = useState<Chat[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Dialog states
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<{ id: string; title: string } | null>(null);
  const [chatToRename, setChatToRename] = useState<{ id: string; currentTitle: string } | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');

  useEffect(() => {
    setIsMounted(true);
    const session = readAuthSession();
    setUserEmail(session?.email || null);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Get main thread (isMain thread) - create if doesn't exist
  // Note: This endpoint finds/creates the project automatically, so we don't need currentProjectId
  const { data: mainThread, isLoading: mainThreadLoading, refetch: refetchMainThread } = useQuery({
    queryKey: ['main-thread'],
    queryFn: () => chatsApi.getMainOrCreate(),
    enabled: !!userEmail,
  });

  // Auto-open main thread when first created (onboarding)
  useEffect(() => {
    if (mainThread && mainThread.clientSource === 'webgui' && !localStorage.getItem('mainThreadOpened')) {
      // Mark as opened to avoid re-opening
      localStorage.setItem('mainThreadOpened', 'true');
      // Auto-select main thread and switch to chat view
      setSelectedChatId(mainThread.id);
      setSelectedView('chat');
    }
  }, [mainThread]);

  const {
    createChatMutation,
    createFolderMutation,
    deleteFolderMutation,
    deleteChatMutation,
    renameChatMutation,
  } = useSidebarMutations({
    currentProjectId,
    userEmail: userEmail || undefined,
    onChatCreated: setSelectedChatId,
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

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setFolderToDelete(folderId);
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string, chatTitle: string) => {
    e.stopPropagation();
    setChatToDelete({ id: chatId, title: chatTitle });
  };

  const handleRenameChat = (e: React.MouseEvent, chatId: string, currentTitle: string) => {
    e.stopPropagation();
    setChatToRename({ id: chatId, currentTitle });
    setNewChatTitle(currentTitle);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && unfolderedChats) {
      const oldIndex = unfolderedChats.findIndex((c) => c.id === active.id);
      const newIndex = unfolderedChats.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(unfolderedChats, oldIndex, newIndex);
        setLocalChats(newOrder);
      }
    }
  };

  // Sync localChats when chats change
  const effectiveChats = localChats.length > 0 && chats ? localChats : chats;

  // Separate chats into folder groups
  const chatsInFolders = new Map<string, typeof chats>();
  const unfolderedChats: typeof chats = [];

  effectiveChats?.forEach(chat => {
    if (chat.folderId) {
      const folderChats = chatsInFolders.get(chat.folderId) || [];
      folderChats.push(chat);
      chatsInFolders.set(chat.folderId, folderChats);
    } else {
      unfolderedChats.push(chat);
    }
  });

  // Collapsed state: show minimal sidebar with toggle and view icons
  if (!isSidebarOpen) {
    return (
      <aside className="h-full w-full rounded-3xl border border-slate-200/80 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/65 flex flex-col overflow-visible">
        <div className="px-2 py-4 border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="rounded-xl text-slate-700 hover:bg-slate-100 h-8 w-8 mx-auto flex"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapsed view icons */}
        <div className="flex-1 flex flex-col items-center gap-2 py-3">
          {/* Main thread button */}
          <Button
            variant={selectedChatId === mainThread?.id ? 'default' : 'ghost'}
            onClick={async () => {
              if (mainThread) {
                setSelectedChatId(mainThread.id);
                setSelectedView('chat');
              } else {
                // Refetch to get/create the main thread
                const result = await refetchMainThread();
                if (result.data) {
                  setSelectedChatId(result.data.id);
                  setSelectedView('chat');
                }
              }
            }}
            size="icon"
            aria-label="Main thread"
            className="rounded-xl"
            disabled={mainThreadLoading}
          >
            {mainThreadLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Home className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant={selectedView === 'inbox' ? 'default' : 'ghost'}
            onClick={() => setSelectedView('inbox')}
            size="icon"
            aria-label="Inbox"
            className="rounded-xl"
          >
            <Inbox className="h-5 w-5" />
          </Button>
          <Button
            variant={selectedView === 'dashboard' ? 'default' : 'ghost'}
            onClick={() => setSelectedView('dashboard')}
            size="icon"
            aria-label="Dashboard"
            className="rounded-xl"
          >
            <LayoutDashboard className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <AccountMenuIcon />
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-full w-full rounded-3xl border border-slate-200/80 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/65 flex flex-col overflow-visible">
      {/* Header with branding and toggle */}
      <div className="px-4 py-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="rounded-xl text-slate-700 hover:bg-slate-100 h-8 w-8 flex-shrink-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Starbot</p>
            <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
          </div>
        </div>

        {/* Main Thread - Special thread at top */}
        <div className="mb-3">
          <Button
            variant={selectedChatId === mainThread?.id ? 'default' : 'outline'}
            onClick={async () => {
              if (mainThread) {
                setSelectedChatId(mainThread.id);
                setSelectedView('chat');
              } else {
                // Refetch to get/create the main thread
                const result = await refetchMainThread();
                if (result.data) {
                  setSelectedChatId(result.data.id);
                  setSelectedView('chat');
                }
              }
            }}
            className="w-full justify-start border-2"
            size="sm"
            disabled={mainThreadLoading}
          >
            {mainThreadLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Home className="mr-2 h-4 w-4" />
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium">Main Thread</span>
            </div>
          </Button>
        </div>

        {/* Inbox/Dashboard quick access */}
        <div className="flex gap-2 mb-3">
          <Button
            variant={selectedView === 'inbox' ? 'default' : 'outline'}
            onClick={() => setSelectedView('inbox')}
            className="flex-1 justify-start"
            size="sm"
          >
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
          </Button>
          <Button
            variant={selectedView === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setSelectedView('dashboard')}
            className="flex-1 justify-start"
            size="sm"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleCreateChat()}
            className="flex-1 justify-start bg-slate-900 text-slate-50 hover:bg-slate-800 border-0 shadow-sm"
            aria-label="Create new chat"
            disabled={createChatMutation.isPending}
          >
            {createChatMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {createChatMutation.isPending ? 'Creating...' : 'New Chat'}
          </Button>
          <Button
            onClick={() => setIsCreateFolderOpen(true)}
            variant="outline"
            size="sm"
            className="border-slate-300"
            aria-label="Create new folder"
            disabled={createFolderMutation.isPending}
          >
            {createFolderMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-3 overflow-y-auto">
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
                      <div key={chat.id} className="flex items-center group">
                        <Button
                          variant="ghost"
                          className={cn(
                            "flex-1 justify-start font-normal h-8 rounded-lg px-2 pr-1 ml-2",
                            selectedChatId === chat.id
                              ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                          onClick={() => {
                            setSelectedChatId(chat.id);
                            setSelectedView('chat');
                          }}
                        >
                          <MessageSquare className="mr-2 h-3.5 w-3.5" />
                          <span className="truncate text-sm flex-1 text-left">{chat.title}</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-slate-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={(e) => handleRenameChat(e, chat.id, chat.title)}>
                              <Pencil className="mr-2 h-3 w-3" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteChat(e, chat.id, chat.title)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

          {/* Render unfoldered chats with drag-drop when mounted */}
          {isMounted && unfolderedChats && unfolderedChats.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={unfolderedChats.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {folders && folders.length > 0 && (
                    <p className="text-xs font-medium text-slate-400 px-3 py-1">Unfiled</p>
                  )}
                  {unfolderedChats.map((chat) => (
                    <SortableChatItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChatId === chat.id}
                      onSelect={(id) => {
                        setSelectedChatId(id);
                        setSelectedView('chat');
                      }}
                      onRename={handleRenameChat}
                      onDelete={handleDeleteChat}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Show loading state before mount */}
          {!isMounted && (
            <div className="space-y-1">
              {unfolderedChats && unfolderedChats.length > 0 && (
                <>
                  {folders && folders.length > 0 && (
                    <p className="text-xs font-medium text-slate-400 px-3 py-1">Unfiled</p>
                  )}
                  {unfolderedChats.map((chat) => (
                    <Button
                      key={chat.id}
                      variant="ghost"
                      className="w-full justify-start font-normal h-10 rounded-xl px-3"
                      onClick={() => {
                        setSelectedChatId(chat.id);
                        setSelectedView('chat');
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span className="truncate">{chat.title}</span>
                    </Button>
                  ))}
                </>
              )}
            </div>
          )}

          {!chats?.length && (
            <div className="mx-2 mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-sm text-slate-500 text-center">
              No chats yet. Click New Chat to create one.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-slate-200/80 mt-auto bg-white/70">
        <AccountMenu />
      </div>

      {/* Dialogs */}
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        onConfirm={() => {
          if (newFolderName.trim()) {
            createFolderMutation.mutate(newFolderName.trim(), {
              onSuccess: () => {
                setNewFolderName('');
                setIsCreateFolderOpen(false);
              },
            });
          }
        }}
        isPending={createFolderMutation.isPending}
      />

      <DeleteFolderDialog
        folderId={folderToDelete}
        onOpenChange={() => setFolderToDelete(null)}
        onConfirm={() => {
          if (folderToDelete) {
            deleteFolderMutation.mutate(folderToDelete, {
              onSuccess: () => setFolderToDelete(null),
            });
          }
        }}
        isPending={deleteFolderMutation.isPending}
      />

      <DeleteChatDialog
        chat={chatToDelete}
        onOpenChange={() => setChatToDelete(null)}
        onConfirm={() => {
          if (chatToDelete) {
            deleteChatMutation.mutate(chatToDelete.id, {
              onSuccess: () => setChatToDelete(null),
            });
          }
        }}
        isPending={deleteChatMutation.isPending}
      />

      <RenameChatDialog
        chat={chatToRename}
        newTitle={newChatTitle}
        onNewTitleChange={setNewChatTitle}
        onOpenChange={() => setChatToRename(null)}
        onConfirm={() => {
          if (chatToRename && newChatTitle.trim() && newChatTitle !== chatToRename.currentTitle) {
            renameChatMutation.mutate({ id: chatToRename.id, title: newChatTitle.trim() }, {
              onSuccess: () => {
                setChatToRename(null);
                setNewChatTitle('');
              },
            });
          }
        }}
        isPending={renameChatMutation.isPending}
      />
    </aside>
  );
}
