import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';

export default function AddItemSheet({ isOpen, onClose }) {
    const { addItem, items, customCategories, addCategory } = useInventoryStore();
    const { language } = useSettingsStore();
    const t = translations[language];
    const fileInputRef = useRef(null);

    // Derive categories list for the dropdown
    const categories = [...new Set([...items.map(i => i.category), ...(customCategories || [])])];
    const defaultCategories = ['Ceramics', 'Home Goods', 'Kitchen', 'Textiles', 'Others'];
    const allCategories = [...new Set([...defaultCategories, ...categories])];


    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: '',
        stock: '',
        description: '',
        image: '',
        costPrice: ''
    });

    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategoryName, setCustomCategoryName] = useState('');

    // Reset form when sheet is opened (ensure clean slate)
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                category: '',
                price: '',
                stock: '',
                description: '',
                image: '',
                costPrice: ''
            });
            setIsCustomCategory(false);
            setCustomCategoryName('');
        }
    }, [isOpen]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert("File size must be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        if (value === 'CREATE_NEW') {
            setIsCustomCategory(true);
            setFormData({ ...formData, category: '' });
        } else {
            setIsCustomCategory(false);
            setFormData({ ...formData, category: value });
        }
    };


    const handleSubmit = (e) => {
        e.preventDefault();

        try {
            let finalCategory = formData.category;
            if (isCustomCategory) {
                if (!customCategoryName.trim()) return; // Prevent empty category
                finalCategory = customCategoryName;
                addCategory(finalCategory); // Add to global store
            }

            addItem({
                ...formData,
                category: finalCategory,
                // Use placeholder if no image uploaded
                image: formData.image || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=800',
                price: parseFloat(formData.price) || 0,
                stock: parseInt(formData.stock) || 0,
                costPrice: parseFloat(formData.costPrice) || 0,
            });

            // Close immediately
            onClose();

        } catch (error) {
            console.error("Failed to save item:", error);
            // Fallback close if something weird happens, though unlikely with current setup
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-background rounded-t-[2rem] z-[60] max-w-md mx-auto shadow-2xl h-[85vh] flex flex-col overflow-hidden text-foreground"
                    >
                        <div className="flex justify-between items-center p-6 pb-4 border-b border-border shrink-0">
                            <h2 className="text-xl font-bold">{t.addItem}</h2>
                            <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors">
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 pt-4 pb-safe">
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Image Upload Area */}
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">{t.uploadImage}</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-full h-48 rounded-xl border-2 border-dashed border-input flex flex-col items-center justify-center bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer overflow-hidden"
                                    >
                                        {formData.image ? (
                                            <>
                                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <span className="text-white font-medium text-sm flex items-center gap-1">
                                                        <Upload size={16} /> {t.changeImage}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-4">
                                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                                                    <ImageIcon size={24} />
                                                </div>
                                                <p className="text-sm font-medium text-muted-foreground">{t.uploadImage}</p>
                                                <p className="text-xs text-muted-foreground mt-1 opacity-70">{t.maxSize}</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t.itemName}</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Ceramic Vase"
                                        className="w-full text-lg border-b-2 border-border focus:border-primary outline-none py-2 transition-colors bg-transparent text-foreground placeholder:text-muted-foreground/50"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">{t.price}</label>
                                        <div className="relative">
                                            <span className="absolute left-0 top-2 text-muted-foreground text-xs font-bold pl-2">IDR</span>
                                            <input
                                                required
                                                type="number"
                                                placeholder="0"
                                                className="w-full pl-10 text-lg border-b-2 border-border focus:border-primary outline-none py-2 bg-transparent text-foreground placeholder:text-muted-foreground/50"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">{t.costPrice}</label>
                                        <div className="relative">
                                            <span className="absolute left-0 top-2 text-muted-foreground text-xs font-bold pl-2">IDR</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-full pl-10 text-lg border-b-2 border-border focus:border-primary outline-none py-2 bg-transparent text-foreground placeholder:text-muted-foreground/50"
                                                value={formData.costPrice || ''}
                                                onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">{t.stock}</label>
                                        <input
                                            required
                                            type="number"
                                            placeholder="0"
                                            className="w-full text-lg border-b-2 border-border focus:border-primary outline-none py-2 bg-transparent text-foreground placeholder:text-muted-foreground/50"
                                            value={formData.stock}
                                            onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t.category}</label>
                                    {!isCustomCategory ? (
                                        <select
                                            required
                                            className="w-full border-b-2 border-border py-2 outline-none bg-transparent text-foreground"
                                            value={formData.category}
                                            onChange={handleCategoryChange}
                                        >
                                            <option value="" className="bg-card text-foreground">{t.selectCategory}</option>
                                            {allCategories.map(cat => (
                                                <option key={cat} value={cat} className="bg-card text-foreground">{cat}</option>
                                            ))}
                                            <option value="CREATE_NEW" className="font-bold text-primary bg-card">+ {t.createNewCategory}</option>
                                        </select>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                required
                                                type="text"
                                                placeholder={t.enterCategoryName}
                                                className="w-full border-b-2 border-primary py-2 outline-none bg-transparent text-foreground placeholder:text-muted-foreground/50"
                                                value={customCategoryName}
                                                onChange={(e) => setCustomCategoryName(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { setIsCustomCategory(false); setFormData({ ...formData, category: '' }); }}
                                                className="p-2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t.description}</label>
                                    <textarea
                                        rows={3}
                                        className="w-full p-3 bg-muted/20 text-foreground rounded-xl border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none placeholder:text-muted-foreground/50"
                                        placeholder="..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 mt-8"
                                >
                                    <Check size={20} />
                                    {t.saveItem}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
