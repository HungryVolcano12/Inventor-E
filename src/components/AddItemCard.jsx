import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

export default function AddItemCard({ t, viewMode = 'grid' }) {
    const openAddSheet = useUIStore((state) => state.openAddSheet);

    if (viewMode === 'list') {
        return (
            <motion.div
                layout
                onClick={openAddSheet}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.99 }}
                className="group relative flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer h-full"
            >
                <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                    <Plus className="text-gray-400 group-hover:text-primary transition-colors" size={32} />
                </div>

                <div className="flex-1">
                    <h3 className="font-semibold text-gray-500 group-hover:text-primary transition-colors text-base">{t.addItem}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t.tapToAddShort}</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            onClick={openAddSheet}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex flex-col gap-2 cursor-pointer h-full"
        >
            <div className="relative aspect-square w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 hover:bg-primary/5 hover:border-primary/50 transition-all flex items-center justify-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Plus className="text-gray-400 group-hover:text-primary transition-colors" size={32} />
                </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-3 text-center w-full">
                <h3 className="font-bold text-gray-500 group-hover:text-primary transition-colors text-sm leading-tight">{t.addItem}</h3>
                <p className="text-[10px] text-muted-foreground mt-1 px-1 leading-tight">{t.tapToAddShort}</p>
            </div>
        </motion.div>
    );
}
