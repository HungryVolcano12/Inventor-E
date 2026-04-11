import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/storage';

export const useSubscriptionStore = create(
    persist(
        (set) => ({
            currentTier: 'free', // 'free', 'pro', 'business'
            isPaywallOpen: false,
            paywallReason: null, // e.g., 'item_limit_reached', 'role_limit_reached'
            isLoadingCheckout: false,

            upgradeTier: async (tier) => {
                set({ isLoadingCheckout: true });
                try {
                    const { useAuthStore } = await import('./useAuthStore');
                    const { storeId, userRole } = useAuthStore.getState();
                    if (storeId && userRole === 'owner') {
                        const { supabase } = await import('../lib/supabase');
                        const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
                            body: { price_id: tier, store_id: storeId }
                        });
                        
                        if (error) {
                            console.error('Checkout error:', error);
                        } else if (data?.url) {
                            window.location.href = data.url;
                        }
                    }
                } catch (e) {
                    console.error('Checkout error:', e);
                } finally {
                    set({ isLoadingCheckout: false });
                }
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
