import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserPlus, Shield, MoreVertical, X, Check, Copy, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../utils/translations';

export default function TeamManagement() {
    const navigate = useNavigate();
    const { currentTier } = useSubscriptionStore();
    const { language } = useSettingsStore();
    const t = translations[language];

    // Define limits based on tier
    const teamLimits = {
        free: 1,
        pro: 3,
        business: 'Unlimited'
    };

    const maxUsers = teamLimits[currentTier];

    // Local state for team members (in a real app, this would be in a store/DB)
    const [teamMembers, setTeamMembers] = useState([
        { id: 1, name: 'Store Owner', email: 'owner@inventore.app', role: 'Owner', active: true },
    ]);

    const currentUsers = teamMembers.length;

    // UI States for Modals
    const [editingMember, setEditingMember] = useState(null);
    const [editEmail, setEditEmail] = useState('');

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    // Handlers
    const openEditModal = (member) => {
        setEditingMember(member);
        setEditEmail(member.email);
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        setTeamMembers(teamMembers.map(m =>
            m.id === editingMember.id ? { ...m, email: editEmail } : m
        ));
        setEditingMember(null);
    };

    const handleGenerateLink = () => {
        if (maxUsers !== 'Unlimited' && currentUsers >= maxUsers) {
            useSubscriptionStore.getState().openPaywall('role_limit_reached');
            return;
        }

        // Mock generating a unique invite link
        const uniqueCode = Math.random().toString(36).substring(2, 10);
        setInviteLink(`https://inventore.app/join/${uniqueCode}`);
        setIsInviteOpen(true);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen bg-background p-6 pb-24 relative"
        >
            <header className="mb-8 mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-muted/50 text-foreground transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t.teamManagement}</h1>
                </div>
            </header>

            {/* Subscription Status Banner */}
            <div className={`p-5 rounded-2xl mb-8 border ${currentTier === 'business'
                ? 'bg-primary/10 border-primary/20 text-primary-foreground'
                : 'bg-muted/50 border-border text-foreground'
                }`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold flex items-center gap-2">
                        <Shield size={18} className={currentTier === 'business' ? 'text-primary' : 'text-muted-foreground'} />
                        {currentTier === 'free' ? t.freePlan : currentTier === 'pro' ? t.proPlan : t.businessPlan}
                    </h3>
                    <span className="text-sm font-medium opacity-80">
                        {currentUsers} / {maxUsers === 'Unlimited' ? '∞' : maxUsers} {t.seatsUsed}
                    </span>
                </div>
                <div className="w-full bg-background/50 rounded-full h-2 overflow-hidden mt-3">
                    <div
                        className={`h-full rounded-full ${currentTier === 'business' ? 'bg-primary' : 'bg-foreground'}`}
                        style={{
                            width: maxUsers === 'Unlimited' ? '5%' : `${(currentUsers / maxUsers) * 100}%`
                        }}
                    ></div>
                </div>
            </div>

            {/* Main Action Area */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground">{t.teamMembers}</h2>
                <button
                    onClick={handleGenerateLink}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                    <UserPlus size={16} />
                    {t.inviteMember}
                </button>
            </div>

            {/* Team List */}
            <div className="space-y-3">
                {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {member.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-foreground">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative">
                            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                                {member.role}
                            </span>
                            <button
                                onClick={() => openEditModal(member)}
                                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {currentTier !== 'business' && (
                    <div className="p-6 mt-8 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center opacity-70">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                            <UserPlus size={20} />
                        </div>
                        <h4 className="font-bold text-foreground mb-1">{t.needMoreSeats}</h4>
                        <p className="text-sm text-muted-foreground mb-4">{t.upgradeForUnlimited}</p>
                        <button
                            onClick={() => useSubscriptionStore.getState().openPaywall('role_limit_reached')}
                            className="text-xs font-bold text-primary uppercase tracking-wider hover:underline"
                        >
                            {t.viewPlans}
                        </button>
                    </div>
                )}
            </div>

            {/* Edit Member Modal */}
            <AnimatePresence>
                {editingMember && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">{t.editMember}</h3>
                                <button onClick={() => setEditingMember(null)} className="p-2 bg-muted rounded-full text-muted-foreground">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">{t.memberName}</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={editingMember.name}
                                        className="w-full p-3 rounded-xl bg-muted/50 text-muted-foreground border-none outline-none cursor-not-allowed"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">{t.changeNameInfo}</p>
                                </div>
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-foreground mb-2">{t.loginEmail}</label>
                                    <input
                                        type="email"
                                        required
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-primary text-foreground bg-transparent focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>

                                <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors">
                                    {t.saveChanges}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Invite Link Modal */}
            <AnimatePresence>
                {isInviteOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center"
                        >
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                                <LinkIcon size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t.inviteMember}</h3>
                            <p className="text-muted-foreground text-sm mb-6">{t.shareLinkInfo}</p>

                            <div className="bg-muted p-3 rounded-xl flex items-center justify-between gap-3 mb-6 border border-border">
                                <span className="text-sm font-medium text-foreground truncate select-all">{inviteLink}</span>
                                <button
                                    onClick={handleCopy}
                                    className="p-2 bg-background border border-border shadow-sm rounded-lg hover:bg-muted/80 shrink-0 text-foreground transition-all"
                                >
                                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                            </div>

                            <button
                                onClick={() => setIsInviteOpen(false)}
                                className="w-full bg-muted text-foreground font-bold py-3 rounded-xl hover:bg-muted/80 transition-colors"
                            >
                                {t.done}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
