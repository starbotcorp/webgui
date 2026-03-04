import { api } from '../api';
import { z } from 'zod';

// Re-export from types.ts to keep consistency
import { Chat, Message } from '../types';

// API functions - unwrap wrapped responses
export const chatsApi = {
  list: (projectId: string, clientSource?: string) => {
    const url = `/projects/${projectId}/chats${clientSource ? `?clientSource=${encodeURIComponent(clientSource)}` : ''}`;
    const response = api.get<{ chats: Chat[] }>(url, z.object({
      chats: z.array(z.any()), // Use any to avoid circular type issues
    }));
    return response.then(r => r.chats);
  },
  getMessages: (chatId: string) => api.get<{ messages: Message[] }>(`/chats/${chatId}/messages`, z.object({
      messages: z.array(z.any()),
    })).then(r => r.messages),
  create: (projectId: string, data: { title: string; folderId?: string; clientSource?: string }) => {
    const response = api.post<{ chat: Chat }>(`/projects/${projectId}/chats`, data, z.object({
      chat: z.any(), // Use any to avoid circular type issues
    }));
    return response.then(r => r.chat);
  },
  delete: (chatId: string) => api.delete(`/chats/${chatId}`),
  update: (chatId: string, data: { title?: string }) => {
    const response = api.patch<{ chat: Chat }>(`/chats/${chatId}`, data, z.object({
      chat: z.any(), // Use any to avoid circular type issues
    }));
    return response.then(r => r.chat);
  },
  favorites: (projectId: string) => {
    const response = api.get<{ chats: Chat[] }>(`/projects/${projectId}/chats/favorites`, z.object({
      chats: z.array(z.any()),
    }));
    return response.then(r => r.chats);
  },
  setFavorite: (chatId: string, isFavorite: boolean) => {
    const response = api.patch<{ chat: Chat }>(`/chats/${chatId}/favorite`, { isFavorite }, z.object({
      chat: z.any(),
    }));
    return response.then(r => r.chat);
  },
  setMain: (chatId: string, isMain: boolean) => {
    const response = api.patch<{ chat: Chat }>(`/chats/${chatId}/main`, { isMain }, z.object({
      chat: z.any(),
    }));
    return response.then(r => r.chat);
  },
  getMainOrCreate: () => {
    return api.get<{ chat: Chat }>(`/chats/main/or-create`, z.object({
      chat: z.any(),
    })).then(r => r.chat);
  },
};
