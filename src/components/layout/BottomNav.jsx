import { Home, Package, PlusCircle, User, BarChart2, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/useUIStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { translations } from '../../utils/translations';

export default function BottomNav() {
    const openAddSheet = useUIStore((state) => state.openAddSheet);
    const { language } = useSettingsStore();
    const t = translations[language];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
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
                    <button
                        onClick={openAddSheet}
                        className="bg-primary text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                        <PlusCircle size={28} />
                    </button>
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
