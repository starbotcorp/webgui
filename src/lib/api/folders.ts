import { api } from '../api';
import { z } from 'zod';

// Re-export from types.ts to keep consistency
import { Folder } from '../types';

// API functions - unwrap wrapped responses
export const foldersApi = {
  list: (projectId: string) => {
    const response = api.get<{ folders: Folder[] }>(`/projects/${projectId}/folders`, z.object({
      folders: z.array(z.any()), // Use any to avoid circular type issues
    }));
    return response.then(r => r.folders);
  },
  create: (projectId: string, data: { name: string }) => {
    const response = api.post<{ folder: Folder }>(`/projects/${projectId}/folders`, data, z.object({
      folder: z.any(), // Use any to avoid circular type issues
    }));
    return response.then(r => r.folder);
  },
  delete: (folderId: string) => api.delete(`/folders/${folderId}`),
};
