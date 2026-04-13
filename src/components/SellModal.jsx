import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, DollarSign } from 'lucide-react';
import { useInventoryStore } from '../store/useInventoryStore';
import { formatCurrency } from '../utils/currency';

export default function SellModal({ isOpen, onClose, item, t }) {
    const [quantity, setQuantity] = useState(1);
    const { updateItem, addTransaction } = useInventoryStore();

    if (!isOpen || !item) return null;

    const maxStock = item.stock;

    const handleSell = (e) => {
        e.preventDefault();
        const qty = parseInt(quantity);

        if (qty <= 0 || qty > maxStock) return;

        try {
            // Debug check
            // alert(`Selling: Qty=${qty}, Price=${item.price}, Total=${item.price * qty}`);

            // 1. Update Stock
            updateItem(item.id, { stock: item.stock - qty });

            // 2. Add Transaction
            addTransaction({
                itemId: item.id,
                type: 'SALE',
                quantity: qty,
                price: parseFloat(item.price), // Force number
                cost: parseFloat(item.costPrice) || 0,
                total: parseFloat(item.price) * qty, // Force calculation
                itemName: item.name
            });

            setQuantity(1);
            onClose();
        } catch (error) {
            console.error("Transaction failed:", error);
            onClose(); // Close anyway
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-2xl w-full max-w-sm p-6 shadow-xl border border-border"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-foreground">{t.sellItem}</h3>
                                <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors">
                                    <X size={20} className="text-muted-foreground" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-6 p-3 bg-muted/30 rounded-xl border border-border">
                                <div className="w-16 h-16 bg-white dark:bg-muted rounded-lg shadow-sm overflow-hidden shrink-0">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">{item.stock} {t.leftInStock}</p>
                                </div>
                            </div>

                            <form onSubmit={handleSell}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">{t.quantity}</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-lg font-bold text-foreground hover:bg-muted/80 transition-colors"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            max={maxStock}
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.min(maxStock, Math.max(1, parseInt(e.target.value) || 0)))}
                                            className="flex-1 h-12 text-center text-xl font-bold border-2 border-border rounded-xl focus:border-primary outline-none bg-transparent text-foreground"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                                            className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-lg font-bold text-foreground hover:bg-muted/80 transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="mt-4 flex justify-between items-baseline px-2">
                                        <span className="text-sm text-muted-foreground">Total</span>
                                        <span className="text-xl font-bold text-primary">{formatCurrency(item.price * quantity)}</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={maxStock === 0}
                                    className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                                >
                                    <DollarSign size={20} />
                                    {t.confirmSell}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
