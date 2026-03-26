import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export const useShiftStore = create((set, get) => ({
    currentShift: null,
    isLoading: false,

    fetchCurrentShift: async () => {
        const { storeId, session } = useAuthStore.getState();
        if (!storeId || !session?.user?.id) return;

        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('store_id', storeId)
                .eq('user_id', session.user.id)
                .eq('status', 'OPEN')
                .order('start_time', { ascending: false })
                .maybeSingle();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error fetching shift:', error);
            }

            set({ currentShift: data || null });
        } catch (error) {
            console.error('Failed to fetch shift:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    openShift: async (startingCash) => {
        const { storeId, session } = useAuthStore.getState();
        if (!storeId || !session?.user?.id) throw new Error('Not authenticated');

        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('shifts')
                .insert({
                    store_id: storeId,
                    user_id: session.user.id,
                    starting_cash: startingCash,
                    status: 'OPEN',
                })
                .select()
                .single();

            if (error) throw error;
            set({ currentShift: data });
            return data;
        } finally {
            set({ isLoading: false });
        }
    },

    closeShift: async (actualCash) => {
        const shift = get().currentShift;
        if (!shift) throw new Error('No open shift');

        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('shifts')
                .update({
                    status: 'CLOSED',
                    actual_cash: actualCash,
                    end_time: new Date().toISOString()
                })
                .eq('id', shift.id)
                .select()
                .single();

            if (error) throw error;
            set({ currentShift: null });
            return data;
        } finally {
            set({ isLoading: false });
        }
    },

    updateExpectedCash: async (amountToAdd) => {
        // Called when a transaction happens (e.g. cash sale)
        const shift = get().currentShift;
        if (!shift) return;

        try {
            const newExpected = Number(shift.expected_cash || 0) + Number(amountToAdd);
            const { data, error } = await supabase
                .from('shifts')
                .update({ expected_cash: newExpected })
                .eq('id', shift.id)
                .select()
                .single();

            if (error) throw error;
            set({ currentShift: data });
        } catch (error) {
            console.error('Failed to update expected cash:', error);
        }
    }
}));
