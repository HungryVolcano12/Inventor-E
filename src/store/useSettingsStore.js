import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
    persist(
        (set) => ({
            theme: 'light', // 'light' | 'dark'
            language: 'en', // 'en' | 'id'
            textSize: 'medium', // 'small' | 'medium' | 'large'

            setTheme: (theme) => set({ theme }),
            setLanguage: (language) => set({ language }),
            setTextSize: (textSize) => set({ textSize }),
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
        }),
        {
            name: 'settings-storage',
        }
    )
);
