import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, DollarSign, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../utils/currency';
import SellModal from './SellModal';

export default function InventoryCard({ item, onEdit, onDelete, t, viewMode = 'grid', isSelectionMode = false, isSelected = false, onToggleSelect }) {
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);

    // Fallback for t if not provided (safety)
    const safeT = t || {
        price: 'Price',
        unit: 'unit',
        leftInStock: 'left in stock',
        newItem: 'New',
        sellItem: 'Sell Item'
    };

    const handleCardClick = (e) => {
        if (isSelectionMode) {
            e.stopPropagation();
            onToggleSelect(item.id);
        } else {
            setIsSellModalOpen(true);
        }
    };

    if (viewMode === 'list') {
        return (
            <>
                <motion.div
                    layout
                    layoutId={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    whileTap={{ scale: 0.99 }}
                    className={`group relative flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'}`}
                    onClick={handleCardClick}
                >
                    {isSelectionMode && (
                        <div className="pl-1">
                            {isSelected ? (
                                <CheckCircle2 className="text-primary fill-primary/20" size={24} />
                            ) : (
                                <Circle className="text-muted-foreground" size={24} />
                            )}
                        </div>
                    )}

                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                        <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                            <h3 className="font-semibold text-foreground break-words text-base line-clamp-2">{item.name}</h3>
                            {item.stock < 5 && (
                                <div className={clsx(
                                    "flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5",
                                    item.stock === 0 ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                                )}>
                                    <span>{item.stock}</span>
                                    <AlertTriangle size={12} strokeWidth={3} />
                                </div>
                            )}
                        </div>
                        <p className="text-muted-foreground text-[10px] sm:text-xs mt-0.5 truncate">{item.category}</p>
                        <div className="flex items-baseline gap-1 mt-1 sm:mt-2 truncate w-full pr-1">
                            <span className="font-bold text-foreground text-base sm:text-lg truncate">{formatCurrency(item.price)}</span>
                            <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0"> / {safeT.unit}</span>
                        </div>
                    </div>

                    {/* Actions - Hide in selection mode */}
                    {!isSelectionMode && (
                        <div className="flex flex-col gap-2 px-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsSellModalOpen(true); }}
                                className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 shadow-sm"
                                title={safeT.sellItem}
                            >
                                <DollarSign size={18} />
                            </button>
                        </div>
                    )}

                    {/* Hover Actions (Edit/Delete) - Hide in selection mode */}
                    {!isSelectionMode && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-sm">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-destructive"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </motion.div>
                <SellModal
                    isOpen={isSellModalOpen}
                    onClose={() => setIsSellModalOpen(false)}
                    item={item}
                    t={safeT}
                />
            </>
        );
    }

    return (
        <>
            <motion.div
                layout
                layoutId={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileTap={{ scale: 0.98 }}
                className={`group relative flex flex-col gap-1.5 cursor-pointer p-2 rounded-2xl transition-all shadow-sm hover:shadow-md ${isSelected ? 'bg-primary/5 ring-2 ring-primary border border-transparent' : 'bg-card border border-border/50 hover:border-border'}`}
                onClick={handleCardClick}
            >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                    <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Selection Overlay */}
                    {isSelectionMode && (
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            {isSelected ? (
                                <div className="bg-primary text-white p-2 rounded-full shadow-lg scale-110 transiton-transform">
                                    <CheckCircle2 size={32} />
                                </div>
                            ) : (
                                <div className="bg-white/50 text-white p-2 rounded-full shadow-lg hover:bg-white/80 transition-colors">
                                    <Circle className="text-gray-600" size={32} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hover Actions - Hide in Selection Mode */}
                    {!isSelectionMode && (
                        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                className="bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-white text-gray-700 dark:bg-black/90 dark:hover:bg-black dark:text-white"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                className="bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-white text-destructive dark:bg-black/90 dark:hover:bg-black dark:text-red-400"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col mt-2">
                    <div className="flex items-start justify-between gap-1">
                        <h3 className="font-semibold text-foreground truncate text-sm">{item.name}</h3>
                    </div>
                    <p className="text-muted-foreground text-[10px] mt-0.5 truncate">{item.category}</p>

                    <div className="flex items-center justify-between mt-1.5 gap-1 overflow-visible">
                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                            <div className="flex items-baseline gap-1 flex-wrap">
                                <span className="font-semibold text-foreground text-sm leading-none">{formatCurrency(item.price)}</span>
                                <span className="text-muted-foreground text-[10px] shrink-0 leading-none">/{safeT.unit}</span>
                            </div>
                            {item.stock < 5 && (
                                <div className={clsx(
                                    "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md self-start mt-1",
                                    item.stock === 0 ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                                )}>
                                    <span>{item.stock}</span>
                                    <AlertTriangle size={12} strokeWidth={3} />
                                </div>
                            )}
                        </div>

                        {!isSelectionMode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsSellModalOpen(true); }}
                                className="bg-primary text-white p-2 rounded-full shadow-md hover:scale-105 hover:bg-primary/90 shrink-0 transition-all mb-0.5"
                                title={safeT.sellItem}
                            >
                                <DollarSign size={14} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
            <SellModal
                isOpen={isSellModalOpen}
                onClose={() => setIsSellModalOpen(false)}
                item={item}
                t={safeT}
            />
        </>
    );
}
