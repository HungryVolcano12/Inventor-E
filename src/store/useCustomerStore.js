import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export const useCustomerStore = create((set, get) => ({
    customers: [],
    isLoading: false,

    fetchCustomers: async () => {
        const { storeId } = useAuthStore.getState();
        if (!storeId) return;

        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('store_id', storeId)
                .order('name');

            if (error) throw error;
            set({ customers: data || [] });
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    addCustomer: async (customerData) => {
        const { storeId } = useAuthStore.getState();
        if (!storeId) return;

        try {
            const { data, error } = await supabase
                .from('customers')
                .insert([{ ...customerData, store_id: storeId }])
                .select()
                .single();

            if (error) throw error;
            set({ customers: [...get().customers, data].sort((a,b) => a.name.localeCompare(b.name)) });
            return data;
        } catch (error) {
            console.error('Failed to add customer:', error);
            throw error;
        }
    },

    updateCustomer: async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            set({ customers: get().customers.map(c => c.id === id ? data : c) });
            return data;
        } catch (error) {
            console.error('Failed to update customer:', error);
            throw error;
        }
    },

    deleteCustomer: async (id) => {
        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            set({ customers: get().customers.filter(c => c.id !== id) });
        } catch (error) {
            console.error('Failed to delete customer:', error);
            throw error;
        }
    },
    
    // Automatically called at checkout to update loyalty numbers
    recordCustomerPurchase: async (customerId, totalSpent, pointsEarned) => {
        const customer = get().customers.find(c => c.id === customerId);
        if (!customer) return;

        try {
            const { data, error } = await supabase
                .rpc('increment_customer_stats', {
                    c_id: customerId,
                    spent_add: totalSpent,
                    points_add: pointsEarned
                });
                
            // If the RPC isn't built yet, we can fall back to manual update:
            if (error && error.code === '42883') {
                const updated = {
                    total_spent: Number(customer.total_spent || 0) + totalSpent,
                    points: Number(customer.points || 0) + pointsEarned
                };
                await get().updateCustomer(customerId, updated);
            } else if (error) {
                throw error;
            } else {
                // If RPC succeeded, refresh list
                await get().fetchCustomers();
            }
        } catch (err) {
            console.error('Failed to update loyalty metrics:', err);
        }
    }
}));
