import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ItemDetails from './pages/ItemDetails';
import EditItem from './pages/EditItem';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TeamManagement from './pages/TeamManagement';
import { useSettingsStore } from './store/useSettingsStore';

function App() {
  const { theme, textSize, color } = useSettingsStore();

  useEffect(() => {
    // Theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Text Size (Simplified approach using CSS variable or root font-size)
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    document.documentElement.style.fontSize = sizes[textSize] || '16px';

    // Color Theme Injection
    const colors = {
      pink: '346 100% 58%', // #f11d57
      red: '0 84% 60%', // #ef4444
      blue: '221 83% 53%', // #3b82f6
      green: '142 71% 45%', // #22c55e
      purple: '271 81% 56%', // #8b5cf6
      orange: '24 98% 53%', // #f97316
    };

    if (colors[color]) {
      document.documentElement.style.setProperty('--primary', colors[color]);
    }

  }, [theme, textSize, color]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/:id" element={<ItemDetails />} />
          <Route path="inventory/edit/:id" element={<EditItem />} />
          <Route path="analytics" element={<Analytics />} /> {/* Analytics Route */}
          <Route path="profile" element={<Settings />} />
          <Route path="team" element={<TeamManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
