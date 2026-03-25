import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, DollarSign, X } from 'lucide-react';
import { useShiftStore } from '../store/useShiftStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';
import { formatCurrency } from '../utils/currency';

export default function ShiftModal({ isOpen, mode = 'open', onClose }) {
    const { language } = useSettingsStore();
    const t = translations[language];
    const { openShift, closeShift, currentShift, isLoading } = useShiftStore();
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const value = parseFloat(amount) || 0;
        
        try {
            if (mode === 'open') {
                await openShift(value);
            } else {
                await closeShift(value);
            }
            if (onClose) onClose();
            setAmount('');
        } catch (error) {
            console.error('Shift error:', error);
            alert('Error processing shift');
        }
    };

    if (!isOpen) return null;

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
                    className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border"
                >
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
                        <div className="mb-6 p-4 bg-muted rounded-xl border border-border">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Expected Cash in Drawer</h3>
                            <p className="text-3xl font-bold text-foreground">
                                {formatCurrency(Number(currentShift.starting_cash) + Number(currentShift.expected_cash || 0))}
                            </p>
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
                                    {mode === 'open' ? 'Start Shift' : 'End Shift'}
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
