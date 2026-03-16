import { api } from '../api';

export interface UserSettings {
  mode: 'quick' | 'standard' | 'deep';
  auto: boolean;
  thinking: boolean;
  modelPrefs: string | null;
  theme: 'light' | 'dark' | 'system';
}

export const settingsApi = {
  async get(): Promise<UserSettings> {
    return api.get<UserSettings>('/user/settings');
  },

  async update(data: Partial<UserSettings>): Promise<UserSettings> {
    return api.patch<UserSettings>('/user/settings', data);
  },
};
