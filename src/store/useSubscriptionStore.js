import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/storage';

export const useSubscriptionStore = create(
    persist(
        (set) => ({
            currentTier: 'free', // 'free', 'pro', 'business'
            isPaywallOpen: false,
            paywallReason: null, // e.g., 'item_limit_reached', 'role_limit_reached'

            upgradeTier: async (tier) => {
                set({ currentTier: tier, isPaywallOpen: false, paywallReason: null });
                // Persist tier to Supabase so staff see the owner's plan
                try {
                    const { useAuthStore } = await import('./useAuthStore');
                    const { storeId, userRole } = useAuthStore.getState();
                    if (storeId && userRole === 'owner') {
                        const { supabase } = await import('../lib/supabase');
                        await supabase.rpc('update_store_tier', { p_store_id: storeId, p_tier: tier });
                    }
                } catch { /* non-critical, ignore */ }
            },

            openPaywall: (reason) => set({ isPaywallOpen: true, paywallReason: reason }),

            closePaywall: () => set({ isPaywallOpen: false, paywallReason: null }),
        }),
        {
            name: 'subscription-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
);
