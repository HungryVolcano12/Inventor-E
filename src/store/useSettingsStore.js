import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
    persist(
        (set) => ({
            theme: 'dark', // 'light' | 'dark'
            language: 'en', // 'en' | 'id'
            textSize: 'medium', // 'small' | 'medium' | 'large'
            color: 'pink', // 'pink' | 'blue' | 'green' | 'purple' | 'orange'

            setTheme: (theme) => set({ theme }),
            setLanguage: (language) => set({ language }),
            setTextSize: (textSize) => set({ textSize }),
            setColor: (color) => set({ color }),
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
        }),
        {
            name: 'settings-storage',
        }
    )
);
