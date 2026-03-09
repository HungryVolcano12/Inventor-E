import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, Upload, Image as ImageIcon, X } from 'lucide-react';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';

export default function EditItem() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { items, updateItem, addCategory, customCategories } = useInventoryStore();
    const { language } = useSettingsStore();
    const t = translations[language];
    const fileInputRef = useRef(null);
    const existingItem = items.find(i => i.id === id);


    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: '',
        stock: '',
        description: '',
        image: ''
    });

    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategoryName, setCustomCategoryName] = useState('');

    useEffect(() => {
        if (existingItem) {
            setFormData({
                name: existingItem.name,
                category: existingItem.category,
                price: existingItem.price,
                stock: existingItem.stock,
                description: existingItem.description || '',
                image: existingItem.image,
                costPrice: existingItem.costPrice || ''
            });
        }
    }, [existingItem]);

    // Derive categories list 
    const categories = [...new Set([...items.map(i => i.category), ...(customCategories || [])])];
    const defaultCategories = ['Ceramics', 'Home Goods', 'Kitchen', 'Textiles', 'Others'];
    const allCategories = [...new Set([...defaultCategories, ...categories])];

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
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
        if (!existingItem) return;

        try {
            let finalCategory = formData.category;
            if (isCustomCategory) {
                if (!customCategoryName.trim()) return;
                finalCategory = customCategoryName;
                addCategory(finalCategory);
            }

            updateItem(id, {
                ...formData,
                category: finalCategory,
                price: parseFloat(formData.price) || 0,
                stock: parseInt(formData.stock) || 0,
                costPrice: parseFloat(formData.costPrice) || 0
            });
            navigate('/inventory', { replace: true });
        } catch (error) {
            console.error("Failed to update item:", error);
            navigate('/inventory', { replace: true }); // Attempt to navigate anyway
        }
    };

    if (!existingItem) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p>{t.itemNotFound}</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary font-medium">
                    Go Back
                </button>
            </div>
        )
    }

    return (
        <div className="bg-background min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-muted text-foreground"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-foreground">{t.editItem}</h1>
            </header>

            <main className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
                    {/* Image Upload Area */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t.uploadImage}</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-full h-48 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden"
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
                                    <p className="text-sm font-medium text-foreground">{t.uploadImage}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{t.maxSize}</p>
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
                        <label className="block text-sm font-medium text-foreground mb-1">{t.itemName}</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. Ceramic Vase"
                            className="w-full text-lg border-b-2 border-border focus:border-primary outline-none py-2 transition-colors bg-transparent text-foreground placeholder:text-muted-foreground"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t.price}</label>
                            <div className="relative">
                                <span className="absolute left-0 top-2 text-muted-foreground text-xs font-bold pl-2">IDR</span>
                                <input
                                    required
                                    type="number"
                                    placeholder="0"
                                    className="w-full pl-10 text-lg border-b-2 border-border focus:border-primary outline-none py-2 bg-transparent text-foreground placeholder:text-muted-foreground"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t.costPrice}</label>
                            <div className="relative">
                                <span className="absolute left-0 top-2 text-muted-foreground text-xs font-bold pl-2">IDR</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full pl-10 text-lg border-b-2 border-border focus:border-primary outline-none py-2 bg-transparent text-foreground placeholder:text-muted-foreground"
                                    value={formData.costPrice || ''}
                                    onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1">{t.stock}</label>
                            <input
                                required
                                type="number"
                                placeholder="0"
                                className="w-full text-lg border-b-2 border-border focus:border-primary outline-none py-2 bg-transparent text-foreground placeholder:text-muted-foreground"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">{t.category}</label>
                        {!isCustomCategory ? (
                            <select
                                required
                                className="w-full border-b-2 border-border py-2 outline-none bg-transparent text-foreground"
                                value={formData.category}
                                onChange={handleCategoryChange}
                            >
                                <option value="" className="text-black">{t.selectCategory}</option>
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat} className="text-black">{cat}</option>
                                ))}
                                <option value="CREATE_NEW" className="font-bold text-primary">+ {t.createNewCategory}</option>
                            </select>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    placeholder={t.enterCategoryName}
                                    className="w-full border-b-2 border-primary py-2 outline-none bg-transparent text-foreground"
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
                        <label className="block text-sm font-medium text-foreground mb-1">{t.description}</label>
                        <textarea
                            rows={3}
                            className="w-full p-3 bg-muted/50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none text-foreground placeholder:text-muted-foreground"
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
                        {t.saveChanges}
                    </button>
                </form>
            </main>
        </div>
    );
}
