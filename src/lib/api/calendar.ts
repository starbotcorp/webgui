import { api } from '../api';
import { z } from 'zod';

// Schemas
const CalendarEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(),
  timezone: z.string(),
  recurrence: z.string().nullable(),
  reminder: z.string().nullable(),
  status: z.string(),
  location: z.string().nullable(),
  color: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CreateEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  recurrence: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  reminder: z.string().optional(),
  location: z.string().optional(),
  color: z.string().optional(),
});

const UpdateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  recurrence: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  reminder: z.string().optional(),
  location: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

// API functions
export const calendarApi = {
  list: (params?: { startDate?: string; endDate?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.status) searchParams.set('status', params.status);
    const url = `/calendar${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return api.get<CalendarEvent[]>(url, z.array(CalendarEventSchema));
  },
  get: (eventId: string) => api.get<CalendarEvent>(`/calendar/${eventId}`, CalendarEventSchema),
  create: (data: CreateEventInput) => api.post<CalendarEvent>('/calendar', data, CalendarEventSchema),
  update: (eventId: string, data: UpdateEventInput) => api.patch<CalendarEvent>(`/calendar/${eventId}`, data, CalendarEventSchema),
  delete: (eventId: string) => api.delete(`/calendar/${eventId}`),
  upcoming: (days?: number) => api.get<CalendarEvent[]>(`/calendar/upcoming${days ? `?days=${days}` : ''}`, z.array(CalendarEventSchema)),
};
