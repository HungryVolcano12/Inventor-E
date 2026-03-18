import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
    persist(
        (set, get) => ({
            items: [], // Array of { id, name, price, stock, cartQuantity }
            taxRate: 0, // Percentage (e.g., 10 for 10%)
            discountValue: 0,
            discountType: 'percentage', // 'percentage' | 'flat'
            isOpen: false, // Whether the cart drawer is open

            // Drawer actions
            openCart: () => set({ isOpen: true }),
            closeCart: () => set({ isOpen: false }),
            toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

            // Cart actions
            addItem: (item) => set((state) => {
                const existingItem = state.items.find(i => i.id === item.id);
                // Respect stock limits
                if (existingItem) {
                    if (existingItem.cartQuantity >= existingItem.stock) return state;
                    return {
                        items: state.items.map(i =>
                            i.id === item.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i
                        )
                    };
                }
                return {
                    items: [...state.items, { ...item, cartQuantity: 1 }]
                };
            }),

            removeItem: (itemId) => set((state) => ({
                items: state.items.filter(i => i.id !== itemId)
            })),

            updateQuantity: (itemId, amount) => set((state) => {
                return {
                    items: state.items.map(i => {
                        if (i.id === itemId) {
                            const newQuantity = Math.max(1, Math.min(i.stock, i.cartQuantity + amount));
                            return { ...i, cartQuantity: newQuantity };
                        }
                        return i;
                    })
                };
            }),
            
            setQuantity: (itemId, cartQuantity) => set((state) => {
                return {
                    items: state.items.map(i => {
                        if (i.id === itemId) {
                            // Ensure it's a number and bounded by 1 and max stock
                            let parsed = parseInt(cartQuantity, 10);
                            if (isNaN(parsed) || parsed < 1) parsed = 1;
                            const newQuantity = Math.min(i.stock, parsed);
                            return { ...i, cartQuantity: newQuantity };
                        }
                        return i;
                    })
                };
            }),

            clearCart: () => set({ items: [], taxRate: 0, discountValue: 0 }),

            // Calculation Modifiers
            setTaxRate: (rate) => set({ taxRate: Math.max(0, rate) }),
            setDiscountValue: (value) => set({ discountValue: Math.max(0, value) }),
            setDiscountType: (type) => set({ discountType: type === 'percentage' ? 'percentage' : 'flat' }),

            // Getters for totals
            getSubtotal: () => {
                return get().items.reduce((total, item) => total + (item.price * item.cartQuantity), 0);
            },
            
            getDiscountAmount: () => {
                const state = get();
                const subtotal = state.getSubtotal();
                
                if (state.discountType === 'percentage') {
                    // e.g. 10% of 100 = 10
                    return subtotal * (state.discountValue / 100);
                } else {
                    // Flat discount, capped at subtotal so it doesn't go below $0
                    return Math.min(subtotal, state.discountValue);
                }
            },
            
            getTaxAmount: () => {
                const state = get();
                const subtotal = state.getSubtotal();
                const discount = state.getDiscountAmount();
                
                // Tax is applied to the discounted subtotal
                const discountedSubtotal = Math.max(0, subtotal - discount);
                return discountedSubtotal * (state.taxRate / 100);
            },

            getTotal: () => {
                const state = get();
                const subtotal = state.getSubtotal();
                const discount = state.getDiscountAmount();
                const tax = state.getTaxAmount();

                return Math.max(0, subtotal - discount + tax);
            }
        }),
        {
            name: 'cart-storage',
            // Do not persist the `isOpen` state
            partialize: (state) => Object.fromEntries(
                Object.entries(state).filter(([key]) => !['isOpen'].includes(key))
            ),
        }
    )
);
