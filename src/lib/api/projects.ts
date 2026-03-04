import { api } from '../api';
import { z } from 'zod';

// API returns different data for list vs create
// List: has _count, individual: { project: {...} }
// Create: { project: {...} } without _count

// Individual project schema - what API returns for single project
const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string().nullable(), // API returns null, not undefined
  email: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type Project = z.infer<typeof ProjectSchema>;

// API functions - unwrap wrapped responses
export const projectsApi = {
  list: (email: string) => {
    // Use looser schema for list that allows null userId and includes _count
    const ListProjectSchema = z.object({
      id: z.string(),
      name: z.string(),
      userId: z.string().nullable(),
      email: z.string().nullable(),
      createdAt: z.string().datetime(),
      _count: z.object({
        chats: z.number(),
      }).optional(),
    });

    const response = api.get<{ projects: Project[] }>(`/projects?email=${encodeURIComponent(email)}`, z.object({
      projects: z.array(ListProjectSchema),
    }));
    return response.then(r => r.projects);
  },
  create: (data: { name: string; email: string }) => {
    const response = api.post<{ project: Project }>('/projects', data, z.object({
      project: ProjectSchema,
    }));
    return response.then(r => r.project);
  },
};
