import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, DollarSign, X, FileText, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { useShiftStore } from '../store/useShiftStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { translations } from '../utils/translations';
import { formatCurrency } from '../utils/currency';
import { generateShiftReport, buildShiftWhatsAppMessage } from '../utils/shiftReport';
import { toast } from 'sonner';

export default function ShiftModal({ isOpen, mode = 'open', onClose }) {
    const { language } = useSettingsStore();
    const t = translations[language];
    const { openShift, closeShift, currentShift, isLoading } = useShiftStore();
    const transactions = useInventoryStore(state => state.transactions || []);
    const { storeName } = useAuthStore();
    const [amount, setAmount] = useState('');
    const [closedShift, setClosedShift] = useState(null); // show report card after close

    // Get transactions that happened during this shift
    const shiftTransactions = closedShift
        ? transactions.filter(tx => {
            if (!closedShift.start_time) return true;
            return new Date(tx.created_at || tx.date) >= new Date(closedShift.start_time);
        })
        : [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        const value = parseFloat(amount) || 0;
        try {
            if (mode === 'open') {
                await openShift(value);
                if (onClose) onClose();
                setAmount('');
            } else {
                const data = await closeShift(value);
                setClosedShift({ ...data, actual_cash: value });
                setAmount('');
            }
        } catch (error) {
            console.error('Shift error:', error);
            toast.error('Error processing shift');
        }
    };

    const handleDownloadPDF = async () => {
        try {
            await generateShiftReport(closedShift, shiftTransactions);
        } catch (err) {
            toast.error('Failed to generate report');
        }
    };

    const handleWhatsApp = () => {
        const msg = buildShiftWhatsAppMessage(closedShift, shiftTransactions, storeName);
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const handleDone = () => {
        setClosedShift(null);
        if (onClose) onClose();
    };

    if (!isOpen) return null;

    // Compute summary for close preview
    const startingCash = Number(currentShift?.starting_cash || 0);
    const expectedCash = Number(currentShift?.expected_cash || 0);
    const expectedTotal = startingCash + expectedCash;
    const actualCash = parseFloat(amount) || 0;
    const overShort = amount !== '' ? actualCash - expectedTotal : null;

    const saleTxs = shiftTransactions.filter(tx => tx.type === 'SALE');
    const totalRevenue = saleTxs.reduce((s, tx) => s + (tx.total || 0), 0);
    const byMethod = saleTxs.reduce((acc, tx) => {
        const m = tx.payment_method || 'CASH';
        acc[m] = (acc[m] || 0) + (tx.total || 0);
        return acc;
    }, {});

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto"
                >
                    {/* ── Post-close Report Card ─────────────────────────────────── */}
                    {closedShift ? (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 text-primary">
                                <TrendingUp size={28} />
                                <h2 className="text-2xl font-bold text-foreground">Shift Closed</h2>
                            </div>

                            {/* Summary stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted rounded-xl p-4">
                                    <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                                    <p className="text-2xl font-bold text-foreground">{saleTxs.length}</p>
                                </div>
                                <div className="bg-muted rounded-xl p-4">
                                    <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                                </div>
                            </div>

                            {/* Payment breakdown */}
                            {Object.keys(byMethod).length > 0 && (
                                <div className="bg-muted rounded-xl p-4 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Breakdown</p>
                                    {Object.entries(byMethod).map(([m, v]) => (
                                        <div key={m} className="flex justify-between text-sm">
                                            <span className="text-foreground">{m}</span>
                                            <span className="font-semibold text-foreground">{formatCurrency(v)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Cash reconciliation */}
                            <div className="bg-muted rounded-xl p-4 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cash Reconciliation</p>
                                {[
                                    ['Expected in Drawer', formatCurrency(startingCash + expectedCash)],
                                    ['Actual Counted',     formatCurrency(Number(closedShift.actual_cash || 0))],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{l}</span>
                                        <span className="font-semibold text-foreground">{v}</span>
                                    </div>
                                ))}
                                {(() => {
                                    const diff = Number(closedShift.actual_cash || 0) - (startingCash + expectedCash);
                                    return (
                                        <div className={`flex justify-between text-sm font-bold pt-1 border-t border-border ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            <span>{diff >= 0 ? 'Over' : 'Short'}</span>
                                            <span>{diff >= 0 ? '+' : ''}{formatCurrency(Math.abs(diff))}</span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Action buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 rounded-xl transition-all border border-border"
                                >
                                    <FileText size={18} />
                                    PDF Report
                                </button>
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-all"
                                >
                                    <MessageSquare size={18} />
                                    WhatsApp
                                </button>
                            </div>
                            <button
                                onClick={handleDone}
                                className="w-full font-bold py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                    /* ── Normal open/close form ───────────────────────────────── */
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3 text-primary">
                                    {mode === 'open' ? <Unlock size={28} /> : <Lock size={28} />}
                                    <h2 className="text-2xl font-bold text-foreground">
                                        {mode === 'open' ? 'Open Register' : 'Close Register'}
                                    </h2>
                                </div>
                                {mode === 'close' && onClose && (
                                    <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            {mode === 'close' && currentShift && (
                                <div className="mb-4 space-y-3">
                                    <div className="p-4 bg-muted rounded-xl border border-border">
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">Expected Cash in Drawer</h3>
                                        <p className="text-3xl font-bold text-foreground">{formatCurrency(expectedTotal)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Starting {formatCurrency(startingCash)} + Cash Sales {formatCurrency(expectedCash)}
                                        </p>
                                    </div>
                                    {/* Live over/short indicator */}
                                    {overShort !== null && (
                                        <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold ${
                                            overShort >= 0
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                                                : 'bg-red-500/10 border-red-500/30 text-red-600'
                                        }`}>
                                            <AlertCircle size={16} />
                                            {overShort >= 0 ? 'Over' : 'Short'} by {formatCurrency(Math.abs(overShort))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {mode === 'open' ? 'Starting Cash Amount' : 'Actual Cash Counted'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                                            <DollarSign size={20} />
                                        </div>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="1000"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-11 pr-4 py-4 rounded-xl border border-border bg-transparent outline-none focus:border-primary text-xl font-medium text-foreground transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading || amount === ''}
                                    className={`w-full font-bold py-4 rounded-xl text-white outline-none flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                                        mode === 'open' ? 'bg-primary hover:bg-primary/90' : 'bg-red-500 hover:bg-red-600'
                                    }`}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {mode === 'open' ? <Unlock size={20} /> : <Lock size={20} />}
                                            {mode === 'open' ? 'Start Shift' : 'End Shift & View Report'}
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
