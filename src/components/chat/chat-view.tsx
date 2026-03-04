import { useChatStream } from '@/hooks/use-chat-stream';
import { useUIStore } from '@/store/ui-store';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { messagesApi } from '@/lib/api/messages';
import { chatsApi } from '@/lib/api/chats';
import { projectsApi } from '@/lib/api/projects';
import { userFactsApi } from '@/lib/api/user-facts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Sparkles, Loader2 } from 'lucide-react';
import { Message, Chat } from '@/lib/types';
import { toast } from 'sonner';
import { MessageSkeleton } from './message-skeleton';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { readAuthSession } from '@/lib/auth-session';

export function ChatView() {
  const { selectedChatId, settings, setDraftInput, setSelectedChatId } = useUIStore();
  const { messages, isLoading, status, startStream } = useChatStream(selectedChatId);
  const queryClient = useQueryClient();

  const session = readAuthSession();
  const userEmail = session?.email;

  const { data: projects } = useQuery({
    queryKey: ['projects', userEmail],
    queryFn: () => userEmail ? projectsApi.list(userEmail) : Promise.resolve([]),
    enabled: !!userEmail,
  });
  const currentProjectId = projects?.[0]?.id;

  // Get main thread to check if current chat is the main one
  const { data: mainThread } = useQuery({
    queryKey: ['main-thread', currentProjectId],
    queryFn: () => currentProjectId ? chatsApi.getMainOrCreate() : Promise.resolve(null),
    enabled: !!currentProjectId,
  });

  // Check if current chat is the main thread
  const isMainThread = selectedChatId && mainThread?.id === selectedChatId;

  // Check onboarding status (only for main thread)
  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => userFactsApi.getOnboardingStatusV2(),
    enabled: !!userEmail && !!isMainThread,
  });

  // User needs onboarding only if status is NOT_STARTED
  // Once onboarding is IN_PROGRESS, show the normal chat with welcome message
  const needsOnboarding = isMainThread && onboardingStatus?.status === 'NOT_STARTED';

  // Mutation to start onboarding
  const startOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChatId) throw new Error('No chat selected');

      // First, clear all existing messages in the chat
      await fetch(`/v1/chats/${selectedChatId}/messages`, {
        method: 'DELETE',
        credentials: 'include',
      });

      // Reset onboarding status to IN_PROGRESS
      await userFactsApi.resetOnboardingV2();

      // Create the welcome message as an assistant message
      const response = await fetch(`/v1/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          role: 'assistant',
          content: "Hey there! I'm Starbot - your personal AI assistant. I'm here to help you stay organized, answer questions, and maybe even make you smile. Before we dive in, I'd love to get to know you a little better.\n\nWhat should I call you?"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh messages and onboarding status
      if (selectedChatId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedChatId] });
      }
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to start onboarding');
    },
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      if (!userEmail) throw new Error('Not logged in');

      let projectId = currentProjectId;

      if (!projectId) {
        const project = await projectsApi.create({ name: 'My Project', email: userEmail });
        projectId = project.id;
      }

      return chatsApi.create(projectId, { title: 'New Chat', clientSource: 'webgui' });
    },
    onSuccess: (newChat) => {
      const projectIdForCache = newChat.projectId || currentProjectId;
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (projectIdForCache) {
        queryClient.invalidateQueries({ queryKey: ['chats', projectIdForCache] });
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

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedChatId) throw new Error('No chat selected');

      const response = await fetch(`/v1/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: 'user', content }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.message;
    },
    onSuccess: (data) => {
      if (selectedChatId) {
        queryClient.setQueryData(['messages', selectedChatId], (old) => {
          const messages = (old as Message[]) || [];
          return [
            ...messages,
            {
              id: data.id,
              chatId: selectedChatId,
              role: 'user',
              content: data.content,
              createdAt: data.createdAt || new Date().toISOString(),
            },
          ];
        });
        startStream(settings);
      }
    },
    onError: (err) => {
      console.error('[sendMutation] Error:', err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => messagesApi.delete(messageId),
    onMutate: async (messageId) => {
      if (!selectedChatId) return;

      await queryClient.cancelQueries({ queryKey: ['messages', selectedChatId] });
      const previousMessages = queryClient.getQueryData(['messages', selectedChatId]);

      queryClient.setQueryData(['messages', selectedChatId], (old: Message[] = []) =>
        old.filter((msg) => msg.id !== messageId)
      );

      return { previousMessages };
    },
    onError: (err, messageId, context) => {
      if (selectedChatId && context?.previousMessages) {
        queryClient.setQueryData(['messages', selectedChatId], context.previousMessages);
      }
      toast.error('Failed to delete message');
    },
    onSuccess: () => {
      toast.success('Message deleted');
    },
  });

  const handleSend = (content: string) => {
    if (selectedChatId) {
      sendMutation.mutate(content);
    }
  };

  const handleEditMessage = async (message: Message) => {
    if (!selectedChatId) return;

    try {
      // Set the draft input to the message content
      setDraftInput(message.content);

      // Delete this message and all subsequent messages
      await messagesApi.deleteAfter(selectedChatId, message.id);

      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', selectedChatId] });

      toast.success('Message ready to edit');
    } catch (error) {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMutation.mutate(messageId);
  };

  const handleRegenerateMessage = async (messageId: string) => {
    if (!selectedChatId) return;

    try {
      // Delete this message and all subsequent messages
      await messagesApi.deleteAfter(selectedChatId, messageId);

      // Invalidate queries to refresh the message list
      await queryClient.invalidateQueries({ queryKey: ['messages', selectedChatId] });

      // Trigger a new stream for the assistant response
      startStream(settings);

      toast.success('Regenerating response');
    } catch (error) {
      toast.error('Failed to regenerate message');
    }
  };

  // No chat selected - show "Start A Conversation" screen
  if (!selectedChatId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-center space-y-5">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 shadow-lg">
              <MessageSquare className="h-10 w-10 text-slate-50" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-900">Start A Conversation</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Create a chat to begin. You can switch mode, speed, and model preferences in Settings.
            </p>
          </div>
          <Button
            onClick={() => createChatMutation.mutate()}
            disabled={createChatMutation.isPending}
            className="bg-slate-900 text-slate-50 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createChatMutation.isPending ? 'Creating...' : 'New Chat'}
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 md:p-4">
        <MessageSkeleton />
      </div>
    );
  }

  // Main thread and needs onboarding - show "Begin Onboarding" button
  // This takes priority over showing existing messages
  if (needsOnboarding) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-center space-y-5">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 shadow-lg">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-900">Welcome to Starbot</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Let me get to know you better so I can provide personalized assistance. This will only take a moment.
            </p>
          </div>
          <Button
            onClick={() => startOnboardingMutation.mutate()}
            disabled={startOnboardingMutation.isPending}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
          >
            {startOnboardingMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {startOnboardingMutation.isPending ? 'Starting...' : 'Begin Onboarding'}
          </Button>
        </div>
      </div>
    );
  }

  // Normal chat view
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <MessageList
        messages={messages || []}
        status={status}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onRegenerateMessage={handleRegenerateMessage}
      />
      <ChatInput onSend={handleSend} disabled={!!status || sendMutation.isPending} />
    </div>
  );
}
