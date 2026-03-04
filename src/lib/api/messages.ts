import { api } from '../api';
import { z } from 'zod';

// Re-export from types.ts to keep consistency
import { Message } from '../types';

// API functions
export const messagesApi = {
  delete: (messageId: string) => api.delete(`/messages/${messageId}`),
  deleteAfter: (chatId: string, messageId: string) => api.delete(`/chats/${chatId}/messages/${messageId}/after`),
};
