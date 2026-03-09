import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Check } from 'lucide-react';
import { useInventoryStore } from '../store/useInventoryStore';

export default function SortFilterMenu({ t }) {
    const [isOpen, setIsOpen] = useState(false);
    const { sortBy, setSortBy } = useInventoryStore();
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const options = [
        { value: 'newest', label: t.newest },
        { value: 'price-asc', label: t.priceLowHigh },
        { value: 'price-desc', label: t.priceHighLow },
        { value: 'stock-asc', label: t.stockLowHigh },
        { value: 'stock-desc', label: t.stockHighLow },
    ];

    const handleSelect = (value) => {
        setSortBy(value);
        setIsOpen(false);
    };

    return (
        <div className="relative z-50" ref={menuRef}>
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1.5 sm:p-2 rounded-full border transition-all flex items-center justify-center shrink-0 ${isOpen ? 'bg-primary text-white border-primary' : 'bg-card border-border hover:shadow-md text-foreground'
                    }`}
            >
                <SlidersHorizontal size={16} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl shadow-xl border border-border overflow-hidden"
                    >
                        <div className="py-2">
                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t.sortBy}
                            </div>
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${sortBy === option.value
                                        ? 'bg-muted text-primary font-medium'
                                        : 'text-foreground hover:bg-muted/50'
                                        }`}
                                >
                                    {option.label}
                                    {sortBy === option.value && <Check size={16} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
