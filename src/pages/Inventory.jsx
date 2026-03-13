import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';
import InventoryCard from '../components/InventoryCard';
import AddItemCard from '../components/AddItemCard';
import SortFilterMenu from '../components/SortFilterMenu';
import { Search, LayoutGrid, List as ListIcon, Plus, CheckSquare, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

export default function Inventory() {
    const navigate = useNavigate();
    const { items, getFilteredItems, setSearchQuery, deleteItem, deleteItems, customCategories, addCategory } = useInventoryStore();
    const { language } = useSettingsStore();
    const t = translations[language];

    const filteredItems = getFilteredItems();
    const [activeCategory, setActiveCategory] = useState('All');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Categories derived from items + custom categories + 'All'
    const categories = ['All', ...new Set([...items.map(i => i.category), ...(customCategories || [])])];

    const handleAddCategory = () => {
        const newCategory = prompt(language === 'en' ? "Enter new category name:" : "Masukkan nama kategori baru:");
        if (newCategory) {
            addCategory(newCategory);
            setActiveCategory(newCategory);
        }
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedItems(new Set());
    };

    const handleToggleSelect = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const confirmDelete = () => {
        deleteItems(Array.from(selectedItems));
        setIsSelectionMode(false);
        setSelectedItems(new Set());
        setShowDeleteConfirm(false);
    };

    return (
        <div className="pb-32">
            {/* Sticky Header */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 pt-14 pb-4">
                <div className="flex items-center gap-3 shadow-sm rounded-full border border-border bg-card px-4 py-3">
                    {isSelectionMode ? (
                        <div className="flex-1 flex items-center justify-between">
                            <span className="font-semibold text-foreground ml-2">
                                {selectedItems.size} {t.selected}
                            </span>
                            <button
                                onClick={toggleSelectionMode}
                                className="p-2 rounded-full hover:bg-muted text-muted-foreground"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Search className="text-foreground shrink-0" size={18} strokeWidth={2.5} />
                            <input
                                type="text"
                                placeholder={t.searchPlaceholder}
                                className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-muted-foreground text-foreground min-w-0"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            <SortFilterMenu t={t} />

                            <button
                                onClick={toggleSelectionMode}
                                className={`p-1.5 sm:p-2 rounded-full border border-border hover:shadow-md transition-all active:scale-90 shrink-0 ${isSelectionMode ? 'bg-primary text-white border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                title={t.selectItems}
                            >
                                <CheckSquare size={16} />
                            </button>

                            <button
                                onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                                className="p-1.5 sm:p-2 rounded-full border border-border hover:shadow-md transition-all active:scale-90 text-muted-foreground hover:text-foreground shrink-0"
                                title={viewMode === 'grid' ? "Switch to List View" : "Switch to Grid View"}
                            >
                                {viewMode === 'grid' ? <ListIcon size={16} /> : <LayoutGrid size={16} />}
                            </button>
                        </>
                    )}
                </div>

                {/* Categories Scroll */}
                {!isSelectionMode && (
                    <div className="flex gap-3 overflow-x-auto mt-4 pb-2 no-scrollbar -mx-6 px-6 items-center">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeCategory === cat
                                    ? 'bg-pink-100 text-pink-600 shadow-sm border border-pink-200 dark:bg-white dark:text-black dark:border-transparent'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-transparent dark:hover:bg-gray-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                        <button
                            onClick={handleAddCategory}
                            className="whitespace-nowrap flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 dark:border-gray-700 dark:text-gray-500 dark:hover:border-gray-500 dark:hover:text-gray-400 transition-colors shrink-0"
                            title={language === 'en' ? "Add Category" : "Tambah Kategori"}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                )}
            </header>

            {/* Grid */}
            <main className="px-6 py-6" style={{ minHeight: '80vh' }}>
                <LayoutGroup>
                    <motion.div
                        layout
                        className={viewMode === 'grid'
                            ? "grid grid-cols-[repeat(auto-fill,minmax(135px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 sm:gap-6"
                            : "flex flex-col gap-4"
                        }
                    >
                        <AnimatePresence mode='popLayout'>
                            {/* Show Add Card only in All category and NOT in selection mode */}
                            {activeCategory === 'All' && !isSelectionMode && (
                                <AddItemCard t={t} viewMode={viewMode} />
                            )}

                            {filteredItems
                                .filter(item => activeCategory === 'All' || item.category === activeCategory)
                                .map((item) => (
                                    <InventoryCard
                                        key={item.id}
                                        item={item}
                                        viewMode={viewMode}
                                        onDelete={deleteItem}
                                        onEdit={(item) => navigate(`/inventory/edit/${item.id}`)}
                                        t={t}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedItems.has(item.id)}
                                        onToggleSelect={handleToggleSelect}
                                    />
                                ))}
                        </AnimatePresence>
                    </motion.div>
                </LayoutGroup>

                {filteredItems.length === 0 && activeCategory !== 'All' && (
                    <div className="text-center py-20 text-gray-400">
                        <p>{t.noItems}</p>
                    </div>
                )}
            </main>

            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {isSelectionMode && selectedItems.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-24 left-6 right-6 z-50"
                    >
                        <div className="bg-foreground text-background rounded-full shadow-2xl p-4 flex items-center justify-between px-6">
                            <span className="font-bold">{selectedItems.size} {t.selected}</span>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold transition-colors"
                            >
                                <Trash2 size={18} />
                                {t.deleteSelected}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card p-6 rounded-3xl w-full max-w-sm shadow-xl text-center"
                        >
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">{t.deleteSelected}?</h3>
                            <p className="text-muted-foreground mb-6">
                                {t.confirmBulkDelete} <br /> ({selectedItems.size} {t.unit}s)
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
                                >
                                    {t.cancelSelection}
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                                >
                                    {t.deleteSelected}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
