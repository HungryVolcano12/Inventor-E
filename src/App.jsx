import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ItemDetails from './pages/ItemDetails';
import EditItem from './pages/EditItem';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TeamManagement from './pages/TeamManagement';
import Auth from './pages/Auth';
import { useSettingsStore } from './store/useSettingsStore';
import { useAuthStore } from './store/useAuthStore';
import { useInventoryStore } from './store/useInventoryStore';

function App() {
  const { theme, textSize, color } = useSettingsStore();
  const { user, loading, initialize } = useAuthStore();
  const { loadData } = useInventoryStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // Theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[textSize] || '16px';

    const colors = {
      pink: '328 100% 54%',
      red: '0 84% 60%',
      blue: '221 83% 53%',
      green: '142 71% 45%',
      purple: '271 81% 56%',
      orange: '24 98% 53%',
    };
    if (colors[color]) {
      document.documentElement.style.setProperty('--primary', colors[color]);
    }
  }, [theme, textSize, color]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Auth />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/:id" element={<ItemDetails />} />
          <Route path="inventory/edit/:id" element={<EditItem />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Settings />} />
          <Route path="team" element={<TeamManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
