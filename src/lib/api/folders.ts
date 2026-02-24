import { api } from '../api';
import { Folder, FolderSchema } from '../types';
import { z } from 'zod';

// API response wrapper schemas
const FoldersResponseSchema = z.object({
  folders: z.array(FolderSchema),
});

const FolderResponseSchema = z.object({
  folder: FolderSchema,
});

export const foldersApi = {
  list: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/folders`, FoldersResponseSchema);
    return response.folders;
  },

  get: async (id: string) => {
    const response = await api.get(`/folders/${id}`, FolderResponseSchema);
    return response.folder;
  },

  create: async (projectId: string, data: { name: string }) => {
    const response = await api.post(`/projects/${projectId}/folders`, data, FolderResponseSchema);
    return response.folder;
  },

  update: async (id: string, data: Partial<Folder>) => {
    const response = await api.put(`/folders/${id}`, data, FolderResponseSchema);
    return response.folder;
  },

  delete: (id: string) => api.delete<void>(`/folders/${id}`),
};
