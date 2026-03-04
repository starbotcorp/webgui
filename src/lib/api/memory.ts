import { api } from '../api';
import { z } from 'zod';

// Schemas - Match what API actually returns
const MemoryResponseSchema = z.object({
  memory: z.object({
    id: z.string(),
    content: z.string(),
    updatedAt: z.string().datetime().optional(),
  }),
});

export type MemoryResponse = z.infer<typeof MemoryResponseSchema>;

// API functions - unwrap wrapped responses
export const memoryApi = {
  // Project memory (identity)
  getIdentity: () => api.get<MemoryResponse>('/identity', MemoryResponseSchema).then(r => r.memory),
  updateIdentity: (content: string) => api.put<MemoryResponse>('/identity', { content }, MemoryResponseSchema).then(r => r.memory),
  processIdentity: () => api.post('/identity/process', {}),

  // Chat memory
  getChatMemory: (chatId: string) => api.get<MemoryResponse>(`/chats/${chatId}/memory`, MemoryResponseSchema).then(r => r.memory),
  updateChatMemory: (chatId: string, content: string) => api.put<MemoryResponse>(`/chats/${chatId}/memory`, { content }, MemoryResponseSchema).then(r => r.memory),
  processChatMemory: (chatId: string) => api.post(`/chats/${chatId}/memory/process`, {}),

  // Workspace memory
  getWorkspaceMemory: (workspaceId: string) => api.get<MemoryResponse>(`/workspaces/${workspaceId}/memory`, MemoryResponseSchema).then(r => r.memory),
  updateWorkspaceMemory: (workspaceId: string, content: string) => api.put<MemoryResponse>(`/workspaces/${workspaceId}/memory`, { content }, MemoryResponseSchema).then(r => r.memory),
  processWorkspaceMemory: (workspaceId: string) => api.post(`/workspaces/${workspaceId}/memory/process`, {}),
};
