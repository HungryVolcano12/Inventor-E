import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
    persist(
        (set) => ({
            theme: 'dark', // 'light' | 'dark'
            language: 'en', // 'en' | 'id'
            textSize: 'medium', // 'small' | 'medium' | 'large'
            color: 'pink', // 'pink' | 'blue' | 'green' | 'purple' | 'orange'
            pushNotifications: false,
            
            // Pro Features: Receipt Customization
            receiptLogo: null, // base64 string
            receiptAddress: '',
            receiptFooter: '',

            setTheme: (theme) => set({ theme }),
            setLanguage: (language) => set({ language }),
            setTextSize: (textSize) => set({ textSize }),
            setColor: (color) => set({ color }),
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
            setPushNotifications: (enabled) => set({ pushNotifications: enabled }),
            
            setReceiptLogo: (logo) => set({ receiptLogo: logo }),
            setReceiptAddress: (address) => set({ receiptAddress: address }),
            setReceiptFooter: (footer) => set({ receiptFooter: footer }),
        }),
        {
            name: 'settings-storage',
        }
    )
);
