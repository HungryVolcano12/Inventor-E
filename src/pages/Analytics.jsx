import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { translations } from '../utils/translations';
import { AlertTriangle, TrendingUp, ChevronDown, Check, HelpCircle, X, Pencil, Download, FileText, Table, Archive, Users, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/currency';
import { exportToPDF, exportToExcel, exportToCSVForAccounting } from '../utils/exportData';
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    BarChart, Bar, CartesianGrid, Cell
} from 'recharts';

export default function Analytics() {
    const navigate = useNavigate();
    const items = useInventoryStore((state) => state.items);
    const transactions = useInventoryStore((state) => state.transactions || []);
    const { language } = useSettingsStore();
    const { isManager } = useAuthStore();
    const { currentTier } = useSubscriptionStore();
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
            case '7days': {
                const d7 = new Date(now);
                d7.setDate(d7.getDate() - 6);
                return d7;
            }
            case '30days': {
                const d30 = new Date(now);
                d30.setDate(d30.getDate() - 29);
                return d30;
            }
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

    // Today's specific stats for the hero cards
    const todayStart = getStartOfDay();
    const todayTransactions = transactions.filter(tr => tr.type === 'SALE' && new Date(tr.date) >= todayStart);
    const todaysRevenue = todayTransactions.reduce((acc, tr) => acc + (parseFloat(tr.total) || 0), 0);
    const todaysProfit = todayTransactions.reduce((acc, tr) => {
        const cost = (parseFloat(tr.cost) || 0) * (parseInt(tr.quantity) || 0);
        return acc + (parseFloat(tr.total) - cost);
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
        .slice(0, 5);

    // Staff Performance
    const salesByStaff = filteredTransactions.reduce((acc, tr) => {
        const staff = tr.cashierName || 'Unknown';
        if (!acc[staff]) acc[staff] = { revenue: 0, itemsSold: 0 };
        acc[staff].revenue += parseFloat(tr.total) || 0;
        acc[staff].itemsSold += parseInt(tr.quantity) || 0;
        return acc;
    }, {});

    const topStaff = Object.entries(salesByStaff)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

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

    const getDeadStock = useInventoryStore((state) => state.getDeadStock);
    const lowStockList = items.filter(item => item.stock <= (item.lowStockThreshold || 5) && item.stock > 0);
    const deadStockList = getDeadStock(60);

    return (
        <div className="p-6 pb-24" onClick={() => setIsDropdownOpen(false)}>
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-4">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">{t.stats}</h1>
                    <p className="text-sm text-muted-foreground font-medium mt-1">{language === 'en' ? 'Performance overview' : 'Ikhtisar performa'}</p>
                    {(currentTier === 'pro' || currentTier === 'business') && (
                        <button
                            onClick={() => navigate('/refunds')}
                            className="mt-2 inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all"
                        >
                            <RotateCcw size={12} />
                            Process Refund
                        </button>
                    )}
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all cursor-pointer outline-none shadow-sm hover:shadow-md ${isDropdownOpen ? 'bg-primary text-white border-primary' : 'bg-card text-foreground border-border'}`}
                    >
                        <span className="text-sm font-bold">
                            {timeOptions.find(o => o.value === timeRange)?.label}
                        </span>
                        <ChevronDown size={18} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 opacity-70' : 'text-muted-foreground'}`} />
                    </button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 w-64 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden z-50 p-2"
                            >
                                <div className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                    {t.timeframe}
                                </div>
                                {timeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={(e) => { e.stopPropagation(); handleTimeRangeChange(option.value); }}
                                        className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between rounded-xl transition-all ${timeRange === option.value ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'}`}
                                    >
                                        {option.label}
                                        {timeRange === option.value && <Check size={18} className="text-primary" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Hero Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <motion.div 
                    whileHover={{ y: -4, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
                    onClick={() => setHistoryModal('revenue')}
                    className="p-5 bg-zinc-900 dark:bg-zinc-950 rounded-3xl text-left relative overflow-hidden group cursor-pointer border border-white/10 shadow-xl"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all duration-700 -rotate-12 group-hover:rotate-0 text-white">
                        <TrendingUp size={100} />
                    </div>
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            {t.todaysRevenue}
                        </span>
                        <div className="flex items-end gap-3">
                            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter transition-all group-hover:tracking-normal">{formatCurrency(todaysRevenue)}</h2>
                            <span className="text-emerald-400 text-xs font-bold mb-2">+12%</span>
                        </div>
                    </div>
                </motion.div>
                
                <motion.div
                    whileHover={{ y: -4, boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.2)' }}
                    onClick={() => setHistoryModal('profit')}
                    className="p-5 bg-emerald-500 rounded-3xl text-left relative overflow-hidden group cursor-pointer shadow-xl shadow-emerald-500/20"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all duration-700 -rotate-12 group-hover:rotate-0 text-white">
                        <TrendingUp size={100} />
                    </div>
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-100 uppercase tracking-[0.3em] mb-4 bg-black/10 px-3 py-1 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            {t.todaysProfit}
                        </span>
                        <div className="flex items-end gap-3">
                            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter transition-all group-hover:tracking-normal">{formatCurrency(todaysProfit)}</h2>
                            <span className="text-white/80 text-xs font-bold mb-2">Target reached</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Revenue Trend Chart */}
            {timeRange !== 'today' && (
                <div className="mb-8 bg-card rounded-3xl p-6 border border-border/60 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <h3 className="font-black text-xl text-foreground tracking-tight">{language === 'en' ? 'Revenue Forecast' : 'Prakiraan Pendapatan'}</h3>
                            <p className="text-xs text-muted-foreground font-medium">{language === 'en' ? 'Review your weekly growth trends' : 'Tinjau tren pertumbuhan mingguan Anda'}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-border/50">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Revenue History</span>
                        </div>
                    </div>
                    <div className="h-64 w-full -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '20px', border: '1px solid hsl(var(--border))', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', padding: '16px' }}
                                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="hsl(var(--primary))" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                    animationDuration={2000}
                                    animationEasing="ease-in-out"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Selling Section - Redesigned Airbnb Style */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <TrendingUp size={22} />
                            </div>
                            <h3 className="font-black text-2xl text-foreground tracking-tight">{t.topSelling}</h3>
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground bg-muted px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">{timeRange}</span>
                    </div>

                    <div className="space-y-4">
                        {topSelling.length > 0 ? (
                            topSelling.map((item, index) => {
                                const maxQty = Math.max(...topSelling.map(s => s.totalQty));
                                const percentage = (item.totalQty / maxQty) * 100;
                                
                                return (
                                    <motion.div 
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="group bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-2xl hover:shadow-black/[0.04] transition-all relative overflow-hidden active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            {/* Experience-style image container */}
                                            <div className="relative w-24 h-24 sm:w-20 sm:h-20 shrink-0 group-hover:scale-105 transition-transform duration-700">
                                                <div className="w-full h-full rounded-2xl overflow-hidden border border-border/50 shadow-inner bg-muted/20">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-3xl font-black uppercase">
                                                            {item.name.substring(0, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute -top-2 -left-2 w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-border flex items-center justify-center shadow-lg transform -rotate-12 group-hover:rotate-0 transition-transform">
                                                    <span className="font-black text-lg text-foreground">#{index + 1}</span>
                                                </div>
                                                {index === 0 && (
                                                    <div className="absolute -bottom-2 -right-2 bg-primary text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-xl border border-white/20">
                                                        Bestseller
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-black text-foreground text-xl tracking-tight leading-tight truncate pr-2 group-hover:text-primary transition-colors">{item.name}</h4>
                                                    <Check size={16} className="text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                
                                                <div className="flex items-center gap-3 mb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/10">
                                                        {formatCurrency(item.totalQty * item.price)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{item.totalQty} sold</span>
                                                </div>

                                                {/* Airbnb-style Progress Line */}
                                                <div className="relative mt-4">
                                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percentage}%` }}
                                                            transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                                            className={`h-full bg-primary relative`}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-2">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40">Performance</span>
                                                        <span className="text-[9px] font-black text-primary uppercase">{Math.round(percentage)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Subtle background glow on hover */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-2xl border border-border border-dashed px-6">
                                <Archive size={48} className="mx-auto mb-4 opacity-10" />
                                <h4 className="text-lg font-black text-foreground/20 italic">{language === 'en' ? 'Data Pending' : 'Data Tertunda'}</h4>
                                <p className="font-bold text-[10px] uppercase tracking-widest mt-2">{language === 'en' ? 'No sales records found' : 'Tidak ada catatan penjualan'}</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Staff Leaderboard Section */}
                {isManager() && (
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Users size={22} />
                                </div>
                                <h3 className="font-black text-2xl text-foreground tracking-tight">{language === 'en' ? 'Top Experts' : 'Tenaga Ahli'}</h3>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {topStaff.length > 0 ? (
                                topStaff.map((staff, index) => (
                                    <motion.div 
                                        key={index}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all relative overflow-hidden group"
                                    >
                                        <div className="relative shrink-0">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all duration-500 group-hover:scale-105 group-hover:rotate-6 ${
                                                index === 0 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 
                                                'bg-muted text-muted-foreground border border-border/50'
                                            }`}>
                                                {staff.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            {index === 0 && (
                                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-white dark:bg-zinc-800 rounded-full border border-border flex items-center justify-center shadow-md">
                                                    <TrendingUp size={12} className="text-orange-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-black text-foreground text-lg truncate tracking-tight uppercase">{staff.name}</h4>
                                                {index === 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">
                                                {staff.itemsSold} units • {Math.round((staff.revenue / revenue) * 100)}% contribution
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-black text-foreground text-2xl tracking-tighter transition-all group-hover:tracking-normal group-hover:text-primary">
                                                {formatCurrency(staff.revenue)}
                                            </span>
                                            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Revenue</span>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-2xl border border-border border-dashed">
                                    <p className="font-black italic text-xs opacity-20 tracking-widest uppercase">{language === 'en' ? 'Recruiting Heroes...' : 'Merekrut Pahlawan...'}</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>

            {/* Notifications / Alerts Section */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Low Stock Row */}
                <div className="bg-orange-50/50 dark:bg-orange-500/5 rounded-3xl p-6 border border-orange-100 dark:border-orange-500/10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/40">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-foreground tracking-tight">{t.lowStockItems}</h3>
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-widest">{lowStockList.length} items to reorder</p>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {lowStockList.length > 0 ? (
                            lowStockList.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-border shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm leading-none mb-1">{item.name}</h4>
                                            <span className="text-[10px] font-black text-orange-500 uppercase">{item.stock} left</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/inventory/edit/${item.id}`)}
                                        className="p-2 hover:bg-orange-100 dark:hover:bg-orange-500/10 rounded-full text-orange-500 transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-10 text-muted-foreground italic font-medium">{t.healthyStock}</p>
                        )}
                    </div>
                </div>

                {/* Staff Performance — Pro/Business only */}
                {(currentTier === 'pro' || currentTier === 'business') && (
                    <div className="bg-zinc-100/50 dark:bg-zinc-500/5 rounded-3xl p-6 border border-border/50">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-foreground tracking-tight">Staff Performance</h3>
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Revenue by cashier</p>
                            </div>
                        </div>

                        {topStaff.length === 0 ? (
                            <p className="text-center py-10 text-muted-foreground italic font-medium">No sales recorded in this period</p>
                        ) : (
                            <>
                                {/* Bar chart */}
                                <div className="mb-6" style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topStaff} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 10, fontWeight: 700 }}
                                                tickFormatter={v => v.split(' ')[0]}
                                            />
                                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v).replace(/\.00$/, '')} />
                                            <Tooltip
                                                formatter={(value) => [formatCurrency(value), 'Revenue']}
                                                contentStyle={{ borderRadius: 12, fontSize: 12 }}
                                            />
                                            <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                                                {topStaff.map((_, idx) => (
                                                    <Cell key={idx} fill={`hsl(var(--primary) / ${1 - idx * 0.15})`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Ranked table */}
                                <div className="space-y-3">
                                    {topStaff.map((staff, idx) => {
                                        const txCount = filteredTransactions.filter(tx => (tx.cashierName || 'Unknown') === staff.name).length;
                                        const avg = txCount > 0 ? staff.revenue / txCount : 0;
                                        const pct = topStaff[0].revenue > 0 ? (staff.revenue / topStaff[0].revenue) * 100 : 0;
                                        return (
                                            <div key={staff.name} className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                                    idx === 0 ? 'bg-amber-400 text-white' :
                                                    idx === 1 ? 'bg-zinc-400 text-white' :
                                                    idx === 2 ? 'bg-amber-700 text-white' :
                                                    'bg-muted text-muted-foreground'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="font-bold text-foreground text-sm truncate">{staff.name}</p>
                                                        <span className="font-black text-foreground text-sm ml-2">{formatCurrency(staff.revenue)}</span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1.5">
                                                        <div
                                                            className="bg-primary h-1.5 rounded-full transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-[10px] text-muted-foreground">{txCount} transactions</span>
                                                        <span className="text-[10px] text-muted-foreground">avg {formatCurrency(avg)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Dead Stock Row */}
                <div className="bg-zinc-100/50 dark:bg-zinc-500/5 rounded-3xl p-6 border border-border/50">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center text-white shadow-lg shadow-black/20">
                            <Archive size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-foreground tracking-tight">{t.deadStock || 'Dead Stock'}</h3>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">60+ Days inactivity</p>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {deadStockList.length > 0 ? (
                            deadStockList.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden opacity-50">
                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm leading-none mb-1">{item.name}</h4>
                                            <span className="text-[10px] font-black text-zinc-500 uppercase">{item.stock} units</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/inventory/edit/${item.id}`)}
                                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-10 text-muted-foreground italic font-medium">Clear of slow inventory</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Date Modal */}
            <AnimatePresence>
                {showCustomDateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setShowCustomDateModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-card rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-border relative z-10"
                        >
                            <h3 className="text-2xl font-black mb-6 text-foreground tracking-tight">{t.customRange}</h3>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">{t.startDate}</label>
                                    <input
                                        type="date"
                                        className="w-full border border-border rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-muted/30 text-foreground font-bold"
                                        value={tempCustomDate.start}
                                        onChange={(e) => setTempCustomDate({ ...tempCustomDate, start: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">{t.endDate}</label>
                                    <input
                                        type="date"
                                        className="w-full border border-border rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-muted/30 text-foreground font-bold"
                                        value={tempCustomDate.end}
                                        onChange={(e) => setTempCustomDate({ ...tempCustomDate, end: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={applyCustomDate}
                                    className="w-full bg-primary text-white font-black py-5 rounded-[1.5rem] mt-4 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    {t.apply}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* History Details Modal */}
            <AnimatePresence>
                {historyModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setHistoryModal(null)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-xl p-6 shadow-2xl max-h-[90vh] flex flex-col border border-border relative z-10"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-foreground tracking-tight">
                                        {historyModal === 'revenue' ? t.revenueHistory : t.profitHistory}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Transaction Log</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => exportToPDF(filteredTransactions, historyModal === 'revenue' ? t.revenueHistory : t.profitHistory, historyModal, language)}
                                        className="p-3 hover:bg-muted rounded-2xl text-foreground transition-all border border-border/50 shadow-sm"
                                        title="Export PDF"
                                    >
                                        <FileText size={20} />
                                    </button>
                                    <button
                                        onClick={() => exportToExcel(filteredTransactions, historyModal === 'revenue' ? t.revenueHistory : t.profitHistory, historyModal, language)}
                                        className="p-3 hover:bg-muted rounded-2xl text-foreground transition-all border border-border/50 shadow-sm"
                                        title="Export Excel"
                                    >
                                        <Table size={20} />
                                    </button>
                                    <button
                                        onClick={() => exportToCSVForAccounting(filteredTransactions)}
                                        className="p-3 hover:bg-muted rounded-2xl text-foreground transition-all border border-border/50 shadow-sm"
                                        title="Export Accounting CSV"
                                    >
                                        <Archive size={20} />
                                    </button>
                                    <button onClick={() => setHistoryModal(null)} className="p-3 hover:bg-muted rounded-2xl text-muted-foreground transition-all ml-2">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-4 custom-scrollbar">
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.slice().reverse().map((tr, idx) => {
                                        const item = items.find(i => i.id === tr.itemId);
                                        const profitVal = (tr.total || 0) - ((tr.cost || 0) * tr.quantity);
                                        const amount = historyModal === 'revenue' ? (tr.total || 0) : profitVal;

                                        return (
                                            <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 overflow-hidden shrink-0 border border-border shadow-sm group-hover:scale-105 transition-transform">
                                                        {item?.image ? (
                                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] font-black opacity-20">{tr.itemId?.substring(0,3)}</div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-foreground text-sm truncate uppercase tracking-tight">
                                                            {item ? item.name : (tr.itemName ? `${tr.itemName} ${t.deleted}` : 'Unknown Item')}
                                                        </p>
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                                                            {new Date(tr.date).toLocaleTimeString()} • {tr.quantity} units
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`block font-black text-[15px] ${historyModal === 'profit'
                                                        ? (amount < 0 ? 'text-red-500' : 'text-emerald-500')
                                                        : 'text-foreground'
                                                    }`}>
                                                        {formatCurrency(amount)}
                                                    </span>
                                                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter italic">TXID:{tr.id?.substring(0,6)}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-24 opacity-20 grayscale">
                                        <Archive size={64} className="mx-auto mb-4" />
                                        <p className="font-black uppercase tracking-[0.3em]">{t.noTransactions}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-8 border-t border-border flex justify-between items-center">
                                <div>
                                    <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total {historyModal}</span>
                                    <span className="font-black text-3xl text-foreground tracking-tight">
                                        {formatCurrency(historyModal === 'revenue' ? revenue : profit)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setHistoryModal(null)}
                                    className="bg-foreground text-background px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
