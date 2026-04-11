import { useSettingsStore } from '../../store/useSettingsStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { translations } from '../../utils/translations';

export default function SideNav({ className }) {
    const { language } = useSettingsStore();
    const { currentTier } = useSubscriptionStore();
    const t = translations[language];
    const isPro = currentTier === 'pro' || currentTier === 'business';

    return (
        <aside className={`bg-card text-card-foreground ${className}`}>
            <div className="p-6">
                <h1 className="text-2xl font-black bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                    Inventor-E
                </h1>
            </div>

            <nav className="flex flex-col gap-2 px-4 flex-1 mt-4">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                    }
                >
                    <Home size={20} />
                    <span>{t.home}</span>
                </NavLink>

                <NavLink
                    to="/pos"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                    }
                >
                    <ShoppingCart size={20} />
                    <span>Point of Sale</span>
                </NavLink>

                <NavLink
                    to="/inventory"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                    }
                >
                    <Package size={20} />
                    <span>{t.inventory}</span>
                </NavLink>

                <NavLink
                    to="/analytics"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                    }
                >
                    <BarChart2 size={20} />
                    <span>{t.stats}</span>
                </NavLink>
            </nav>

            <div className="p-4 mt-auto">
                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                    }
                >
                    <Settings size={20} />
                    <span>{t.settings}</span>
                </NavLink>
            </div>
        </aside>
    );
}
