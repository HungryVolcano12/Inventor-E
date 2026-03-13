import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { X, Check } from 'lucide-react';
import { translations } from '../utils/translations'; // We'll add translations for this later as needed

const tiers = [
    {
        id: 'free',
        nameKey: 'planFree',
        price: '$0',
        periodKey: 'forever',
        featuresKeys: ['upTo50Items', 'oneUserOwner', 'basicAnalytics'],
        buttonText: 'Current Plan',
        highlight: false,
    },
    {
        id: 'pro',
        nameKey: 'planPro',
        price: '$15',
        periodKey: 'perMonth',
        featuresKeys: ['unlimitedItems', 'upTo3TeamMembers', 'advancedAnalytics', 'prioritySupport'],
        buttonText: 'Upgrade to Pro',
        highlight: true,
    },
    {
        id: 'business',
        nameKey: 'planBusiness',
        price: '$49',
        periodKey: 'perMonth',
        featuresKeys: ['unlimitedItems', 'unlimitedTeamMembers', 'multiStoreSupport', 'roundTheClockSupport'],
        buttonText: 'Upgrade to Business',
        highlight: false,
    }
];

export default function SubscriptionModal() {
    const { isPaywallOpen, closePaywall, upgradeTier, paywallReason, currentTier } = useSubscriptionStore();
    const { language } = useSettingsStore();
    const t = translations[language];

    // Simple reasoning text mapped
    const reasonText = {
        'item_limit_reached': t.reasonItemLimit,
        'role_limit_reached': t.reasonRoleLimit
    };

    if (!isPaywallOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={closePaywall}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={closePaywall}
                        className="absolute right-4 top-4 p-2 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 md:p-12 text-center">
                        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
                            {t.upgradeExperience}
                        </h2>
                        {paywallReason && (
                            <p className="text-destructive font-medium bg-destructive/10 inline-block px-4 py-2 rounded-full mb-6">
                                {reasonText[paywallReason] || 'Please upgrade to access this feature.'}
                            </p>
                        )}
                        <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
                            {t.unlockPower}
                        </p>

                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            {tiers.map((tier) => {
                                const isCurrentTier = currentTier === tier.id;

                                return (
                                    <div
                                        key={tier.id}
                                        className={`relative flex flex-col p-6 md:p-8 rounded-2xl text-left transition-all ${tier.highlight
                                            ? 'bg-primary text-primary-foreground shadow-xl scale-100 md:scale-105 ring-4 ring-primary/30'
                                            : 'bg-background border border-border shadow-sm'
                                            }`}
                                    >
                                        {tier.highlight && (
                                            <div className="absolute top-0 right-6 translate-y-[-50%] bg-white text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                                                {t.mostPopular}
                                            </div>
                                        )}
                                        <h3 className={`text-xl font-bold mb-2 ${tier.highlight ? 'text-primary-foreground' : 'text-foreground'}`}>
                                            {t[tier.nameKey]}
                                        </h3>
                                        <div className="flex items-baseline mb-6">
                                            <span className={`text-4xl font-black ${tier.highlight ? 'text-white' : 'text-foreground'}`}>
                                                {tier.price}
                                            </span>
                                            <span className={`ml-1 ${tier.highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                {t[tier.periodKey]}
                                            </span>
                                        </div>

                                        <ul className="space-y-4 flex-1 mb-8 text-sm">
                                            {tier.featuresKeys.map((featureKey, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <Check shrink={0} size={18} className={tier.highlight ? 'text-white' : 'text-primary'} />
                                                    <span className={tier.highlight ? 'text-primary-foreground/90' : 'text-muted-foreground'}>{t[featureKey]}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => !isCurrentTier && upgradeTier(tier.id)}
                                            disabled={isCurrentTier}
                                            className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${isCurrentTier
                                                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
                                                : tier.highlight
                                                    ? 'bg-white text-primary hover:bg-gray-100 shadow-lg'
                                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                }`}
                                        >
                                            {isCurrentTier ? t.currentPlanBtn : tier.id === 'pro' ? t.upgradeToPro : tier.id === 'business' ? t.upgradeToBusiness : tier.buttonText}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
