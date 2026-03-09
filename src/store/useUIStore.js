import { create } from 'zustand';

export const useUIStore = create((set) => ({
    isAddSheetOpen: false,
    openAddSheet: () => set({ isAddSheetOpen: true }),
    closeAddSheet: () => set({ isAddSheetOpen: false }),
}));
