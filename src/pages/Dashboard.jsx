import { useState } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';
import { TrendingUp, Package, AlertTriangle, DollarSign, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/currency';

function StatCard({ icon: Icon, label, value, color, delay, onClick, isClickable = false }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileTap={isClickable ? { scale: 0.95 } : {}}
            onClick={onClick}
            className={`p-5 rounded-2xl bg-card shadow-sm border border-border ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${color}`}>
                <Icon size={20} className="text-white" />
            </div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{label}</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
        </motion.div>
    );
}

export default function Dashboard() {
    const items = useInventoryStore((state) => state.items);
    const recentActivity = useInventoryStore((state) => state.recentActivity || []);
    const { language } = useSettingsStore();
    const t = translations[language];

    // Toggle state specifically for the low/no stock card
    const [showNoStock, setShowNoStock] = useState(false);

    const stats = {
        totalItems: items.length,
        totalStock: items.reduce((acc, item) => acc + item.stock, 0),
        totalValue: items.reduce((acc, item) => acc + (item.price * item.stock), 0),
        lowStock: items.filter(item => item.stock < 5).length,
        noStock: items.filter(item => item.stock === 0).length
    };

    return (
        <div className="p-6 pb-24">
            <header className="mb-8 mt-4 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">{t.dashboard}</h1>
                    <p className="text-muted-foreground">{t.overview}</p>
                </div>
                <div className="text-2xl font-black text-foreground/20 tracking-wider">
                    INVENTOR-E
                </div>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    icon={Package}
                    label={t.totalItems}
                    value={stats.totalItems}
                    color="bg-blue-500"
                    delay={0}
                />
                <StatCard
                    icon={DollarSign}
                    label={t.totalValue}
                    value={formatCurrency(stats.totalValue)}
                    color="bg-green-500"
                    delay={0.1}
                />
                <StatCard
                    icon={TrendingUp}
                    label={t.totalStock}
                    value={stats.totalStock}
                    color="bg-purple-500"
                    delay={0.2}
                />
                <StatCard
                    icon={AlertTriangle}
                    label={showNoStock ? (t.noStock || 'No Stock') : t.lowStock}
                    value={showNoStock ? stats.noStock : stats.lowStock}
                    color={showNoStock ? "bg-red-600" : "bg-orange-500"}
                    delay={0.3}
                    isClickable={true}
                    onClick={() => setShowNoStock(!showNoStock)}
                />
            </div>

            <div className="mt-8">
                <h3 className="font-bold text-lg mb-4 text-foreground">{t.recentActivity}</h3>
                <div className="space-y-4">
                    <div className="space-y-4">
                        {recentActivity && recentActivity.length > 0 ? (
                            recentActivity.slice(0, 5).map((activity) => (
                                <div key={activity.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activity.type === 'ADD' ? 'bg-blue-100 text-blue-600' :
                                            activity.type === 'SALE' ? 'bg-green-100 text-green-600' :
                                                activity.type === 'DELETE' ? 'bg-red-100 text-red-600' :
                                                    activity.type === 'UPDATE' ? 'bg-yellow-100 text-yellow-600' :
                                                        'bg-gray-100 text-gray-600'
                                        }`}>
                                        {activity.type === 'ADD' && <Package size={18} />}
                                        {activity.type === 'SALE' && <DollarSign size={18} />}
                                        {activity.type === 'DELETE' && <AlertTriangle size={18} />}
                                        {activity.type === 'UPDATE' && <Pencil size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {activity.type === 'ADD' ? (language === 'en' ? 'New Item Added' : 'Barang Baru') :
                                                activity.type === 'SALE' ? (language === 'en' ? 'Item Sold' : 'Terjual') :
                                                    activity.type === 'DELETE' ? (language === 'en' ? 'Item Deleted' : 'Barang Dihapus') :
                                                        t.updateActivity || 'Update'}
                                            <span className="font-normal text-muted-foreground"> • {activity.message}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(activity.date).toLocaleString(language === 'en' ? 'en-US' : 'id-ID', {
                                                hour: 'numeric', minute: 'numeric', hour12: true,
                                                day: 'numeric', month: 'short'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                {language === 'en' ? 'No recent activity' : 'Belum ada aktivitas'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
