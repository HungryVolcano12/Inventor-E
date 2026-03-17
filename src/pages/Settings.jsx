import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Type, Globe, ChevronRight, Users, Palette, Check, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { translations } from '../utils/translations';

export default function Settings() {
    const navigate = useNavigate();
    const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);
    const [isColorExpanded, setIsColorExpanded] = useState(false);
    const [isTextSizeExpanded, setIsTextSizeExpanded] = useState(false);
    const { theme, language, textSize, color, setTheme, setLanguage, setTextSize, setColor } = useSettingsStore();
    const { currentTier, openPaywall, upgradeTier } = useSubscriptionStore();
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

    const handleTeamClick = () => {
        if (currentTier === 'free') {
            openPaywall('role_limit_reached');
        } else {
            navigate('/team');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 pb-24"
        >
            <header className="mb-8 mt-4">
                <h1 className="text-3xl font-bold text-foreground">{t.settings}</h1>
            </header>

            <Section title={t.developerTemp}>
                <div
                    onClick={() => {
                        const tiers = ['free', 'pro', 'business'];
                        const nextTier = tiers[(tiers.indexOf(currentTier) + 1) % tiers.length];
                        upgradeTier(nextTier);
                    }}
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors bg-yellow-500/10 border border-yellow-500/50`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-600 font-bold text-xs">
                            DEV
                        </div>
                        <span className="font-medium text-yellow-600 font-mono">{t.currentTier}</span>
                    </div>
                    <div className="flex items-center gap-2 text-yellow-600 font-bold uppercase tracking-widest">
                        <span>{currentTier === 'free' ? t.freePlan : currentTier === 'pro' ? t.proPlan : t.businessPlan}</span>
                        <ChevronRight size={16} />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground px-4 py-3 text-center bg-muted/30">
                    {t.cycleTiersMsg}
                </p>
            </Section>

            <Section title={t.accountAndTeam}>
                <Row
                    icon={Users}
                    label={t.teamManagement}
                    value={currentTier === 'free' ? t.upgradeRequired : t.manage}
                    onClick={handleTeamClick}
                    last={true}
                />
            </Section>

            <Section title={t.appearance}>
                <Row
                    icon={theme === 'dark' ? Moon : Sun}
                    label={t.theme || 'Theme'}
                    value={theme === 'dark' ? t.darkMode : t.lightMode}
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                />
                <Row
                    icon={Type}
                    label={t.textSize}
                    value={textSize.charAt(0).toUpperCase() + textSize.slice(1)}
                    onClick={() => setIsTextSizeExpanded(!isTextSizeExpanded)}
                    last={!isTextSizeExpanded}
                />
                <AnimatePresence>
                    {isTextSizeExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3 } }}
                            exit={{ height: 0, opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
                            className="bg-muted/10 overflow-hidden"
                        >
                            <div className="flex flex-col p-3 gap-2">
                                {['small', 'medium', 'large'].map((size, index) => {
                                    const isSelected = textSize === size;
                                    
                                    return (
                                        <motion.button
                                            key={size}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ delay: index * 0.1 }}
                                            onClick={() => {
                                                setIsTextSizeExpanded(false);
                                                setTimeout(() => setTextSize(size), 150);
                                            }}
                                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${isSelected ? 'bg-primary text-primary-foreground font-medium shadow-md scale-[1.02]' : 'hover:bg-muted text-foreground hover:scale-[1.01]'}`}
                                        >
                                            <span>{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                                            {isSelected && <Check size={18} strokeWidth={3} className="text-primary-foreground" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <Row
                    icon={Palette}
                    label={t.colorTheme || 'Color Theme'}
                    value={(t[color] || color).charAt(0).toUpperCase() + (t[color] || color).slice(1)}
                    onClick={() => setIsColorExpanded(!isColorExpanded)}
                    last={!isColorExpanded}
                />

                <AnimatePresence>
                    {isColorExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3 } }}
                        exit={{ height: 0, opacity: 0, transition: { duration: 0.3, delay: 0.3 } }}
                        className="bg-muted/10 overflow-hidden"
                    >
                        <div className="p-4 flex justify-center gap-6">
                                {['pink', 'red', 'blue', 'green', 'purple', 'orange'].map((themeColor, index) => {
                                    const colors = {
                                        pink: '#ff1493',
                                        red: '#ef4444',
                                    blue: '#3b82f6',
                                    green: '#22c55e',
                                    purple: '#8b5cf6',
                                    orange: '#f97316'
                                };

                                const isSelected = color === themeColor;

                                return (
                                    <motion.button
                                        key={themeColor}
                                        initial={{ scale: 0, rotate: -180, y: -20 }}
                                        animate={{ scale: 1, rotate: 0, y: 0 }}
                                        exit={{ scale: 0, rotate: 180, y: -20 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 260,
                                            damping: 20,
                                            delay: index * 0.05
                                        }}
                                        onClick={() => setColor(themeColor)}
                                        style={{ backgroundColor: colors[themeColor] }}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-shadow
                                            ${isSelected ? 'ring-2 ring-offset-2 ring-primary ring-offset-card' : 'hover:scale-110 opacity-80'}
                                        `}
                                    >
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            >
                                                <Check size={16} className="text-white drop-shadow-sm" strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                    )}
                </AnimatePresence>
            </Section>

            <Section title={t.experiencingProblems}>
                <Row
                    icon={MessageSquare}
                    label={t.contactSupport}
                    value="WhatsApp"
                    onClick={() => {
                        const phoneNumber = "6287761267280";
                        const message = "Hello, I am experiencing problems with my Inventor-E app. Can you help me? My email is [user_email]";
                        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                    }}
                    last={true}
                />
            </Section>

            <Section title={t.preferences}>
                <Row
                    icon={Globe}
                    label={t.language}
                    value={language === 'en' ? t.english : t.indonesian}
                    onClick={() => setIsLanguageExpanded(!isLanguageExpanded)}
                    last={!isLanguageExpanded}
                />
                <AnimatePresence>
                    {isLanguageExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3 } }}
                            exit={{ height: 0, opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
                            className="bg-muted/10 overflow-hidden"
                        >
                            <div className="flex flex-col p-3 gap-2">
                                {['en', 'id'].map((langCode, index) => {
                                    const isSelected = language === langCode;
                                    const langName = langCode === 'en' ? t.english : t.indonesian;
                                    
                                    return (
                                        <motion.button
                                            key={langCode}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ delay: index * 0.1 }}
                                            onClick={() => {
                                                setIsLanguageExpanded(false);
                                                setTimeout(() => setLanguage(langCode), 150);
                                            }}
                                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${isSelected ? 'bg-primary text-primary-foreground font-medium shadow-md scale-[1.02]' : 'hover:bg-muted text-foreground hover:scale-[1.01]'}`}
                                        >
                                            <span>{langName}</span>
                                            {isSelected && <Check size={18} strokeWidth={3} className="text-primary-foreground" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Section>

            <div className="text-center text-xs text-gray-400 mt-10">
                <p>Inventor-E v1.0.0</p>
            </div>
        </motion.div>
    );
}
