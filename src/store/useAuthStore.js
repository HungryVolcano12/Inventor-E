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
    },

    _loadStoreContext: async (user) => {
        const { data, error } = await supabase
            .from('store_members')
            .select('store_id, role, stores(name)')
            .eq('user_id', user.id)
            .single();

        if (error || !data) {
            // No store yet — will be handled on first login
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

    signUp: async (email, password, storeName) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Create a store using a SECURITY DEFINER RPC (bypasses RLS on first signup)
        const user = data.user;
        if (user) {
            const { data: newStoreId, error: storeErr } = await supabase
                .rpc('create_store_for_user', { store_name: storeName || 'My Store' });
            if (storeErr) throw storeErr;

            set({ storeId: newStoreId, userRole: 'owner', storeName: storeName || 'My Store' });
        }
        return data;
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, storeId: null, userRole: null, storeName: null });
    },

    isOwner: () => get().userRole === 'owner',
}));
