import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '@/lib/api/chats';
import { API_BASE_URL } from '@/lib/config';
import { Message, Settings } from '@/lib/types';
import { toast } from 'sonner';

export function useChatStream(chatId: string | null) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => chatId ? chatsApi.getMessages(chatId) : Promise.resolve([]),
    enabled: !!chatId,
  });

  // Abort stream when chatId changes to a DIFFERENT chat
  useEffect(() => {
    return () => {
      // Only abort on unmount or when chatId actually changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [chatId]);

  const startStream = async (settings?: Partial<Settings>) => {
    if (!chatId) return;

    // Abort any existing stream for this chat
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const streamChatId = chatId; // Capture at start

    // Define event handler inside startStream to have access to streamChatId
    const handleSSEEvent = (eventType: string, data: any) => {
      switch (eventType) {
        case 'status':
          setStatus(data.message || '');
          break;

        case 'token.delta':
          queryClient.setQueryData<Message[]>(['messages', streamChatId], (old) => {
            const messages = old ?? [];
            const lastMsg = messages[messages.length - 1];

            if (lastMsg?.role === 'assistant' && !lastMsg.metadata?.final) {
              return [
                ...messages.slice(0, -1),
                { ...lastMsg, content: lastMsg.content + (data.text || data.delta) }
              ];
            } else {
              return [...messages, {
                id: data.message_id || 'temp-assistant',
                chatId: streamChatId,
                role: 'assistant',
                content: data.text || data.delta || '',
                createdAt: new Date().toISOString(),
              }];
            }
          });
          break;

        case 'message.final':
          queryClient.setQueryData<Message[]>(['messages', streamChatId], (old) => {
            const messages = old ?? [];
            const lastMsg = messages[messages.length - 1];

            if (lastMsg?.role === 'assistant') {
              return [...messages.slice(0, -1), {
                id: data.message_id || data.id,
                chatId: streamChatId,
                role: 'assistant',
                content: data.content,
                createdAt: new Date().toISOString(),
                metadata: { final: true, ...data.usage },
              }];
            }

            return [...messages, {
              id: data.message_id || data.id || 'temp-assistant-final',
              chatId: streamChatId,
              role: 'assistant',
              content: data.content || '',
              createdAt: new Date().toISOString(),
              metadata: { final: true, ...data.usage },
            }];
        });
        setStatus('');
        break;

        case 'message.stop':
          setStatus('');
          break;

        case 'inference.complete':
          setStatus('');
          break;

        case 'chat.updated':
          queryClient.invalidateQueries({ queryKey: ['chat', streamChatId] });
          break;

        case 'error':
        case 'run.error':
          toast.error(data.message || 'An error occurred');
          setStatus('');
          break;
      }
    };

    try {
      // Get user's timezone for temporal context
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'X-Client-Timezone': userTimezone,
        },
        credentials: 'include',
        body: JSON.stringify({
          mode: settings?.mode || 'standard',
          auto: settings?.auto ?? true,
          thinking: settings?.thinking ?? false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';
      let currentDataLines: string[] = [];

      const flushCurrentEvent = () => {
        if (currentDataLines.length === 0) {
          currentEvent = 'message';
          return;
        }

        const rawData = currentDataLines.join('\n');
        currentDataLines = [];

        try {
          const parsedData = JSON.parse(rawData);
          handleSSEEvent(currentEvent, parsedData);
        } catch {
          // Ignore parse errors for malformed SSE data
        }

        currentEvent = 'message';
      };

      const processLine = (rawLine: string) => {
        const line = rawLine.replace(/\r$/, '');

        if (!line) {
          flushCurrentEvent();
          return;
        }

        // SSE comments begin with ":" and should be ignored.
        if (line.startsWith(':')) {
          return;
        }

        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim() || 'message';
          return;
        }

        if (line.startsWith('data:')) {
          currentDataLines.push(line.slice(5).trimStart());
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }
      }

      // Handle any trailing line/event if the stream closes without a blank line.
      if (buffer.length > 0) {
        // Add newline to ensure last line is processed
        buffer += '\n';
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            processLine(line);
          }
        }
      }
      flushCurrentEvent();

      // Clear status when stream completes normally
      setStatus('');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Stream was aborted (e.g., user sent a new message) - reset status
        setStatus('');
        return;
      }
      if (err instanceof Error) {
        const errorMessage = err.message.includes('Failed to fetch')
          ? 'Network error. Please check your connection.'
          : err.message;
        toast.error(errorMessage);
        setStatus('');
      }
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [chatId]);

  return { messages, isLoading, error, status, startStream };
}
