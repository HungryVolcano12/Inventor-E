import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export const useAuthStore = create(
    persist(
        (set, get) => ({

    user: null,
    session: null,
    loading: true,
    storeId: null,
    userRole: null, // 'owner' | 'manager' | 'staff' | 'cashier'
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
            const done = new Promise((resolve) => {
                (async () => {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user) {
                            await get()._loadStoreContext(session.user);
                            set({ session, user: session.user });
                        }
                    } catch { /* ignore — listener will handle valid sign-ins */ }
                    resolve();
                })();
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
            const TIMED_OUT = Symbol('timeout');
            const myStoreQuery = supabase.rpc('get_my_store').single();
            const myStoreTimeout = new Promise(res => setTimeout(() => res(TIMED_OUT), 10000));
            const raceResult = await Promise.race([myStoreQuery, myStoreTimeout]);

            // If timed out: preserve current state (persisted storeId stays intact)
            if (raceResult === TIMED_OUT) {
                console.warn('get_my_store timed out — keeping current state');
                return null;
            }

            const { data } = raceResult;

            if (!data) {
                // 1. Check for a pending invite token (from user metadata or localStorage)
                const pendingToken =
                    user.user_metadata?.pending_invite_token ||
                    localStorage.getItem('pending_invite_token');

                if (pendingToken) {
                    localStorage.removeItem('pending_invite_token');

                    const claimTimeout = new Promise(res =>
                        setTimeout(() => res({ data: null, error: { message: 'timeout' } }), 8000));
                    const { data: claimResult, error: claimError } = await Promise.race([
                        supabase.rpc('claim_store_invite', { p_token: pendingToken }),
                        claimTimeout
                    ]);

                    const alreadyClaimed = claimResult?.error?.includes?.('already');
                    if ((!claimError && claimResult && !claimResult.error) || alreadyClaimed) {
                        supabase.auth.updateUser({ data: { pending_invite_token: null } }).catch(() => {});
                        return get()._loadStoreContext(user);
                    }

                    console.warn('Invite claim failed/timed out:', claimResult?.error || claimError?.message);
                    // Don't reset storeId — keep persisted value, retry next load
                    return null;
                }

                // 2. Only create a store if user signed up via main Auth (has pending_store_name)
                const pendingStoreName = user.user_metadata?.pending_store_name;
                if (!pendingStoreName) {
                    // No store found and no way to create one — only null if not already set
                    if (!get().storeId) set({ storeId: null, userRole: null });
                    return null;
                }

                const { data: newStoreId } = await supabase
                    .rpc('create_store_for_user', { store_name: pendingStoreName });
                if (newStoreId) {
                    set({ storeId: newStoreId, userRole: 'owner', storeName: pendingStoreName });
                }
                return;
            }

            // get_my_store now returns store_name + tier — no extra query needed
            set({ storeId: data.store_id, userRole: data.role, storeName: data.store_name || null });

            // Sync the owner's plan tier to subscription store
            if (data.tier && data.tier !== 'free') {
                const { useSubscriptionStore } = await import('./useSubscriptionStore');
                useSubscriptionStore.getState().upgradeTier(data.tier);
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
        // Clear local state immediately so UI transitions to Sign In right away
        set({ user: null, session: null, storeId: null, userRole: null, storeName: null });
        // Then invalidate server-side session (non-blocking)
        supabase.auth.signOut().catch(() => {});
    },

    isOwner: () => get().userRole === 'owner',
    isManager: () => ['owner', 'manager'].includes(get().userRole),
    isCashier: () => get().userRole === 'cashier',
        }),
        {
            name: 'auth-store-context',
            // Only persist store-related fields — user/session come from Supabase auth
            partialize: (state) => ({
                storeId: state.storeId,
                userRole: state.userRole,
                storeName: state.storeName,
            }),
        }
    )
);
