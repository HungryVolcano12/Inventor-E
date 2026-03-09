import localforage from 'localforage';

// Configure localforage
localforage.config({
    name: 'InventorE',
    storeName: 'inventory_storage',
    driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE]
});

export const idbStorage = {
    getItem: async (name) => {
        try {
            const value = await localforage.getItem(name);
            if (value !== null) {
                return value;
            }

            // Migration: Check localStorage if not found in IndexedDB
            const legacyValue = localStorage.getItem(name);
            if (legacyValue) {
                // Determine if we should migrate. 
                // Since this is a cache/store, migrating effectively just means copying it over.
                // We store it as a string just like localStorage did because Zustand's createJSONStorage expects that.
                await localforage.setItem(name, legacyValue);
                // Optional: We could remove it from localStorage to free space, 
                // but keeping it as a backup for a moment might be safer. 
                // Let's rely on the fact that next time 'value' will be found in localforage.
                return legacyValue;
            }
            return null;
        } catch (error) {
            console.error("Storage getItem error:", error);
            return null;
        }
    },
    setItem: async (name, value) => {
        try {
            await localforage.setItem(name, value);
        } catch (error) {
            console.error("Storage setItem error:", error);
        }
    },
    removeItem: async (name) => {
        try {
            await localforage.removeItem(name);
            // Also clean up legacy
            localStorage.removeItem(name);
        } catch (error) {
            console.error("Storage removeItem error:", error);
        }
    }
};
