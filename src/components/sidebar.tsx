'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '@/lib/api/chats';
import { foldersApi } from '@/lib/api/folders';
import { projectsApi } from '@/lib/api/projects';
import { useUIStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MessageSquare, Folder as FolderIcon, ChevronDown, ChevronRight, Trash2, MoreVertical, Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { readAuthSession } from '@/lib/auth-session';
import { Chat } from '@/lib/types';

export function Sidebar() {
  const {
    selectedChatId,
    setSelectedChatId,
    isSidebarOpen
  } = useUIStore();

  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localChats, setLocalChats] = useState<Chat[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Dialog states for better UX (replacing prompt/confirm)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<{ id: string; title: string } | null>(null);
  const [chatToRename, setChatToRename] = useState<{ id: string; currentTitle: string } | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');

  // Prevent SSR issues with dnd-kit
  useEffect(() => {
    setIsMounted(true);
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

  const deleteChatMutation = useMutation({
    mutationFn: (id: string) => chatsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', currentProjectId] });
      toast.success('Chat deleted');
    },
    onError: () => {
      toast.error('Failed to delete chat');
    },
  });

  const renameChatMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => chatsApi.update(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', currentProjectId] });
      toast.success('Chat renamed');
    },
    onError: () => {
      toast.error('Failed to rename chat');
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
    setIsCreateFolderOpen(true);
  };

  const confirmCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim(), {
        onSuccess: () => {
          setNewFolderName('');
          setIsCreateFolderOpen(false);
        },
      });
    }
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setFolderToDelete(folderId);
  };

  const confirmDeleteFolder = () => {
    if (folderToDelete) {
      deleteFolderMutation.mutate(folderToDelete, {
        onSuccess: () => setFolderToDelete(null),
      });
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string, chatTitle: string) => {
    e.stopPropagation();
    setChatToDelete({ id: chatId, title: chatTitle });
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      deleteChatMutation.mutate(chatToDelete.id, {
        onSuccess: () => setChatToDelete(null),
      });
    }
  };

  const handleRenameChat = (e: React.MouseEvent, chatId: string, currentTitle: string) => {
    e.stopPropagation();
    setChatToRename({ id: chatId, currentTitle });
    setNewChatTitle(currentTitle);
  };

  const confirmRenameChat = () => {
    if (chatToRename && newChatTitle.trim() && newChatTitle !== chatToRename.currentTitle) {
      renameChatMutation.mutate({ id: chatToRename.id, title: newChatTitle.trim() }, {
        onSuccess: () => {
          setChatToRename(null);
          setNewChatTitle('');
        },
      });
    }
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

  // Sortable chat item component
  function SortableChatItem({ chat, isSelected }: { chat: Chat; isSelected: boolean }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: chat.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center group",
          isDragging && "opacity-50"
        )}
      >
        <Button
          variant="ghost"
          className={cn(
            "flex-1 justify-start font-normal h-10 rounded-xl px-2 pr-1",
            isSelected
              ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
              : "text-slate-700 hover:bg-slate-100"
          )}
          onClick={() => setSelectedChatId(chat.id)}
          {...attributes}
          {...listeners}
        >
          <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate flex-1 text-left">{chat.title}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => handleRenameChat(e, chat.id, chat.title)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => handleDeleteChat(e, chat.id, chat.title)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  if (!isSidebarOpen) return null;

  return (
    <aside className="h-full w-full rounded-3xl border border-slate-200/80 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/65 flex flex-col overflow-visible">
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
            {createChatMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {createChatMutation.isPending ? 'Creating...' : 'New Chat'}
          </Button>
          <Button
            onClick={handleCreateFolder}
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
                          onClick={() => setSelectedChatId(chat.id)}
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

      <div className="p-4 border-t border-slate-200/80 mt-auto bg-white/70">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Use account menu for settings</p>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === 'Enter' && confirmCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Chats will be moved to root.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteFolder}
              disabled={deleteFolderMutation.isPending}
            >
              {deleteFolderMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chat Confirmation Dialog */}
      <Dialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete "{chatToDelete?.title}"?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChatToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteChat}
              disabled={deleteChatMutation.isPending}
            >
              {deleteChatMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Chat Dialog */}
      <Dialog open={!!chatToRename} onOpenChange={() => setChatToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <Input
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            placeholder="Chat title"
            onKeyDown={(e) => e.key === 'Enter' && confirmRenameChat()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setChatToRename(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRenameChat}
              disabled={!newChatTitle.trim() || renameChatMutation.isPending}
            >
              {renameChatMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
