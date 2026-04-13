import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    ShoppingCart, 
    Trash2, 
    Plus, 
    Minus, 
    Receipt, 
    Tag, 
    Percent, 
    DollarSign,
    MessageCircle,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useShiftStore } from '../store/useShiftStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { formatCurrency } from '../utils/currency';
import { translations } from '../utils/translations';
import { generateReceipt } from '../utils/receiptGenerator';
import { toast } from 'sonner';

export default function CartDrawer() {
    const { language } = useSettingsStore();
    const t = translations[language];

    const { 
        items, 
        isOpen, 
        closeCart, 
        removeItem, 
        updateQuantity, 
        clearCart,
        taxRate,
        setTaxRate,
        discountValue,
        setDiscountValue,
        discountType,
        setDiscountType,
        getSubtotal,
        getDiscountAmount,
        getTaxAmount,
        getTotal
    } = useCartStore();

    const { updateItem, addTransaction } = useInventoryStore();
    const { storeName } = useAuthStore();
    const { currentTier } = useSubscriptionStore();
    const { customers, recordCustomerPurchase } = useCustomerStore();

    // Local states
    const [completedSale, setCompletedSale] = useState(null);
    const [localTax, setLocalTax] = useState(taxRate);
    const [localDiscount, setLocalDiscount] = useState(discountValue);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    // FIX #2: Reset local input state when cart opens so inputs stay in sync with store
    React.useEffect(() => {
        if (isOpen) {
            setLocalTax(taxRate);
            setLocalDiscount(discountValue);
            setPaymentMethod('CASH');
        }
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen) {
            setCompletedSale(null);
            setSelectedCustomerId('');
        }
    }, [isOpen]);

    const handleTaxChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        setLocalTax(e.target.value);
        setTaxRate(val);
    };

    const handleDiscountChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        setLocalDiscount(e.target.value);
        setDiscountValue(val);
    };

    // FIX #1, #7, #10: Fully async checkout — awaits all DB writes before 
    // updating shift cash or clearing cart. Loading state prevents double-tap.
    const handleCheckout = async () => {
        if (items.length === 0 || isProcessing) return;
        setIsProcessing(true);

        const transactionId = Math.random().toString(36).substring(2, 9).toUpperCase();

        try {
            // 1. Await all stock deductions in parallel
            const stockResults = await Promise.allSettled(
                items.map(item =>
                    updateItem(item.id, { stock: Math.max(0, item.stock - item.cartQuantity) })
                )
            );

            const failedStock = stockResults.filter(r => r.status === 'rejected');
            if (failedStock.length > 0) {
                toast.error(
                    language === 'en'
                        ? 'Stock update failed. Please check inventory and try again.'
                        : 'Gagal memperbarui stok. Periksa inventaris dan coba lagi.'
                );
                setIsProcessing(false);
                return;
            }

            // 2. Await all transaction logs in parallel
            const txResults = await Promise.allSettled(
                items.map(item =>
                    addTransaction({
                        itemId: item.id,
                        itemName: item.name,
                        type: 'SALE',
                        quantity: item.cartQuantity,
                        price: item.price,
                        cost: item.cost || 0,
                        customer_id: selectedCustomerId || null,
                        payment_method: paymentMethod,
                    })
                )
            );

            const failedTx = txResults.filter(r => r.status === 'rejected');
            if (failedTx.length > 0) {
                console.error('Transaction log errors:', failedTx);
                // Non-fatal: stock was deducted so proceed but warn
                toast.warning(
                    language === 'en'
                        ? 'Sale recorded but some transactions failed to log.'
                        : 'Penjualan tercatat tapi beberapa transaksi gagal dicatat.'
                );
            }

            const subtotal = getSubtotal();
            const discount = getDiscountAmount();
            const tax = getTaxAmount();
            const total = getTotal();

            const newSale = {
                items: [...items],
                subtotal,
                discount,
                tax,
                total,
                transactionId,
                date: new Date(),
                customer_id: selectedCustomerId || null
            };

            // 3. Update shift cash ONLY for cash payments (FIX #7)
            if (paymentMethod === 'CASH') {
                useShiftStore.getState().updateExpectedCash(total);
            }

            // 4. Handle loyalty points
            if (selectedCustomerId) {
                const pointsEarned = Math.floor(total / 10000);
                recordCustomerPurchase(selectedCustomerId, total, pointsEarned);
            }

            setCompletedSale(newSale);
            clearCart();

            toast.success(t.completeSale || 'Checkout Successful!', {
                description: `Transaction ${transactionId} has been recorded.`
            });
        } catch (err) {
            console.error('Checkout error:', err);
            toast.error(
                language === 'en'
                    ? 'Checkout failed. Please try again.'
                    : 'Pembayaran gagal. Silakan coba lagi.'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleWhatsAppShare = () => {
        if (!completedSale) return;
        const { items, subtotal, discount, tax, total, transactionId, date } = completedSale;
        const sName = storeName || 'Inventor-E Store';
        const { receiptFooter } = useSettingsStore.getState();
        
        let msg = `*${sName.toUpperCase()}*\n`;
        msg += `Receipt: ${transactionId}\n`;
        msg += `Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n\n`;
        items.forEach(i => {
            msg += `${i.name}\n${i.cartQuantity} x ${formatCurrency(i.price)} = ${formatCurrency(i.price * i.cartQuantity)}\n`;
        });
        msg += `\nSubtotal: ${formatCurrency(subtotal)}`;
        if (discount > 0) msg += `\nDiscount: -${formatCurrency(discount)}`;
        if (tax > 0) msg += `\nTax: +${formatCurrency(tax)}`;
        msg += `\n*TOTAL: ${formatCurrency(total)}*\n\n`;
        if (receiptFooter) msg += `${receiptFooter}\n`;
        else msg += `Thank you for your purchase!`;

        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0.5 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-background shadow-2xl z-50 flex flex-col border-l border-border"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                            <div className="flex items-center gap-2 text-foreground">
                                <ShoppingCart size={24} className="text-primary" />
                                <h2 className="text-xl font-bold">{t.currentSale}</h2>
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full ml-2">
                                    {items.length} {t.itemsInCart}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {items.length > 0 && (
                                    <button 
                                        onClick={clearCart}
                                        disabled={isProcessing}
                                        className="p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-full transition-colors mr-2 disabled:opacity-50"
                                        title={t.clearCart}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button 
                                    onClick={closeCart}
                                    className="p-2 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {completedSale ? (
                            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center space-y-6">
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", bounce: 0.5 }}
                                    className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-500"
                                >
                                    <CheckCircle2 size={48} strokeWidth={2.5} />
                                </motion.div>
                                
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black text-foreground">{t.completeSale || 'Transaction Complete!'}</h3>
                                    <p className="text-muted-foreground text-sm font-medium">Receipt #{completedSale.transactionId}</p>
                                    <p className="text-3xl font-black text-primary mt-2">{formatCurrency(completedSale.total)}</p>
                                </div>

                                <div className="w-full space-y-3 pt-6 border-t border-border border-dashed">
                                    <button 
                                        onClick={() => generateReceipt(completedSale)}
                                        className="w-full p-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                                    >
                                        <Receipt size={20} />
                                        Print / Download Receipt
                                    </button>
                                    
                                    <button 
                                        onClick={handleWhatsAppShare}
                                        className="w-full p-4 rounded-xl font-bold bg-[#25D366] text-white hover:bg-[#20BE59] flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                                    >
                                        <MessageCircle size={20} />
                                        Share via WhatsApp
                                    </button>
                                    
                                    <button 
                                        onClick={() => setCompletedSale(null)}
                                        className="w-full p-4 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Plus size={20} />
                                        New Sale
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Cart Items List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-70">
                                    <div className="bg-muted p-5 rounded-full mb-2">
                                        <ShoppingCart size={48} className="text-primary/50" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">{'It\'s quiet here...'}</h3>
                                    <p className="text-sm text-center px-6">{t.emptyCart}</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <motion.div 
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex flex-col p-3 bg-card border border-border rounded-xl shadow-sm gap-3"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-foreground">{item.name}</h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {formatCurrency(item.price)} each • {item.stock} in stock
                                                </p>
                                            </div>
                                            <p className="font-bold text-primary">
                                                {formatCurrency(item.price * item.cartQuantity)}
                                            </p>
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-1">
                                            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border">
                                                <button 
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    disabled={isProcessing}
                                                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background text-foreground transition-colors disabled:opacity-40"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-10 text-center font-medium text-sm tabular-nums text-foreground">
                                                    {item.cartQuantity}
                                                </span>
                                                <button 
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    disabled={item.cartQuantity >= item.stock || isProcessing}
                                                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background text-foreground transition-colors disabled:opacity-30"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => removeItem(item.id)}
                                                disabled={isProcessing}
                                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-40"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Modifiers (Tax/Discount) and Totals */}
                        {items.length > 0 && (
                            <div className="bg-card border-t border-border p-5 space-y-4">
                                {/* Discount & Tax Inputs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                                            <span>{t.discount}</span>
                                            <div className="flex bg-muted rounded-md p-0.5 border border-border">
                                                <button 
                                                    onClick={() => setDiscountType('percentage')}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${discountType === 'percentage' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground opacity-50'}`}
                                                >
                                                    <Percent size={12} />
                                                </button>
                                                <button 
                                                    onClick={() => setDiscountType('flat')}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${discountType === 'flat' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground opacity-50'}`}
                                                >
                                                    <DollarSign size={12} />
                                                </button>
                                            </div>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Tag size={14} className="text-muted-foreground" />
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={localDiscount}
                                                onChange={handleDiscountChange}
                                                disabled={isProcessing}
                                                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none disabled:opacity-50"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {t.tax} (%)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Percent size={14} className="text-muted-foreground" />
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={localTax}
                                                onChange={handleTaxChange}
                                                disabled={isProcessing}
                                                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none disabled:opacity-50"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Selection (Business Plan Only) */}
                                {currentTier === 'business' && (
                                    <div className="pt-2">
                                        <select
                                            value={selectedCustomerId}
                                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                                            disabled={isProcessing}
                                            className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2 outline-none focus:border-primary text-foreground appearance-none disabled:opacity-50"
                                        >
                                            <option value="">-- No Customer Selected --</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} {c.phone ? `(${c.phone})` : ''} - {c.points} pts
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Payment Method Selector (Pro plan) */}
                                <div className="pt-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                                        Payment Method
                                    </label>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {[
                                            { id: 'CASH',  label: 'Cash',  icon: '💵' },
                                            { id: 'CARD',  label: 'Card',  icon: '💳' },
                                            { id: 'QRIS',  label: 'QRIS',  icon: '📱' },
                                            { id: 'GOPAY', label: 'GoPay', icon: '🟢' },
                                            { id: 'OVO',   label: 'OVO',   icon: '🟣' },
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setPaymentMethod(m.id)}
                                                disabled={isProcessing}
                                                className={`flex flex-col items-center justify-center py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
                                                    paymentMethod === m.id
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                                                        : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                                                }`}
                                            >
                                                <span className="text-lg leading-none mb-0.5">{m.icon}</span>
                                                <span className="text-[10px]">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {paymentMethod !== 'CASH' && (
                                        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                                            {paymentMethod} payments are not counted in the cash drawer
                                        </p>
                                    )}
                                </div>

                                {/* Summary */}
                                <div className="space-y-2 pt-2 border-t border-border border-dashed">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>{t.subtotal}</span>
                                        <span>{formatCurrency(getSubtotal())}</span>
                                    </div>
                                    
                                    {getDiscountAmount() > 0 && (
                                        <div className="flex justify-between text-sm text-emerald-500 font-medium">
                                            <span>
                                                {t.discount} 
                                                {discountType === 'percentage' ? ` (${discountValue}%)` : ''}
                                            </span>
                                            <span>-{formatCurrency(getDiscountAmount())}</span>
                                        </div>
                                    )}
                                    
                                    {getTaxAmount() > 0 && (
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>{t.tax} ({taxRate}%)</span>
                                            <span>+{formatCurrency(getTaxAmount())}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end pt-2 pb-1">
                                        <span className="font-bold text-foreground">{t.total}</span>
                                        <span className="text-3xl font-black text-primary tabular-nums">
                                            {formatCurrency(getTotal())}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={handleCheckout}
                                        disabled={isProcessing || items.length === 0}
                                        className="flex-1 py-4 px-6 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                {language === 'en' ? 'Processing...' : 'Memproses...'}
                                            </>
                                        ) : (
                                            <>
                                                <Receipt size={20} />
                                                {t.completeSale}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
