import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/storage';

export const useSubscriptionStore = create(
    persist(
        (set) => ({
            currentTier: 'free', // 'free', 'pro', 'business'
            isPaywallOpen: false,
            paywallReason: null, // e.g., 'item_limit_reached', 'role_limit_reached'

            upgradeTier: (tier) => set({ currentTier: tier, isPaywallOpen: false, paywallReason: null }),

            openPaywall: (reason) => set({ isPaywallOpen: true, paywallReason: reason }),

            closePaywall: () => set({ isPaywallOpen: false, paywallReason: null }),
        }),
        {
            name: 'subscription-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
);
