import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export const useInventoryStore = create((set, get) => ({
    items: [],
    transactions: [],
    recentActivity: [],
    searchQuery: '',
    sortBy: 'newest',
    customCategories: [],
    loading: false,

    setSearchQuery: (query) => set({ searchQuery: query }),
    setSortBy: (sort) => set({ sortBy: sort }),

    // Load all data from Supabase for the current store
    loadData: async () => {
        const { storeId } = useAuthStore.getState();
        if (!storeId) return;
        set({ loading: true });

        const [itemsRes, txRes] = await Promise.all([
            supabase.rpc('get_store_items', { p_store_id: storeId }),
            supabase.rpc('get_store_transactions', { p_store_id: storeId }),
        ]);

        if (itemsRes.error) console.error('Error fetching inventory items:', itemsRes.error);
        if (txRes.error) console.error('Error fetching transactions:', txRes.error);

        const items = (itemsRes.data || []).map(mapItemFromDB);
        const transactions = (txRes.data || []).map(mapTxFromDB);

        // Build recent activity from transactions
        const recentActivity = transactions.slice(0, 20).map(tx => ({
            id: tx.id,
            type: tx.type === 'SALE' ? 'SALE' : 'UPDATE',
            message: `${tx.quantity}x ${tx.itemName}`,
            date: tx.date
        }));

        set({ items, transactions, recentActivity, loading: false });

        // Subscribe to real-time updates
        get()._subscribeToRealtime();
    },

    _channel: null,

    _subscribeToRealtime: () => {
        const { storeId } = useAuthStore.getState();
        if (!storeId) return;

        // Unsubscribe previous
        const prev = get()._channel;
        if (prev) supabase.removeChannel(prev);

        const channel = supabase
            .channel(`store-${storeId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `store_id=eq.${storeId}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    set(state => ({ items: [mapItemFromDB(payload.new), ...state.items] }));
                } else if (payload.eventType === 'UPDATE') {
                    set(state => ({ items: state.items.map(i => i.id === payload.new.id ? mapItemFromDB(payload.new) : i) }));
                } else if (payload.eventType === 'DELETE') {
                    set(state => ({ items: state.items.filter(i => i.id !== payload.old.id) }));
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `store_id=eq.${storeId}` }, (payload) => {
                const tx = mapTxFromDB(payload.new);
                set(state => ({
                    transactions: [tx, ...state.transactions],
                    recentActivity: [{ id: tx.id, type: 'SALE', message: `${tx.quantity}x ${tx.itemName}`, date: tx.date }, ...state.recentActivity].slice(0, 20)
                }));
            })
            .subscribe();

        set({ _channel: channel });
    },

    // Helper to log activity (local only, derived from DB)
    logActivity: (type, message) => set((state) => {
        const newActivity = { id: Date.now().toString(36), type, message, date: new Date().toISOString() };
        return { recentActivity: [newActivity, ...state.recentActivity].slice(0, 20) };
    }),

    addCategory: (category) => set((state) => ({
        customCategories: [...(state.customCategories || []), category]
    })),

    addItem: async (item) => {
        const { storeId } = useAuthStore.getState();
        if (!storeId) return;
        const { data, error } = await supabase.rpc('insert_store_item', {
            p_store_id: storeId,
            p_name: item.name,
            p_category: item.category || '',
            p_price: parseFloat(item.price) || 0,
            p_cost_price: parseFloat(item.costPrice) || 0,
            p_stock: parseInt(item.stock) || 0,
            p_low_stock: parseInt(item.lowStockThreshold) || 5,
            p_desc: item.description || '',
            p_image: item.image || ''
        }).maybeSingle();

        if (error) throw error;
        // Update state directly — don't rely on real-time
        if (data) set(state => ({ items: [mapItemFromDB(data), ...state.items] }));
        return data;
    },

    bulkAddItems: async (itemsArray) => {
        const { storeId } = useAuthStore.getState();
        if (!storeId || !itemsArray || itemsArray.length === 0) return;
        
        // Process sequentially to avoid DB overload and track completions
        for (const item of itemsArray) {
            const { error } = await supabase.rpc('insert_store_item', {
                p_store_id: storeId,
                p_name: item.name,
                p_category: item.category || 'Uncategorized',
                p_price: parseFloat(item.price) || 0,
                p_cost_price: parseFloat(item.costPrice) || 0,
                p_stock: parseInt(item.stock) || 0,
                p_low_stock: parseInt(item.lowStockThreshold) || 5,
                p_desc: item.description || '',
                p_image: item.image || ''
            });
            if (error) console.error("Bulk add error for item:", item.name, error);
        }
        
        // Reload all data after bulk import to get proper generated IDs
        await get().loadData();
    },

    updateItem: async (id, updatedItem) => {
        const dbPayload = {};
        if (updatedItem.name !== undefined) dbPayload.name = updatedItem.name;
        if (updatedItem.category !== undefined) dbPayload.category = updatedItem.category;
        if (updatedItem.price !== undefined) dbPayload.price = parseFloat(updatedItem.price) || 0;
        if (updatedItem.costPrice !== undefined) dbPayload.cost_price = parseFloat(updatedItem.costPrice) || 0;
        if (updatedItem.stock !== undefined) dbPayload.stock = parseInt(updatedItem.stock) || 0;
        if (updatedItem.lowStockThreshold !== undefined) dbPayload.low_stock_threshold = parseInt(updatedItem.lowStockThreshold) || 5;
        if (updatedItem.description !== undefined) dbPayload.description = updatedItem.description;
        if (updatedItem.image !== undefined) dbPayload.image = updatedItem.image;

        const { data: updated, error } = await supabase.rpc('update_store_item', {
            p_item_id: id,
            p_name: dbPayload.name !== undefined ? dbPayload.name : null,
            p_category: dbPayload.category !== undefined ? dbPayload.category : null,
            p_price: dbPayload.price !== undefined ? dbPayload.price : null,
            p_cost_price: dbPayload.cost_price !== undefined ? dbPayload.cost_price : null,
            p_stock: dbPayload.stock !== undefined ? dbPayload.stock : null,
            p_low_stock: dbPayload.low_stock_threshold !== undefined ? dbPayload.low_stock_threshold : null,
            p_desc: dbPayload.description !== undefined ? dbPayload.description : null,
            p_image: dbPayload.image !== undefined ? dbPayload.image : null
        }).maybeSingle();
        if (error) throw error;
        // Update state directly
        if (updated) set(state => ({ items: state.items.map(i => i.id === id ? mapItemFromDB(updated) : i) }));

        // Check for low stock notification
        if (updatedItem.stock !== undefined) {
            const oldItem = get().items.find(i => i.id === id);
            if (oldItem) {
                const threshold = oldItem.lowStockThreshold || 5;
                if (updatedItem.stock <= threshold && oldItem.stock > threshold) {
                    const { pushNotifications, language } = (await import('./useSettingsStore')).useSettingsStore.getState();
                    if (pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification(language === 'en' ? 'Low Stock Alert' : 'Peringatan Stok Rendah', {
                            body: `${oldItem.name} ${language === 'en' ? 'has dropped to' : 'telah turun ke'} ${updatedItem.stock} ${language === 'en' ? 'units' : 'unit'}.`,
                            icon: '/pwa-192x192.png'
                        });
                    }
                }
            }
        }
    },

    deleteItem: async (id) => {
        const item = get().items.find(i => i.id === id);
        const { error } = await supabase.rpc('delete_store_item', { p_item_id: id });
        if (error) throw error;
        // Remove from state directly
        set(state => ({ items: state.items.filter(i => i.id !== id) }));
        if (item) get().logActivity('DELETE', item.name);
    },

    deleteItems: async (ids) => {
        const { error } = await supabase.rpc('delete_store_items', { p_item_ids: ids });
        if (error) throw error;
        // Remove from state directly
        set(state => ({ items: state.items.filter(i => !ids.includes(i.id)) }));
        get().logActivity('DELETE', `${ids.length} items`);
    },

    addTransaction: async (transaction) => {
        const { storeId } = useAuthStore.getState();
        if (!storeId) return;
        
        const payload = {
            store_id: storeId,
            item_id: transaction.itemId,
            item_name: transaction.itemName,
            type: transaction.type || 'SALE',
            quantity: parseInt(transaction.quantity) || 0,
            price: parseFloat(transaction.price) || 0,
            total: parseFloat(transaction.total) || parseFloat(transaction.price) * parseInt(transaction.quantity) || 0,
            cost: parseFloat(transaction.cost) || 0,
        };

        const stateUser = useAuthStore.getState().user;
        if (stateUser) {
            payload.cashier_name = stateUser.user_metadata?.full_name || stateUser.email || 'Unknown';
        }

        if (transaction.customer_id) {
            payload.customer_id = transaction.customer_id;
        }

        const { error, data } = await supabase.from('transactions').insert(payload).select().maybeSingle();
        if (error) throw error;
        
        // Optimistic update
        set(state => ({ transactions: [mapTxFromDB(data || payload), ...state.transactions] }));
    },

    getFilteredItems: () => {
        const { items, searchQuery, sortBy } = get();
        let filtered = items;
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = items.filter(item =>
                item.name.toLowerCase().includes(lowerQuery) ||
                (item.category || '').toLowerCase().includes(lowerQuery)
            );
        }
        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'price-asc': return a.price - b.price;
                case 'price-desc': return b.price - a.price;
                case 'stock-asc': return a.stock - b.stock;
                case 'stock-desc': return b.stock - a.stock;
                case 'newest':
                default: return 0;
            }
        });
    },

    getDeadStock: (days = 60) => {
        const { items, transactions } = get();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const salesSinceCutoff = new Set(
            transactions
                .filter(tr => tr.type === 'SALE' && new Date(tr.date) >= cutoff)
                .map(tr => tr.itemId)
        );
        return items.filter(item => !salesSinceCutoff.has(item.id) && item.stock > 0);
    }
}));

// --- DB ↔ App field mappers ---
function mapItemFromDB(row) {
    return {
        id: row.id,
        name: row.name,
        category: row.category || '',
        price: row.price || 0,
        costPrice: row.cost_price || 0,
        stock: row.stock || 0,
        lowStockThreshold: row.low_stock_threshold || 5,
        description: row.description || '',
        image: row.image || '',
        createdAt: row.created_at,
    };
}

function mapTxFromDB(row) {
    return {
        id: row.id || crypto.randomUUID(),
        itemId: row.item_id,
        itemName: row.item_name,
        type: row.type,
        quantity: row.quantity || 0,
        price: row.price || 0,
        cost: row.cost || 0,
        total: row.total || 0,
        cashierName: row.cashier_name || 'Unknown',
        date: row.date || new Date().toISOString(),
    };
}
