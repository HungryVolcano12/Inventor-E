import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export const useSupplierStore = create((set, get) => ({
    suppliers: [],
    loading: false,

    fetchSuppliers: async () => {
        const { storeId } = useAuthStore.getState();
        if (!storeId) return;
        set({ loading: true });
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('store_id', storeId)
            .order('name', { ascending: true });
            
        if (!error && data) {
            set({ suppliers: data });
        } else {
            console.error('Error fetching suppliers:', error);
        }
        set({ loading: false });
    },

    addSupplier: async (supplier) => {
        const { storeId } = useAuthStore.getState();
        if (!storeId) throw new Error('No store ID');
        
        const { data, error } = await supabase
            .from('suppliers')
            .insert({
                store_id: storeId,
                name: supplier.name,
                email: supplier.email || null,
                phone: supplier.phone || null,
                address: supplier.address || null
            })
            .select()
            .single();

        if (error) throw error;
        set(state => ({ suppliers: [...state.suppliers, data].sort((a,b) => a.name.localeCompare(b.name)) }));
        return data;
    },

    updateSupplier: async (id, updates) => {
        const { error, data } = await supabase
            .from('suppliers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        set(state => ({
            suppliers: state.suppliers.map(s => s.id === id ? data : s).sort((a,b) => a.name.localeCompare(b.name))
        }));
        return data;
    },

    deleteSupplier: async (id) => {
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        set(state => ({
            suppliers: state.suppliers.filter(s => s.id !== id)
        }));
    }
}));
