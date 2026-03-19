import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
    user: null,
    session: null,
    loading: true,
    storeId: null,
    userRole: null, // 'owner' | 'staff'
    storeName: null,

    // Called once on app boot
    initialize: async () => {
        set({ loading: true });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await get()._loadStoreContext(session.user);
            }
            set({ session, user: session?.user ?? null, loading: false });

            // Listen to auth state changes
            supabase.auth.onAuthStateChange(async (_event, session) => {
                set({ session, user: session?.user ?? null });
                if (session?.user) {
                    await get()._loadStoreContext(session.user);
                } else {
                    set({ storeId: null, userRole: null, storeName: null });
                }
            });
        } catch (err) {
            console.error('Auth init error:', err);
            set({ loading: false, user: null, session: null });
        }
    },

    _loadStoreContext: async (user) => {
        const { data, error } = await supabase
            .from('store_members')
            .select('store_id, role, stores(name)')
            .eq('user_id', user.id)
            .single();

        if (error || !data) {
            // New user — check if they have a pending store name in metadata
            const pendingStoreName = user.user_metadata?.pending_store_name;
            if (pendingStoreName) {
                // Create store now, safely outside any component lifecycle
                const { data: newStoreId } = await supabase
                    .rpc('create_store_for_user', { store_name: pendingStoreName });

                if (newStoreId) {
                    // Clear pending metadata so we don't create again on next login
                    await supabase.auth.updateUser({ data: { pending_store_name: null } });
                    set({ storeId: newStoreId, userRole: 'owner', storeName: pendingStoreName });
                    return { store_id: newStoreId, role: 'owner' };
                }
            }
            set({ storeId: null, userRole: null });
            return null;
        }
        set({
            storeId: data.store_id,
            userRole: data.role,
            storeName: data.stores?.name
        });
        return data;
    },

    signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    // Store name is saved in user metadata so _loadStoreContext can create the store
    // safely once auth state resolves — avoiding AbortError from component unmounting
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
