import { motion } from 'framer-motion';
import { Moon, Sun, Type, Globe, ChevronRight } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';

export default function Settings() {
    const { theme, language, textSize, setTheme, setLanguage, setTextSize } = useSettingsStore();
    const t = translations[language];

    const Section = ({ title, children }) => (
        <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">{title}</h3>
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                {children}
            </div>
        </div>
    );

    const Row = ({ icon: Icon, label, value, onClick, last }) => (
        <div
            onClick={onClick}
            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${!last ? 'border-b border-border' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon size={18} />
                </div>
                <span className="font-medium text-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">{value}</span>
                <ChevronRight size={16} />
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 pb-24"
        >
            <header className="mb-8 mt-4">
                <h1 className="text-3xl font-bold text-foreground">{t.settings}</h1>
            </header>

            <Section title={t.appearance}>
                <Row
                    icon={theme === 'dark' ? Moon : Sun}
                    label={t.theme}
                    value={theme === 'dark' ? t.darkMode : t.lightMode}
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                />
                <Row
                    icon={Type}
                    label={t.textSize}
                    value={textSize.charAt(0).toUpperCase() + textSize.slice(1)}
                    onClick={() => {
                        const sizes = ['small', 'medium', 'large'];
                        const nextIndex = (sizes.indexOf(textSize) + 1) % sizes.length;
                        setTextSize(sizes[nextIndex]);
                    }}
                    last={true}
                />
            </Section>

            <Section title={t.preferences}>
                <Row
                    icon={Globe}
                    label={t.language}
                    value={language === 'en' ? t.english : t.indonesian}
                    onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
                    last={true}
                />
            </Section>

            <div className="text-center text-xs text-gray-400 mt-10">
                <p>Inventor-E v1.0.0</p>
            </div>
        </motion.div>
    );
}
