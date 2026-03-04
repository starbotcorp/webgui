import { api } from '../api';
import { z } from 'zod';

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.number(),
  due_date: z.string().nullable(),
  estimated_hours: z.number().nullable(),
  actual_hours: z.number().nullable(),
  parent_id: z.string().nullable(),
  chat_id: z.string().nullable(),
  metadata: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
});

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.number().min(0).max(10).optional(),
  chat_id: z.string().optional(),
  parent_id: z.string().optional(),
  metadata: z.any().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.number().min(0).max(10).optional(),
  metadata: z.any().optional(),
});

export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const tasksApi = {
  list: (params?: {
    status?: string;
    priority?: number;
    chat_id?: string;
    parent_id?: string;
    created_after?: string;
    created_before?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority !== undefined) searchParams.set('priority', params.priority.toString());
    if (params?.chat_id) searchParams.set('chat_id', params.chat_id);
    if (params?.parent_id) searchParams.set('parent_id', params.parent_id);
    if (params?.created_after) searchParams.set('created_after', params.created_after);
    if (params?.created_before) searchParams.set('created_before', params.created_before);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const url = `/tasks${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return api.get<{ success: boolean; data: Task[]; pagination: { page: number; limit: number; total: number } }>(
      url,
      z.object({
        success: z.boolean(),
        data: z.array(TaskSchema),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
        }),
      })
    ).then(r => r.data);
  },
  get: (taskId: string) => api.get<{ success: boolean; data: Task }>(`/tasks/${taskId}`, z.object({
    success: z.boolean(),
    data: TaskSchema,
  })).then(r => r.data),
  create: (data: CreateTaskInput) => api.post<{ success: boolean; data: Task }>('/tasks', data, z.object({
    success: z.boolean(),
    data: TaskSchema,
  })).then(r => r.data),
  update: (taskId: string, data: UpdateTaskInput) => api.put<{ success: boolean; data: Task }>(`/tasks/${taskId}`, data, z.object({
    success: z.boolean(),
    data: TaskSchema,
  })).then(r => r.data),
  delete: (taskId: string) => api.delete(`/tasks/${taskId}`),
  start: (taskId: string) => api.post<{ success: boolean; data: Task }>(`/tasks/${taskId}/start`, {}, z.object({
    success: z.boolean(),
    data: TaskSchema,
  })).then(r => r.data),
  complete: (taskId: string) => api.post<{ success: boolean; data: Task }>(`/tasks/${taskId}/complete`, {}, z.object({
    success: z.boolean(),
    data: TaskSchema,
  })).then(r => r.data),
  cancel: (taskId: string) => api.post<{ success: boolean; data: Task }>(`/tasks/${taskId}/cancel`, {}, z.object({
    success: z.boolean(),
    data: TaskSchema,
  })).then(r => r.data),
  analytics: (chatId?: string) => api.get<{ success: boolean; data: any }>(
    `/tasks/analytics${chatId ? `?chat_id=${chatId}` : ''}`,
    z.object({
      success: z.boolean(),
      data: z.any(),
    })
  ).then(r => r.data),
};
