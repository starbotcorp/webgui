import { create } from 'zustand';
import { Settings } from '@/lib/types';
import { settingsApi, UserSettings } from '@/lib/api/settings';

export type ViewMode = 'chat' | 'home' | 'main';

interface UIState {
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;

  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;

  isLogsOpen: boolean;
  setLogsOpen: (open: boolean) => void;
  openLogs: () => void;
  closeLogs: () => void;
  toggleLogs: () => void;

  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  selectedView: ViewMode;
  setSelectedView: (view: ViewMode) => void;

  showWelcomeBanner: boolean;
  dismissWelcomeBanner: () => void;

  settings: Settings;
  settingsLoaded: boolean;
  updateSettings: (settings: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;

  draftInput: string;
  setDraftInput: (input: string) => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistSettings(settings: Settings) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    settingsApi.update({
      mode: settings.mode,
      auto: settings.auto,
      thinking: settings.thinking,
    }).catch((err) => console.error('[Settings] Failed to persist:', err));
  }, 500);
}

export const useUIStore = create<UIState>((set, get) => ({
  selectedChatId: null,
  setSelectedChatId: (id) => set({ selectedChatId: id }),

  isSettingsOpen: false,
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  isLogsOpen: false,
  setLogsOpen: (open) => set({ isLogsOpen: open }),
  openLogs: () => set({ isLogsOpen: true }),
  closeLogs: () => set({ isLogsOpen: false }),
  toggleLogs: () => set((state) => ({ isLogsOpen: !state.isLogsOpen })),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  selectedView: 'chat',
  setSelectedView: (view) => set({ selectedView: view }),

  showWelcomeBanner: false,
  dismissWelcomeBanner: () => set({ showWelcomeBanner: false }),

  settings: {
    mode: 'standard',
    auto: true,
    thinking: false,
  },
  settingsLoaded: false,
  updateSettings: (newSettings) => {
    set((state) => {
      const merged = { ...state.settings, ...newSettings };
      persistSettings(merged);
      return { settings: merged };
    });
  },
  loadSettings: async () => {
    try {
      const remote = await settingsApi.get();
      set({
        settings: {
          mode: remote.mode,
          auto: remote.auto,
          thinking: remote.thinking,
        },
        settingsLoaded: true,
      });
    } catch (err) {
      console.error('[Settings] Failed to load:', err);
      set({ settingsLoaded: true });
    }
  },

  draftInput: '',
  setDraftInput: (input) => set({ draftInput: input }),
}));
