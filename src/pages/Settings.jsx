import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Type, Globe, ChevronRight, Users, Palette, Check, MessageSquare, Bell, LogOut, Store, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { translations } from '../utils/translations';

export default function Settings() {
    const navigate = useNavigate();
    const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);
    const [isColorExpanded, setIsColorExpanded] = useState(false);
    const [isTextSizeExpanded, setIsTextSizeExpanded] = useState(false);
    const { theme, language, textSize, color, pushNotifications, setTheme, setLanguage, setTextSize, setColor, setPushNotifications } = useSettingsStore();
    const { currentTier, openPaywall, upgradeTier } = useSubscriptionStore();
    const { user, userRole, storeName, signOut, storeId, _loadStoreContext } = useAuthStore();
    const t = translations[language];

    const [storeMembers, setStoreMembers] = useState([]);
    const [contextLoading, setContextLoading] = useState(false);

    // Self-heal: if user is logged in but storeId is still null, retry loading
    useEffect(() => {
        if (!user || storeId || contextLoading) return;
        setContextLoading(true);
        _loadStoreContext(user).finally(() => setContextLoading(false));
    }, [user, storeId]);

    useEffect(() => {
        if (!storeId) return;
        supabase.rpc('get_store_members').then(({ data }) => {
            if (data) setStoreMembers(data);
        });
    }, [storeId]);

    const teamLimits = { free: 1, pro: 3, business: 999 };
    const maxSeats = teamLimits[currentTier] || 1;
    const ownerMember = storeMembers.find(m => m.role === 'owner');
    const staffMembers = storeMembers.filter(m => m.role !== 'owner');

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
                {typeof value === 'string' ? (
                    <>
                        <span className="text-sm">{value}</span>
                        <ChevronRight size={16} />
                    </>
                ) : (
                    value
                )}
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

            {/* Account Info */}
            <Section title={language === 'en' ? 'Account' : 'Akun'}>
                <div className="p-4 flex items-center gap-4 border-b border-border">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-lg">{user?.email?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{user?.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Store size={12} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">{storeName || '—'}</span>
                            {userRole && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${userRole === 'owner' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    {userRole.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div
                    onClick={async () => {
                        await signOut();
                        toast.success(language === 'en' ? 'Signed out' : 'Keluar');
                    }}
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-red-500/5 text-red-500 transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <LogOut size={16} />
                    </div>
                    <span className="font-medium">{language === 'en' ? 'Sign Out' : 'Keluar'}</span>
                </div>
            </Section>

            {/* Store & Team Hierarchy */}
            {storeId && (
            <Section title={language === 'en' ? 'Store & Team' : 'Toko & Tim'}>
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Store size={16} className="text-primary" />
                            <span className="font-semibold text-foreground">{storeName || '—'}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            currentTier === 'business' ? 'bg-purple-500/20 text-purple-400' :
                            currentTier === 'pro' ? 'bg-primary/20 text-primary' :
                            'bg-muted text-muted-foreground'
                        }`}>
                            {currentTier.toUpperCase()}
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                            <span>{language === 'en' ? 'Team seats' : 'Kursi tim'}</span>
                            <span>{storeMembers.length} / {maxSeats === 999 ? '\u221e' : maxSeats}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all"
                                style={{ width: maxSeats === 999 ? '5%' : `${Math.min((storeMembers.length / maxSeats) * 100, 100)}%` }} />
                        </div>
                    </div>
                </div>
                {ownerMember && (
                    <div className="p-4 border-b border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{language === 'en' ? 'Owner' : 'Pemilik'}</p>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <span className="text-white font-bold text-sm">{ownerMember.email?.[0]?.toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{ownerMember.email}</p>
                                <span className="text-[10px] font-bold text-primary uppercase">Owner</span>
                            </div>
                        </div>
                    </div>
                )}
                {staffMembers.length > 0 && (
                    <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {language === 'en' ? `Staff (${staffMembers.length})` : `Staf (${staffMembers.length})`}
                        </p>
                        <div className="space-y-3">
                            {staffMembers.map(m => (
                                <div key={m.user_id} className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${m.user_id === user?.id ? 'bg-green-500/20 ring-2 ring-green-500' : 'bg-muted'}`}>
                                        <span className="text-foreground font-bold text-sm">{m.email?.[0]?.toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {m.email}
                                            {m.user_id === user?.id && <span className="ml-1.5 text-[10px] text-green-500 font-bold">({language === 'en' ? 'You' : 'Anda'})</span>}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Staff</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Section>
            )}

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
                    icon={Bell}
                    label={t.pushNotifications || 'Push Notifications'}
                    value={
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">{pushNotifications ? 'On' : 'Off'}</span>
                            <div 
                                className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${pushNotifications ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!pushNotifications) {
                                        if ('Notification' in window) {
                                            const perm = await Notification.requestPermission();
                                            if (perm === 'granted') {
                                                setPushNotifications(true);
                                                toast.success(language === 'en' ? 'Notifications enabled!' : 'Notifikasi diaktifkan!');
                                            } else {
                                                toast.error(language === 'en' ? 'Permission denied.' : 'Izin ditolak.');
                                            }
                                        } else {
                                            toast.error('Push Notifications not supported by your browser.');
                                        }
                                    } else {
                                        setPushNotifications(false);
                                    }
                                }}
                            >
                                <motion.div 
                                    className="w-4 h-4 rounded-full bg-white shadow-sm"
                                    animate={{ x: pushNotifications ? 16 : 0 }}
                                />
                            </div>
                        </div>
                    }
                    onClick={() => {}}
                />
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
