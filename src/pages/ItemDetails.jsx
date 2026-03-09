import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';
import { ChevronLeft, Share, Heart, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/currency';
import SellModal from '../components/SellModal';

export default function ItemDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const item = useInventoryStore((state) => state.items.find((i) => i.id === id));
    const { language } = useSettingsStore();
    const t = translations[language];
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);

    if (!item) {
        return <div className="p-10 text-center">{t.itemNotFound}</div>;
    }

    const safeT = t || {
        sellItem: 'Sell Item',
        leftInStock: 'left in stock',
        quantity: 'Quantity',
        confirmSell: 'Confirm Sell'
    };

    return (
        <div className="bg-background min-h-screen pb-24 relative">
            {/* Header Actions */}
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-between p-6">
                <button
                    onClick={() => navigate(-1)}
                    className="bg-card/90 p-2 rounded-full shadow-md backdrop-blur-sm text-foreground"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex gap-3">
                    <button className="bg-card/90 p-2 rounded-full shadow-md backdrop-blur-sm text-foreground">
                        <Share size={20} />
                    </button>
                    <button className="bg-card/90 p-2 rounded-full shadow-md backdrop-blur-sm text-foreground">
                        <Heart size={20} />
                    </button>
                </div>
            </div>

            {/* Hero Image */}
            <motion.div
                layoutId={`image-${item.id}`}
                className="w-full aspect-[4/3] bg-muted"
            >
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </motion.div>

            {/* Content */}
            <div className="p-6 -mt-6 bg-card rounded-t-3xl relative z-0 border-t border-border">
                <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground mb-2">{item.name}</h1>
                    <p className="text-muted-foreground">{item.category}</p>
                </div>

                <div className="flex items-center justify-between py-6 border-t border-b border-border mb-6">
                    <div>
                        <span className="block text-xs text-muted-foreground">{t.price}</span>
                        <span className="text-xl font-bold text-foreground">{formatCurrency(item.price)}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-xs text-muted-foreground">{t.stock}</span>
                        <span className={`text-xl font-bold ${item.stock < 5 ? 'text-destructive' : 'text-green-600'}`}>
                            {item.stock} {t.unit}
                        </span>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold mb-2 text-foreground">{t.description}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                        {item.description || "No description provided."}
                    </p>
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-card border-t border-border max-w-md mx-auto">
                <button
                    onClick={() => setIsSellModalOpen(true)}
                    className="w-full bg-primary text-white font-semibold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                    <DollarSign size={20} />
                    {t.sellItem || 'Sell Item'}
                </button>
            </div>

            <SellModal
                isOpen={isSellModalOpen}
                onClose={() => setIsSellModalOpen(false)}
                item={item}
                t={safeT}
            />
        </div>
    );
}
