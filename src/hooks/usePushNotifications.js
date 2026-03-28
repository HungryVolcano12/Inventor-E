import { useEffect, useRef } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';

/**
 * Hook that watches inventory for low-stock items and fires
 * browser push notifications (one per item per session).
 * Only active for Pro and Business tier users.
 */
export function usePushNotifications() {
    const items = useInventoryStore(state => state.items);
    const { user } = useAuthStore();
    const { currentTier } = useSubscriptionStore();

    // Track which item IDs we've already notified this session
    const notifiedRef = useRef(new Set());
    const permissionRef = useRef(null);

    // Request permission once when a Pro/Business user is logged in
    useEffect(() => {
        if (!user || (currentTier !== 'pro' && currentTier !== 'business')) return;
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                permissionRef.current = perm;
            });
        } else {
            permissionRef.current = Notification.permission;
        }
    }, [user, currentTier]);

    // Watch items for low-stock
    useEffect(() => {
        if (!user || (currentTier !== 'pro' && currentTier !== 'business')) return;
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        items.forEach(item => {
            const threshold = item.lowStockThreshold ?? item.low_stock_threshold ?? 5;
            const isLow = item.stock <= threshold && item.stock >= 0;
            const alreadyNotified = notifiedRef.current.has(item.id);

            if (isLow && !alreadyNotified) {
                notifiedRef.current.add(item.id);
                const n = new Notification('⚠️ Low Stock Alert', {
                    body: `"${item.name}" is running low — only ${item.stock} left in stock.`,
                    icon: '/vite.svg',
                    tag: `low-stock-${item.id}`, // prevents duplicate notifications
                });
                // Auto-close after 6 seconds
                setTimeout(() => n.close(), 6000);
            }

            // If restocked above threshold, remove from notified set so it can fire again
            if (!isLow && alreadyNotified) {
                notifiedRef.current.delete(item.id);
            }
        });
    }, [items, user, currentTier]);
}
