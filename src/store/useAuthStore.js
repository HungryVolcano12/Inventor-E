import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
    user: null,
    session: null,
    loading: true,
    storeId: null,
    userRole: null, // 'owner' | 'staff'
    storeName: null,

    initialize: async () => {
        set({ loading: true });

        // Register the auth listener FIRST so we never miss an event
        supabase.auth.onAuthStateChange(async (_event, session) => {
            if (_event === 'USER_UPDATED') return; // ignore metadata-only updates
            set({ session, user: session?.user ?? null });
            if (session?.user) {
                await get()._loadStoreContext(session.user);
            } else {
                set({ storeId: null, userRole: null, storeName: null });
            }
        });

        // Try to restore an existing session — 8s total timeout prevents stale session hangs
        try {
            const done = new Promise(async (resolve) => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        await get()._loadStoreContext(session.user);
                        set({ session, user: session.user });
                    }
                } catch { /* ignore — listener will handle valid sign-ins */ }
                resolve();
            });
            await Promise.race([done, new Promise(res => setTimeout(res, 8000))]);
        } catch (err) {
            // AbortError or network error on getSession — listener will still fire when ready
            if (err.name !== 'AbortError') console.error('getSession error:', err);
        } finally {
            set({ loading: false });
        }
    },

    _loadStoreContext: async (user) => {
        try {
            const { data } = await supabase
                .from('store_members')
                .select('store_id, role')
                .eq('user_id', user.id)
                .single();

            if (!data) {
                // 1. Check for a pending invite token (staff joining via link)
                const pendingToken = localStorage.getItem('pending_invite_token');
                if (pendingToken) {
                    localStorage.removeItem('pending_invite_token');
                    const { data: claimResult, error: claimError } = await supabase
                        .rpc('claim_store_invite', { p_token: pendingToken });
                    if (!claimError && claimResult && !claimResult.error) {
                        // Claim succeeded — reload to pick up the new store_members row
                        return get()._loadStoreContext(user);
                    }
                    // Claim failed (expired/used) — don't create a new store for this user
                    console.warn('Invite claim failed:', claimResult?.error || claimError?.message);
                    set({ storeId: null, userRole: null });
                    return null;
                }

                // 2. Only create a store if user signed up via main Auth (has pending_store_name)
                // Users from JoinStore won't have this — skipping prevents accidental store creation
                const pendingStoreName = user.user_metadata?.pending_store_name;
                if (!pendingStoreName) {
                    set({ storeId: null, userRole: null });
                    return null;
                }

                const { data: newStoreId } = await supabase
                    .rpc('create_store_for_user', { store_name: pendingStoreName });
                if (newStoreId) {
                    set({ storeId: newStoreId, userRole: 'owner', storeName: pendingStoreName });
                }
                return;
            }

            // Load store name and tier (for staff to inherit owner's plan)
            const { data: storeData } = await supabase
                .from('stores')
                .select('name, tier')
                .eq('id', data.store_id)
                .single();

            set({
                storeId: data.store_id,
                userRole: data.role,
                storeName: storeData?.name || null
            });

            // Sync tier to subscription store so staff see owner's plan
            if (storeData?.tier) {
                const { useSubscriptionStore } = await import('./useSubscriptionStore');
                useSubscriptionStore.getState().upgradeTier(storeData.tier);
            }
        } catch (e) {
            console.error('loadStoreContext error:', e);
        }
    },

    signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    signUp: async (email, password, storeName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { pending_store_name: storeName || 'My Store' }
            }
        });
        if (error) throw error;
        return data;
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, storeId: null, userRole: null, storeName: null });
    },

    isOwner: () => get().userRole === 'owner',
}));
