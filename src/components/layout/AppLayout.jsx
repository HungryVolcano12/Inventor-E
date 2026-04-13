import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import BottomNav from './BottomNav';
import SideNav from './SideNav';

import AddItemSheet from '../AddItemSheet';
import SubscriptionModal from '../SubscriptionModal';
import CartDrawer from '../CartDrawer';
import { useUIStore } from '../../store/useUIStore';
import { useCartStore } from '../../store/useCartStore';
import { Toaster } from 'sonner';

export default function AppLayout() {
    const { isAddSheetOpen, closeAddSheet } = useUIStore();
    const { items, openCart } = useCartStore();
    
    // Total quantity of items in cart
    const totalCartItems = items.reduce((total, item) => total + item.cartQuantity, 0);

    return (
        <div className="bg-background min-h-[100dvh] flex justify-center">
            <div className="w-full max-w-7xl md:flex bg-background min-h-[100dvh] relative shadow-2xl md:border-x border-border">
                {/* Desktop SideNav */}
                <SideNav className="hidden md:flex w-64 border-r border-border flex-col" />
                
                <div className="flex-1 flex flex-col min-w-0">

                    
                    {/* Ensure padding-bottom on mobile for bottomNav, but normal on Desktop */}
                    <div className="flex-1 overflow-x-hidden overflow-y-auto pb-24 md:pb-0 relative">
                        <Outlet />
                    </div>
                </div>

                <BottomNav />
                <AddItemSheet isOpen={isAddSheetOpen} onClose={closeAddSheet} />
                <SubscriptionModal />
                <CartDrawer />
                <Toaster position="top-center" richColors theme="system" />

                {/* Floating Cart Button */}
                <AnimatePresence>
                    {totalCartItems > 0 && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="fixed bottom-24 right-4 z-40 md:right-[calc(50%-200px+16px)]"
                        >
                            <button
                                onClick={openCart}
                                className="bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all relative group"
                            >
                                <ShoppingCart size={24} />
                                <motion.div 
                                    key={totalCartItems} // Re-animate when totalCartItems changes
                                    initial={{ scale: 0.5 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-sm ring-2 ring-background border border-background"
                                >
                                    {totalCartItems > 99 ? '99+' : totalCartItems}
                                </motion.div>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
