import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';
import { AlertTriangle, TrendingUp, ChevronDown, Check, HelpCircle, X, Pencil, Download, FileText, Table } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/currency';
import { exportToPDF, exportToExcel } from '../utils/exportData';

export default function Analytics() {
    const navigate = useNavigate();
    const items = useInventoryStore((state) => state.items);
    const transactions = useInventoryStore((state) => state.transactions || []);
    const { language } = useSettingsStore();
    const t = translations[language];

    const [timeRange, setTimeRange] = useState('today'); // today, 7days, 30days, all, custom
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [tempCustomDate, setTempCustomDate] = useState({ start: '', end: '' });
    const [historyModal, setHistoryModal] = useState(null); // 'revenue' or 'profit'

    // Helper: Get Start of Day
    const getStartOfDay = (date = new Date()) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const timeOptions = [
        { value: 'today', label: t.today },
        { value: '7days', label: t.last7Days },
        { value: '30days', label: t.last30Days },
        { value: 'all', label: t.allTime },
        { value: 'custom', label: t.customRange },
    ];

    const handleTimeRangeChange = (value) => {
        if (value === 'custom') {
            const todayStr = new Date().toISOString().split('T')[0];
            setTempCustomDate({ start: todayStr, end: todayStr });
            setShowCustomDateModal(true);
            setIsDropdownOpen(false);
        } else {
            setTimeRange(value);
            setIsDropdownOpen(false);
        }
    };

    const applyCustomDate = () => {
        if (tempCustomDate.start && tempCustomDate.end) {
            setCustomDateRange(tempCustomDate);
            setTimeRange('custom');
            setShowCustomDateModal(false);
        }
    };

    const getStartDate = () => {
        const now = getStartOfDay();
        switch (timeRange) {
            case '7days':
                const d7 = new Date(now);
                d7.setDate(d7.getDate() - 6);
                return d7;
            case '30days':
                const d30 = new Date(now);
                d30.setDate(d30.getDate() - 29);
                return d30;
            case 'all':
                return new Date(0); // Beginning of time
            case 'today':
            default:
                return now;
        }
    };

    // Filter Transactions Logic
    const filteredTransactions = transactions.filter(tr => {
        if (tr.type !== 'SALE') return false;

        const trDate = new Date(tr.date);

        if (timeRange === 'custom') {
            const start = new Date(customDateRange.start);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customDateRange.end);
            end.setHours(23, 59, 59, 999);
            return trDate >= start && trDate <= end;
        }

        const startDate = getStartDate();
        return trDate >= startDate;
    });

    // Stats Calculations
    const revenue = filteredTransactions.reduce((acc, tr) => acc + (parseFloat(tr.total) || 0), 0);
    const profit = filteredTransactions.reduce((acc, tr) => {
        const cost = (parseFloat(tr.cost) || 0) * (parseInt(tr.quantity) || 0);
        const rev = parseFloat(tr.total) || 0;
        return acc + (rev - cost);
    }, 0);

    // Top Selling
    const salesByItem = filteredTransactions.reduce((acc, tr) => {
        if (!acc[tr.itemId]) {
            acc[tr.itemId] = 0;
        }
        acc[tr.itemId] += tr.quantity;
        return acc;
    }, {});

    const topSelling = Object.entries(salesByItem)
        .map(([itemId, totalQty]) => {
            const item = items.find(i => i.id === itemId);
            return item ? { ...item, totalQty } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 3);

    // Chart Data (Dynamic based on range)
    const getChartDays = () => {
        if (timeRange === 'custom') {
            const start = new Date(customDateRange.start);
            const end = new Date(customDateRange.end);
            const days = [];
            // Safety limit to 31 days to avoid massive loop
            const limit = 31;
            let count = 0;
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                days.push(new Date(d));
                count++;
                if (count > limit) break;
            }
            return days;
        }
        if (timeRange === 'today') return [getStartOfDay()];
        if (timeRange === '7days') return Array.from({ length: 7 }, (_, i) => { const d = getStartOfDay(); d.setDate(d.getDate() - i); return d; }).reverse();
        if (timeRange === '30days') return Array.from({ length: 30 }, (_, i) => { const d = getStartOfDay(); d.setDate(d.getDate() - i); return d; }).reverse();
        return Array.from({ length: 7 }, (_, i) => { const d = getStartOfDay(); d.setDate(d.getDate() - i); return d; }).reverse();
    };

    const chartDays = getChartDays();

    const revenueData = chartDays.map(date => {
        const dayRevenue = transactions
            .filter(tr => {
                const trDate = new Date(tr.date);
                return tr.type === 'SALE' &&
                    trDate >= date &&
                    trDate < new Date(date.getTime() + 86400000);
            })
            .reduce((acc, tr) => acc + (tr.total || 0), 0);

        return {
            date: date.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { weekday: 'short', day: 'numeric' }),
            revenue: dayRevenue
        };
    });

    const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 1);

    const lowStockList = items.filter(item => item.stock < 5);

    return (
        <div className="p-6 pb-24" onClick={() => setIsDropdownOpen(false)}>
            <header className="mb-8 mt-4 flex items-center justify-between z-20 relative">
                <h1 className="text-3xl font-bold text-foreground">{t.stats}</h1>

                {/* Custom Airbnb-style Dropdown */}
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer outline-none shadow-sm hover:shadow-md ${isDropdownOpen ? 'bg-primary text-white border-primary' : 'bg-card text-foreground border-border'}`}
                    >
                        <span className="text-sm font-semibold">
                            {timeOptions.find(o => o.value === timeRange)?.label}
                        </span>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 opacity-50' : 'text-muted-foreground'}`} />
                    </button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50"
                            >
                                <div className="py-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        {t.timeframe}
                                    </div>
                                    {timeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={(e) => { e.stopPropagation(); handleTimeRangeChange(option.value); }}
                                            className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center justify-between transition-colors ${timeRange === option.value ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted/50'}`}
                                        >
                                            {option.label}
                                            {timeRange === option.value && <Check size={16} className="text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Custom Date Modal */}
            <AnimatePresence>
                {showCustomDateModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowCustomDateModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-card rounded-2xl w-full max-w-sm p-6 shadow-xl border border-border"
                            >
                                <h3 className="text-lg font-bold mb-4 text-foreground">{t.customRange}</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">{t.startDate}</label>
                                        <input
                                            type="date"
                                            className="w-full border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-transparent text-foreground"
                                            value={tempCustomDate.start}
                                            onChange={(e) => setTempCustomDate({ ...tempCustomDate, start: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">{t.endDate}</label>
                                        <input
                                            type="date"
                                            className="w-full border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-transparent text-foreground"
                                            value={tempCustomDate.end}
                                            onChange={(e) => setTempCustomDate({ ...tempCustomDate, end: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={applyCustomDate}
                                        className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4 hover:bg-primary/90 transition-colors"
                                    >
                                        {t.apply}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* History Details Modal */}
            <AnimatePresence>
                {historyModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
                            onClick={() => setHistoryModal(null)}
                        >
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[85vh] flex flex-col border border-border"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-foreground">
                                        {historyModal === 'revenue' ? t.revenueHistory : t.profitHistory}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => exportToPDF(filteredTransactions, historyModal === 'revenue' ? t.revenueHistory : t.profitHistory, historyModal, language)}
                                            className="p-2 hover:bg-muted rounded-full text-foreground transition-colors"
                                            title="Export PDF"
                                        >
                                            <FileText size={20} />
                                        </button>
                                        <button
                                            onClick={() => exportToExcel(filteredTransactions, historyModal === 'revenue' ? t.revenueHistory : t.profitHistory, historyModal, language)}
                                            className="p-2 hover:bg-muted rounded-full text-foreground transition-colors"
                                            title="Export Excel"
                                        >
                                            <Table size={20} />
                                        </button>
                                        <button onClick={() => setHistoryModal(null)} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-3">
                                    {filteredTransactions.length > 0 ? (
                                        filteredTransactions.slice().reverse().map((tr, idx) => {
                                            const item = items.find(i => i.id === tr.itemId);
                                            const profitVal = (tr.total || 0) - ((tr.cost || 0) * tr.quantity);
                                            const amount = historyModal === 'revenue' ? (tr.total || 0) : profitVal;

                                            // Handle case where cost wasn't recorded properly (legacy data)
                                            // If revenue is 0, ignore? No, show detail.

                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                                                            {item?.image ? (
                                                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-muted" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-foreground text-sm truncate max-w-[150px]">
                                                                {item ? item.name : (tr.itemName ? `${tr.itemName} ${t.deleted}` : 'Unknown Item')}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(tr.date).toLocaleTimeString(language === 'en' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit' })} • {tr.quantity}x
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`font-bold ${historyModal === 'profit'
                                                        ? (amount < 0 ? 'text-red-500' : 'text-green-500')
                                                        : 'text-foreground'
                                                        }`}>
                                                        {formatCurrency(amount)}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-12 text-gray-400">
                                            <p>{t.noTransactions}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <span className="font-semibold text-gray-500 text-sm">Total</span>
                                    <span className="font-bold text-xl">
                                        {formatCurrency(historyModal === 'revenue' ? revenue : profit)}
                                    </span>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="relative p-5 rounded-2xl bg-black text-white shadow-lg group">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                            {timeRange === 'today' ? t.todaysRevenue : 'Revenue'}
                        </p>
                        <button
                            onClick={() => setHistoryModal('revenue')}
                            className="text-gray-500 hover:text-white transition-colors p-1"
                        >
                            <HelpCircle size={16} />
                        </button>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold truncate" title={formatCurrency(revenue)}>
                        {new Intl.NumberFormat(language === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(revenue)}
                    </h3>
                </div>
                <div className={`relative p-5 rounded-2xl text-white shadow-lg ${profit < 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                    <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-medium uppercase tracking-wider ${profit < 0 ? 'text-red-100' : 'text-green-100'}`}>
                            {profit < 0
                                ? (timeRange === 'today' ? t.todaysLoss : t.loss)
                                : (timeRange === 'today' ? t.todaysProfit : t.profit)
                            }
                        </p>
                        <button
                            onClick={() => setHistoryModal('profit')}
                            className={`transition-colors p-1 ${profit < 0 ? 'text-red-200 hover:text-white' : 'text-green-200 hover:text-white'}`}
                        >
                            <HelpCircle size={16} />
                        </button>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold truncate" title={formatCurrency(profit)}>
                        {new Intl.NumberFormat(language === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(profit)}
                    </h3>
                </div>
            </div>

            {/* Revenue Chart */}
            {(timeRange !== 'today' || chartDays.length > 1) && (
                <div className="mb-8">
                    <h3 className="font-bold text-lg mb-4 text-foreground">Revenue Trend</h3>
                    <div className="h-40 flex items-end justify-between gap-1 p-4 bg-card rounded-2xl border border-border overflow-x-auto">
                        {revenueData.map((day, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group min-w-[30px]">
                                <div className="w-full relative flex items-end h-32 bg-muted/50 rounded-lg overflow-hidden">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                                        transition={{ duration: 0.5, delay: i * 0.05 }}
                                        className="w-full bg-primary rounded-t-lg group-hover:bg-primary/80 transition-colors relative"
                                    >
                                        {day.revenue > 0 && (
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {formatCurrency(day.revenue)}
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{day.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Selling */}
            <div className="mb-8">
                <h3 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
                    <TrendingUp size={20} className="text-green-500" />
                    {t.topSelling}
                </h3>
                <div className="space-y-3">
                    {topSelling.length > 0 ? (
                        topSelling.map((item, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-foreground text-sm truncate">{item.name}</h4>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(item.totalQty * item.price)} revenue</p>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-lg text-foreground">{item.totalQty}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{t.soldInfo}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-400 text-sm bg-gray-50 rounded-xl">
                            {language === 'en' ? 'No sales yet. Start selling!' : 'Belum ada penjualan. Mulai menjual!'}
                        </div>
                    )}
                </div>
            </div>

            {/* Low Stock Alert */}
            <div>
                <h3 className="font-bold text-lg mb-6 text-foreground flex items-center gap-2">
                    <AlertTriangle size={20} className="text-orange-500" />
                    {t.lowStockItems}
                </h3>

                {lowStockList.length > 0 ? (
                    <div className="space-y-8">
                        {Object.entries(
                            lowStockList.reduce((acc, item) => {
                                const category = item.category || 'Uncategorized';
                                if (!acc[category]) acc[category] = [];
                                acc[category].push(item);
                                return acc;
                            }, {})
                        ).map(([category, categoryItems]) => (
                            <div key={category}>
                                <h4 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider mb-3 px-1">
                                    {category}
                                </h4>
                                <div className="space-y-3">
                                    {categoryItems.map((item, index) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            key={item.id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-orange-50/50 border border-orange-100/50 hover:bg-orange-50 hover:border-orange-200 dark:bg-card dark:border-border dark:hover:bg-muted/20 dark:hover:border-orange-500/50 transition-colors group relative overflow-hidden"
                                        >
                                            {/* Left accent line - Dark Mode Only */}
                                            <div className="hidden dark:block absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />

                                            <div className="flex items-center gap-4 pl-2">
                                                <div className="w-12 h-12 rounded-lg bg-white dark:bg-muted overflow-hidden shrink-0 border border-orange-100 dark:border-border shadow-sm">
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-900 dark:text-foreground text-sm block">{item.name}</span>
                                                    <span className="text-xs text-orange-600/80 dark:text-orange-500 font-bold">
                                                        {item.stock} {t.leftInStock || 'left in stock'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/inventory/edit/${item.id}`);
                                                    }}
                                                    className="p-2 rounded-full hover:bg-white dark:hover:bg-muted text-gray-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                                    title={t.editItem || "Edit Item"}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                            <AlertTriangle size={24} className="text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">{t.noItems}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.healthyStock}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
