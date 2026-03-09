import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ItemDetails from './pages/ItemDetails';
import EditItem from './pages/EditItem';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { useSettingsStore } from './store/useSettingsStore';

function App() {
  const { theme, textSize } = useSettingsStore();

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

  }, [theme, textSize]);

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
