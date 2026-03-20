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
            // Use SECURITY DEFINER RPC to bypass RLS — avoids table-level hang issues
            const myStoreQuery = supabase.rpc('get_my_store').single();
            const myStoreTimeout = new Promise(res => setTimeout(() => res({ data: null, error: null }), 10000));
            const { data } = await Promise.race([myStoreQuery, myStoreTimeout]);

            if (!data) {
                // 1. Check for a pending invite token (from user metadata or localStorage)
                const pendingToken =
                    user.user_metadata?.pending_invite_token ||
                    localStorage.getItem('pending_invite_token');

                if (pendingToken) {
                    // Clear localStorage immediately; metadata cleared on success
                    localStorage.removeItem('pending_invite_token');

                    // Claim with 8-second timeout so hangs don't block forever
                    const claimTimeout = new Promise(res =>
                        setTimeout(() => res({ data: null, error: { message: 'timeout' } }), 8000));
                    const { data: claimResult, error: claimError } = await Promise.race([
                        supabase.rpc('claim_store_invite', { p_token: pendingToken }),
                        claimTimeout
                    ]);

                    const alreadyClaimed = claimResult?.error?.includes?.('already');
                    if ((!claimError && claimResult && !claimResult.error) || alreadyClaimed) {
                        // Success or already-claimed (a previous attempt may have timed out
                        // on client but succeeded on server) — clear metadata and reload
                        supabase.auth.updateUser({ data: { pending_invite_token: null } }).catch(() => {});
                        return get()._loadStoreContext(user);
                    }

                    // Timed out or genuine error — keep metadata token for retry next login
                    console.warn('Invite claim failed/timed out:', claimResult?.error || claimError?.message);
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

            // Set storeId immediately — don't let stores name query delay it
            set({ storeId: data.store_id, userRole: data.role, storeName: null });

            // Load store name and tier in background (with timeout)
            try {
                const storeQuery = supabase
                    .from('stores')
                    .select('name, tier')
                    .eq('id', data.store_id)
                    .single();
                const storeTimeout = new Promise(res => setTimeout(() => res({ data: null, error: null }), 8000));
                const { data: storeData } = await Promise.race([storeQuery, storeTimeout]);
                if (storeData) {
                    set({ storeName: storeData.name || null });
                    if (storeData.tier) {
                        const { useSubscriptionStore } = await import('./useSubscriptionStore');
                        useSubscriptionStore.getState().upgradeTier(storeData.tier);
                    }
                }
            } catch { /* storeName stays null — non-critical */ }
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
        // Clear local state immediately so UI transitions to Sign In right away
        set({ user: null, session: null, storeId: null, userRole: null, storeName: null });
        // Then invalidate server-side session (non-blocking)
        supabase.auth.signOut().catch(() => {});
    },

    isOwner: () => get().userRole === 'owner',
}));
