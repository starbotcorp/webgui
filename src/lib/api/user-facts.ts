import { api } from '../api';
import { z } from 'zod';

const UserFactSchema = z.object({
  id: z.string(),
  userId: z.string(),
  factKey: z.string(),
  factValue: z.string(),
  confidence: z.number(),
  source: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserFact = z.infer<typeof UserFactSchema>;

const UserFactsResponseSchema = z.object({
  facts: z.array(UserFactSchema),
});

const OnboardingStatusSchema = z.object({
  isComplete: z.boolean(),
  collectedFacts: z.array(z.string()),
  requiredKeys: z.array(z.string()),
});

export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

const SetFactResponseSchema = z.object({
  fact: UserFactSchema,
});

const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const userFactsApi = {
  list: () => {
    const response = api.get<{ facts: UserFact[] }>('/user/facts', UserFactsResponseSchema);
    return response.then(r => r.facts);
  },

  set: (data: { factKey: string; factValue: string; source?: string; confidence?: number }) => {
    const response = api.post<{ fact: UserFact }>('/user/facts', data, SetFactResponseSchema);
    return response.then(r => r.fact);
  },

  delete: (factKey: string) => {
    return api.delete<{ success: boolean }>(`/user/facts/${encodeURIComponent(factKey)}`);
  },

  getOnboardingStatus: () => {
    const response = api.get<OnboardingStatus>('/user/facts/onboarding-status', OnboardingStatusSchema);
    return response;
  },

  resetOnboarding: () => {
    return api.post<{ success: boolean; message: string }>('/user/facts/reset-onboarding', {}, SuccessResponseSchema);
  },

  restartMainOnboarding: () => {
    const RestartResponseSchema = z.object({
      success: z.boolean(),
      chatId: z.string(),
      message: z.string(),
    });
    return api.post<{ success: boolean; chatId: string; message: string }>('/user/facts/restart-main-onboarding', {}, RestartResponseSchema);
  },
};
