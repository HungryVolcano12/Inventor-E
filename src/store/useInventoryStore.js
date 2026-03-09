import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/storage';

export const useInventoryStore = create(
    persist(
        (set, get) => ({
            items: [],
            transactions: [], // { id, itemId, type: 'SALE'|'ADJUSTMENT', quantity, price, cost, date }
            recentActivity: [], // { id, type, message, date }
            searchQuery: '',
            sortBy: 'newest', // 'newest', 'price-asc', 'price-desc', 'stock-asc', 'stock-desc'
            customCategories: [],
            setSearchQuery: (query) => set({ searchQuery: query }),
            setSortBy: (sort) => set({ sortBy: sort }),

            // Helper to log activity
            logActivity: (type, message) => set((state) => {
                const newActivity = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    type, // 'ADD', 'SALE', 'UPDATE', 'DELETE'
                    message,
                    date: new Date().toISOString()
                };
                // Keep only last 20 activities
                return { recentActivity: [newActivity, ...state.recentActivity].slice(0, 20) };
            }),

            addCategory: (category) => set((state) => ({
                customCategories: [...state.customCategories, category]
            })),

            addItem: (item) => {
                set((state) => ({
                    items: [...state.items, {
                        ...item,
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                        costPrice: parseFloat(item.costPrice) || 0
                    }]
                }));
                get().logActivity('ADD', item.name);
            },

            addTransaction: (transaction) => {
                set((state) => {
                    const safeTransaction = {
                        ...transaction,
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                        date: new Date().toISOString(),
                        price: parseFloat(transaction.price) || 0,
                        cost: parseFloat(transaction.cost) || 0,
                        total: parseFloat(transaction.total) || 0,
                        itemName: transaction.itemName,
                    };
                    return {
                        transactions: [...(state.transactions || []), safeTransaction]
                    };
                });

                if (transaction.type === 'SALE') {
                    get().logActivity('SALE', `${transaction.quantity}x ${transaction.itemName}`);
                }
            },

            updateItem: (id, updatedItem) => {
                const oldItem = get().items.find(i => i.id === id);
                if (!oldItem) return;

                set((state) => ({
                    items: state.items.map((item) => item.id === id ? { ...item, ...updatedItem } : item)
                }));

                // Activity Logging for specific fields
                if (updatedItem.stock !== undefined && updatedItem.stock !== oldItem.stock) {
                    const diff = updatedItem.stock - oldItem.stock;
                    get().logActivity('UPDATE', `${oldItem.name} stock ${diff > 0 ? '+' : ''}${diff}`);
                }

                if (updatedItem.name && updatedItem.name !== oldItem.name) {
                    get().logActivity('UPDATE', `Renamed ${oldItem.name} to ${updatedItem.name}`);
                }

                if (updatedItem.price && parseFloat(updatedItem.price) !== parseFloat(oldItem.price)) {
                    get().logActivity('UPDATE', `${oldItem.name} price changed`);
                }

                if (updatedItem.costPrice && parseFloat(updatedItem.costPrice) !== parseFloat(oldItem.costPrice)) {
                    get().logActivity('UPDATE', `${oldItem.name} cost updated`);
                }

                if (updatedItem.category && updatedItem.category !== oldItem.category) {
                    get().logActivity('UPDATE', `${oldItem.name} category changed to ${updatedItem.category}`);
                }

                if (updatedItem.description && updatedItem.description !== oldItem.description) {
                    get().logActivity('UPDATE', `${oldItem.name} description updated`);
                }
            },

            deleteItem: (id) => {
                const item = get().items.find(i => i.id === id);
                set((state) => ({
                    items: state.items.filter((item) => item.id !== id)
                }));
                if (item) get().logActivity('DELETE', item.name);
            },

            deleteItems: (ids) => {
                const itemsToDelete = get().items.filter(i => ids.includes(i.id));
                set((state) => ({
                    items: state.items.filter((item) => !ids.includes(item.id))
                }));
                if (itemsToDelete.length > 0) {
                    get().logActivity('DELETE', `${itemsToDelete.length} items`);
                }
            },

            getFilteredItems: () => {
                const { items, searchQuery, sortBy } = get();

                let filtered = items;

                // 1. Filter
                if (searchQuery) {
                    const lowerQuery = searchQuery.toLowerCase();
                    filtered = items.filter(item =>
                        item.name.toLowerCase().includes(lowerQuery) ||
                        item.category.toLowerCase().includes(lowerQuery)
                    );
                }

                // 2. Sort
                return [...filtered].sort((a, b) => {
                    switch (sortBy) {
                        case 'price-asc':
                            return a.price - b.price;
                        case 'price-desc':
                            return b.price - a.price;
                        case 'stock-asc':
                            return a.stock - b.stock;
                        case 'stock-desc':
                            return b.stock - a.stock;
                        case 'newest':
                        default:
                            return 0; // Keep insertion order
                    }
                });
            }
        }),
        {
            name: 'inventory-storage-v2',
            storage: createJSONStorage(() => idbStorage),
            version: 4, // Bumped to 4 to include recentActivity
            migrate: (persistedState, version) => {
                let state = persistedState;
                if (version < 3) {
                    if (!Array.isArray(state.transactions)) {
                        state.transactions = [];
                    }
                }
                if (version < 4) {
                    state.recentActivity = [];
                }
                return state;
            }
        }
    )
);
