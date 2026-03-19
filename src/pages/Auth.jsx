import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Package, LogIn, UserPlus, Store } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';

export default function Auth() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [storeName, setStoreName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const { signIn, signUp } = useAuthStore();
    const { language } = useSettingsStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (mode === 'login') {
                await signIn(email, password);
            } else {
                await signUp(email, password, storeName);
                setSuccessMsg(language === 'en'
                    ? 'Account created! You can now sign in.'
                    : 'Akun berhasil dibuat! Silakan masuk.');
                setMode('login');
            }
        } catch (err) {
            const msg = err.message || '';
            if (msg.toLowerCase().includes('email not confirmed')) {
                setError(language === 'en'
                    ? 'Please confirm your email first — check your inbox for a confirmation link.'
                    : 'Konfirmasi email Anda dulu — cek kotak masuk untuk tautan konfirmasi.');
            } else if (msg.toLowerCase().includes('invalid login')) {
                setError(language === 'en' ? 'Wrong email or password.' : 'Email atau kata sandi salah.');
            } else {
                setError(msg || 'An error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            {/* Brand Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
            >
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                    <Package size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">INVENTOR-E</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {language === 'en' ? 'Smart Inventory Management' : 'Manajemen Inventaris Cerdas'}
                </p>
            </motion.div>

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-xl p-8"
            >
                {/* Mode Toggle */}
                <div className="flex bg-muted rounded-xl p-1 mb-8">
                    {['login', 'signup'].map((m) => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {m === 'login'
                                ? (language === 'en' ? 'Sign In' : 'Masuk')
                                : (language === 'en' ? 'Sign Up' : 'Daftar')
                            }
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence mode="wait">
                        {mode === 'signup' && (
                            <motion.div
                                key="storeName"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    <Store size={14} className="inline mr-1.5 mb-0.5" />
                                    {language === 'en' ? 'Store Name' : 'Nama Toko'}
                                </label>
                                <input
                                    type="text"
                                    required={mode === 'signup'}
                                    placeholder={language === 'en' ? 'e.g. My Boutique' : 'contoh: Toko Saya'}
                                    value={storeName}
                                    onChange={e => setStoreName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary transition-colors"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                        <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {language === 'en' ? 'Password' : 'Kata Sandi'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-red-500 bg-red-500/10 px-4 py-2 rounded-lg"
                        >
                            {error}
                        </motion.p>
                    )}

                    {successMsg && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-green-600 bg-green-500/10 px-4 py-2 rounded-lg"
                        >
                            {successMsg}
                        </motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/25"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : mode === 'login' ? (
                            <><LogIn size={18} /> {language === 'en' ? 'Sign In' : 'Masuk'}</>
                        ) : (
                            <><UserPlus size={18} /> {language === 'en' ? 'Create Account' : 'Buat Akun'}</>
                        )}
                    </button>
                </form>
            </motion.div>

            <p className="text-xs text-muted-foreground/50 mt-8 text-center">
                Inventor-E · {new Date().getFullYear()}
            </p>
        </div>
    );
}
