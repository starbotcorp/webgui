import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '@/lib/api/chats';
import { foldersApi } from '@/lib/api/folders';
import { projectsApi } from '@/lib/api/projects';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/error-utils';

interface UseSidebarMutationsOptions {
  currentProjectId: string | undefined;
  userEmail: string | undefined;
  onChatCreated: (chatId: string) => void;
}

export function useSidebarMutations({
  currentProjectId,
  userEmail,
  onChatCreated,
}: UseSidebarMutationsOptions) {
  const queryClient = useQueryClient();

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
      onChatCreated(newChat.id);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create chat'));
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
      toast.error(getErrorMessage(error, 'Failed to create folder'));
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => foldersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ['chats', currentProjectId] });
      toast.success('Folder deleted (chats moved to root)');
    },
    onError: () => {
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

  return {
    createChatMutation,
    createFolderMutation,
    deleteFolderMutation,
    deleteChatMutation,
    renameChatMutation,
  };
}
