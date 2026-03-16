import { z } from 'zod';
import { api } from '../api';

// ---- Schemas ----

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  displayName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  onboardingStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  lastOnboardingAt: z.string().nullable(),
  _count: z.object({
    projects: z.number(),
    sessions: z.number(),
    facts: z.number(),
    calendars: z.number(),
    messages: z.number().optional(),
  }),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

export const AdminUsersListSchema = z.object({
  users: z.array(AdminUserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const UserFactSchema = z.object({
  id: z.string(),
  userId: z.string(),
  factKey: z.string(),
  factValue: z.string(),
  confidence: z.number(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AdminUserFact = z.infer<typeof UserFactSchema>;

export const AdminUserDetailSchema = z.object({
  user: AdminUserSchema.extend({
    token: z.string().nullable().optional(),
  }),
  facts: z.array(UserFactSchema),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    _count: z.object({
      chats: z.number(),
      workspaces: z.number(),
      folders: z.number(),
    }),
  })),
  recentChats: z.array(z.object({
    id: z.string(),
    title: z.string().nullable(),
    projectId: z.string(),
    isFavorite: z.boolean(),
    isMain: z.boolean(),
    updatedAt: z.string(),
    _count: z.object({ messages: z.number() }),
  })),
  sessions: z.array(z.object({
    id: z.string(),
    deviceName: z.string().nullable(),
    userAgent: z.string().nullable(),
    ipAddress: z.string().nullable(),
    createdAt: z.string(),
    lastUsedAt: z.string(),
    expiresAt: z.string(),
  })),
  calendarEvents: z.array(z.object({
    id: z.string(),
    title: z.string(),
    startTime: z.string(),
    endTime: z.string().nullable(),
    status: z.string(),
  })),
});

export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;

// ---- API functions ----

export interface ListUsersParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'email' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const adminApi = {
  listUsers: (params: ListUsersParams = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    const query = qs.toString();
    return api.get(`/admin/users${query ? `?${query}` : ''}`, AdminUsersListSchema);
  },

  getUser: (id: string) =>
    api.get(`/admin/users/${id}`, AdminUserDetailSchema),

  updateUser: (id: string, data: { onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; displayName?: string }) =>
    api.patch(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),

  resetOnboarding: (id: string) =>
    api.post(`/admin/users/${id}/reset-onboarding`, {}),

  updateFact: (id: string, factKey: string, data: { factValue: string; confidence?: number }) =>
    api.post(`/admin/users/${id}/facts/${encodeURIComponent(factKey)}`, data),

  deleteFact: (id: string, factKey: string) =>
    api.delete(`/admin/users/${id}/facts/${encodeURIComponent(factKey)}`),

  getDocs: () =>
    api.get<{ docs: Array<{
      id: string;
      label: string;
      description: string;
      content: string;
      group: string;
      liveVersion?: boolean;
    }> }>('/admin/docs'),
};
