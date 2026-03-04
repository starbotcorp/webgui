import { create } from 'zustand';
import { Settings } from '@/lib/types';

export type ViewMode = 'chat' | 'inbox' | 'dashboard' | 'main';

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
  updateSettings: (settings: Partial<Settings>) => void;

  draftInput: string;
  setDraftInput: (input: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
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
    thinking: false, // false = DeepSeek Chat (V3), true = DeepSeek Reasoner (R1)
  },
  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),

  draftInput: '',
  setDraftInput: (input) => set({ draftInput: input }),
}));
