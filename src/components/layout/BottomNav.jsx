import { Home, Package, ShoppingCart, User, BarChart2, Settings, RotateCcw } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/useUIStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { translations } from '../../utils/translations';

export default function BottomNav() {
    const openAddSheet = useUIStore((state) => state.openAddSheet);
    const { language } = useSettingsStore();
    const { currentTier } = useSubscriptionStore();
    const t = translations[language];
    const isPro = currentTier === 'pro' || currentTier === 'business';

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe md:hidden">
            <div className="flex justify-around items-center h-16 max-w-7xl mx-auto px-4 md:px-8 gap-4">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`
                    }
                >
                    <Home size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">{t.home}</span>
                </NavLink>

                <NavLink
                    to="/inventory"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`
                    }
                >
                    <Package size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">{t.inventory}</span>
                </NavLink>

                <div className="relative -top-5">
                    <NavLink
                        to="/pos"
                        className={({ isActive }) => 
                            `flex items-center justify-center bg-primary p-3 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all ${isActive ? 'text-primary-foreground scale-110 ring-4 ring-primary/30' : 'text-white hover:scale-105'}`
                        }
                    >
                        <ShoppingCart size={28} />
                    </NavLink>
                </div>

                <NavLink
                    to="/analytics"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`
                    }
                >
                    <BarChart2 size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">{t.stats}</span>
                </NavLink>

                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`
                    }
                >
                    <Settings size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">{t.settings}</span>
                </NavLink>
            </div>
        </nav>
    );
}
