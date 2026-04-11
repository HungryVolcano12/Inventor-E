import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';

export default function JoinStore() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const { user, signIn, _loadStoreContext } = useAuthStore();
    const { language } = useSettingsStore();

    const [inviteInfo, setInviteInfo] = useState(null);
    const [inviteError, setInviteError] = useState('');
    const [mode, setMode] = useState('signup'); // 'signup' | 'login'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(true);

    // 1. Validate the token on load
    useEffect(() => {
        if (!token) {
            setInviteError(language === 'en' ? 'No invite token found in this link.' : 'Token undangan tidak ditemukan di tautan ini.');
            setChecking(false);
            return;
        }

        supabase
            .rpc('get_invite_by_token', { p_token: token })
            .then(({ data: rows, error }) => {
                const data = rows?.[0];
                if (error || !data) {
                    setInviteError(language === 'en' ? 'This invite link is invalid.' : 'Tautan undangan ini tidak valid.');
                } else if (data.claimed_by) {
                    setInviteError(language === 'en' ? 'This invite link has already been used.' : 'Tautan undangan ini sudah digunakan.');
                } else if (new Date(data.expires_at) < new Date()) {
                    setInviteError(language === 'en' ? 'This invite link has expired.' : 'Tautan undangan ini sudah kadaluarsa.');
                } else {
                    setInviteInfo(data);
                    if (data.email) setEmail(data.email);
                }
                setChecking(false);
            });
    }, [token]);

    // 2. If user is already logged in, claim immediately
    useEffect(() => {
        if (user && inviteInfo && !checking) {
            claimInvite();
        }
    }, [user, inviteInfo, checking]);

    const claimInvite = async () => {
        // For already-logged-in or sign-in users: store token so auth listener claims it
        localStorage.setItem('pending_invite_token', token);
        setLoading(true);
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
            await _loadStoreContext(currentUser);
        }
        navigate('/', { replace: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'signup') {
                // Embed the invite token in user metadata — survives page reloads
                // _loadStoreContext will detect and claim it on every login until success
                const { data, error: signUpErr } = await supabase.auth.signUp({
                    email, password,
                    options: { data: { pending_invite_token: token } }
                });
                if (signUpErr) throw signUpErr;
                // Navigation happens automatically via onAuthStateChange in App.jsx
            } else {
                // Sign in then claim
                await signIn(email, password);
                await claimInvite();
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (inviteError) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <Package size={28} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">{language === 'en' ? 'Invalid Invite' : 'Undangan Tidak Valid'}</h2>
                <p className="text-muted-foreground text-sm mb-6">{inviteError}</p>
                <button onClick={() => navigate('/')} className="text-primary font-semibold text-sm hover:underline">
                    {language === 'en' ? 'Go to app' : 'Buka aplikasi'}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                    <Package size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-foreground">
                    {language === 'en' ? "You've been invited!" : 'Anda diundang!'}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {language === 'en' ? 'You will join as Staff after signing up.' : 'Anda akan bergabung sebagai Staf setelah mendaftar.'}
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-xl p-8"
            >
                {/* Mode toggle */}
                <div className="flex bg-muted rounded-xl p-1 mb-6">
                    {(['signup', 'login']).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(''); }}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                            {m === 'signup' ? (language === 'en' ? 'New Account' : 'Akun Baru') : (language === 'en' ? 'Sign In' : 'Masuk')}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                        <input
                            type="email"
                            required
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
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="text-sm text-red-500 bg-red-500/10 px-4 py-2 rounded-lg">{error}</motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/25 mt-2"
                    >
                        {loading
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : mode === 'signup'
                                ? <><UserPlus size={18} /> {language === 'en' ? 'Create Account & Join' : 'Buat Akun & Bergabung'}</>
                                : <><LogIn size={18} /> {language === 'en' ? 'Sign In & Join' : 'Masuk & Bergabung'}</>
                        }
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
