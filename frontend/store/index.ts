import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { createUISlice, UISlice } from './slices/ui.slice';
import { createAuthSlice, AuthSlice } from './slices/auth.slice';
import { createFilterSlice, FilterSlice } from './slices/filter.slice';
import { createNotificationSlice, NotificationSlice } from './slices/notification.slice';
import { createAISlice, AISlice } from './slices/ai.slice';

export type AppState = UISlice & AuthSlice & FilterSlice & NotificationSlice & AISlice;

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get, store) => ({
        // @ts-ignore: Zustand middleware composition typing is overly complex, store is strongly typed at export
        ...createUISlice(set, get, store),
        // @ts-ignore
        ...createAuthSlice(set, get, store),
        // @ts-ignore
        ...createFilterSlice(set, get, store),
        // @ts-ignore
        ...createNotificationSlice(set, get, store),
        // @ts-ignore
        ...createAISlice(set, get, store),
      })),
      {
        name: 'goalforge-storage',
        // Only persist these specific parts of the state to localStorage
        partialize: (state) => ({
          filters: state.filters,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'GoalForge-Store' }
  )
);
