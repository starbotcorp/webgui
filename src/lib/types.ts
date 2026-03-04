import { z } from 'zod';

// These schemas should match what the API actually returns
// Project API returns: id, name, userId?, email?, createdAt, updatedAt, _count?
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string().nullable().optional(),
  email: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  _count: z.object({
    chats: z.number(),
  }).optional(),
});

// Folder API returns: id, projectId?, name, createdAt?, chats?
export const FolderSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  name: z.string(),
  createdAt: z.string().optional(),
  chats: z.array(z.object({
    id: z.string(),
    title: z.string(),
  })).optional(),
});

// Chat API returns: id, projectId?, workspaceId?, folderId?, title, clientSource?, createdAt, updatedAt, folder?, isFavorite?, isMain?
// Note: _count is only returned when listing chats, not individual chat
export const ChatSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable(),
  workspaceId: z.string().nullable(),
  folderId: z.string().nullable(),
  title: z.string(),
  clientSource: z.string().nullable(),
  isFavorite: z.boolean().default(false),
  isMain: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  folder: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const SettingsSchema = z.object({
  mode: z.enum(['quick', 'standard', 'deep']).default('standard'),
  auto: z.boolean().default(true),
  thinking: z.boolean().default(false), // true = use DeepSeek Reasoner (R1), false = use DeepSeek Chat (V3)
});

export type Project = z.infer<typeof ProjectSchema>;
export type Folder = z.infer<typeof FolderSchema>;
export type Chat = z.infer<typeof ChatSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Settings = z.infer<typeof SettingsSchema>;

export interface CreateChatRequest {
    title?: string;
    projectId?: string;
    folderId?: string;
    workspaceId?: string;
    clientSource?: string;
}

export interface SendMessageRequest {
    content: string;
    chatId: string;
    settings?: Partial<Settings>;
}
