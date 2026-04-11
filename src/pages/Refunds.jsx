import { useState } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/currency';
import { toast } from 'sonner';

export default function Refunds() {
    const transactions = useInventoryStore(state => state.transactions || []);
    const updateItem = useInventoryStore(state => state.updateItem);
    const addTransaction = useInventoryStore(state => state.addTransaction);
    const items = useInventoryStore(state => state.items);
    const { storeId } = useAuthStore();
    const { language } = useSettingsStore();
    const { currentTier, openPaywall } = useSubscriptionStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTx, setSelectedTx] = useState(null);
    const [refundQtys, setRefundQtys] = useState({});
    const [reason, setReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Gate: pro + business only
    if (currentTier === 'free') {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pb-24">
                <header className="mb-8 mt-4">
                    <h1 className="text-3xl font-bold text-foreground">Refunds</h1>
                    <p className="text-muted-foreground mt-1">Process returns and refunds</p>
                </header>
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <RotateCcw size={32} className="text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Pro Feature</h2>
                    <p className="text-muted-foreground max-w-xs">
                        Refund processing is available on the Pro and Business plans.
                    </p>
                    <button
                        onClick={() => openPaywall('refunds')}
                        className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-all"
                    >
                        Upgrade to Pro
                    </button>
                </div>
            </motion.div>
        );
    }

    // Filter SALE transactions by receipt ID or item name
    const saleTxs = transactions.filter(tx => tx.type === 'SALE');
    const filtered = searchQuery.trim()
        ? saleTxs.filter(tx =>
            (tx.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tx.item_name || tx.itemName || '').toLowerCase().includes(searchQuery.toLowerCase())
          )
        : saleTxs.slice(0, 30);

    // Group by transaction "batch" (same second + cashier) for multi-item sales
    // For simplicity, we treat each transaction row individually
    const handleSelectTx = (tx) => {
        setSelectedTx(tx);
        setRefundQtys({ [tx.id]: 1 });
        setReason('');
    };

    const handleRefundQtyChange = (txId, val) => {
        const tx = transactions.find(t => t.id === txId);
        const max = tx ? (tx.quantity || 1) : 1;
        setRefundQtys(prev => ({ ...prev, [txId]: Math.min(Math.max(1, parseInt(val) || 1), max) }));
    };

    const handleProcessRefund = async () => {
        if (!selectedTx || !storeId) return;
        setIsProcessing(true);

        const qty      = refundQtys[selectedTx.id] || 1;
        const itemId   = selectedTx.item_id || selectedTx.itemId;
        const itemName = selectedTx.item_name || selectedTx.itemName;
        const refundAmt = ((selectedTx.total || 0) / (selectedTx.quantity || 1)) * qty;

        try {
            // 1. Re-add stock
            const item = items.find(i => i.id === itemId);
            if (item) {
                await updateItem(itemId, { stock: item.stock + qty });
            }

            // 2. Log refund transaction
            await addTransaction({
                itemId,
                itemName,
                type: 'REFUND',
                quantity: qty,
                price: selectedTx.price || 0,
                cost: selectedTx.cost || 0,
                total: -refundAmt,
                payment_method: selectedTx.payment_method || 'CASH',
            });

            // 3. Insert into refunds table
            await supabase.from('refunds').insert({
                store_id: storeId,
                original_transaction_id: selectedTx.id,
                item_id: itemId,
                item_name: itemName,
                quantity: qty,
                refund_amount: refundAmt,
                reason: reason.trim() || null,
            });

            toast.success(`Refunded ${qty}× ${itemName} — ${formatCurrency(refundAmt)} returned to ${selectedTx.payment_method || 'CASH'}`);
            setSelectedTx(null);
            setRefundQtys({});
            setReason('');
        } catch (err) {
            console.error('Refund error:', err);
            toast.error('Refund failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pb-24">
            <header className="mb-6 mt-4">
                <h1 className="text-3xl font-bold text-foreground">Refunds</h1>
                <p className="text-muted-foreground mt-1">Search a sale and issue a refund</p>
            </header>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by item name or transaction ID…"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-card text-foreground text-sm outline-none focus:border-primary transition-all"
                />
            </div>

            {/* Selected transaction detail */}
            {selectedTx && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-primary rounded-2xl p-5 mb-5 shadow-md"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="font-bold text-foreground text-lg">{selectedTx.item_name || selectedTx.itemName}</p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(selectedTx.created_at || selectedTx.date).toLocaleString()} · {selectedTx.payment_method || 'CASH'}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedTx(null)}
                            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                        >✕</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-muted rounded-xl p-3">
                            <p className="text-xs text-muted-foreground">Sold Qty</p>
                            <p className="font-bold text-foreground">{selectedTx.quantity}</p>
                        </div>
                        <div className="bg-muted rounded-xl p-3">
                            <p className="text-xs text-muted-foreground">Sale Total</p>
                            <p className="font-bold text-foreground">{formatCurrency(selectedTx.total || 0)}</p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Refund Quantity</label>
                            <input
                                type="number"
                                min={1}
                                max={selectedTx.quantity || 1}
                                value={refundQtys[selectedTx.id] || 1}
                                onChange={e => handleRefundQtyChange(selectedTx.id, e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Reason (optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. Defective, Wrong item…"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary transition-all text-sm"
                            />
                        </div>
                    </div>

                    {/* Refund summary */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-500 shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold text-red-500">
                                Refund: {formatCurrency(((selectedTx.total || 0) / (selectedTx.quantity || 1)) * (refundQtys[selectedTx.id] || 1))}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {refundQtys[selectedTx.id] || 1}× unit(s) will be returned to stock
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleProcessRefund}
                        disabled={isProcessing}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                        {isProcessing ? 'Processing…' : 'Process Refund'}
                    </button>
                </motion.div>
            )}

            {/* Transaction list */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package size={40} className="mx-auto mb-3 opacity-30" />
                        <p>No sales found</p>
                    </div>
                ) : (
                    filtered.map(tx => {
                        const name = tx.item_name || tx.itemName || 'Unknown';
                        const date = tx.created_at || tx.date;
                        const isSelected = selectedTx?.id === tx.id;
                        return (
                            <motion.button
                                key={tx.id}
                                onClick={() => handleSelectTx(tx)}
                                className={`w-full text-left bg-card border rounded-2xl p-4 flex items-center justify-between transition-all ${
                                    isSelected ? 'border-primary shadow-md' : 'border-border hover:border-primary/40'
                                }`}
                                whileHover={{ scale: 1.005 }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                                        {isSelected
                                            ? <CheckCircle2 size={20} className="text-primary" />
                                            : <RotateCcw size={20} className="text-muted-foreground" />
                                        }
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm">{name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Qty {tx.quantity} · {date ? new Date(date).toLocaleDateString() : 'N/A'} · {tx.payment_method || 'CASH'}
                                        </p>
                                    </div>
                                </div>
                                <span className="font-bold text-foreground text-sm">{formatCurrency(tx.total || 0)}</span>
                            </motion.button>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
}
