import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { useAuth } from '../context/AuthContext';
import { User, Calendar, ArrowRight, Loader2, ArrowLeft, Lock, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useMessageModal } from './MessageModal';

// ─── Typewriter ───────────────────────────────────────────────────────────────
const Typewriter = ({ words, speed = 150, wait = 3000 }: { words: string[]; speed?: number; wait?: number }) => {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);
    const [blink, setBlink] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setBlink(!blink), 500);
        return () => clearTimeout(t);
    }, [blink]);

    useEffect(() => {
        if (index === words.length) return;
        if (subIndex === words[index].length + 1 && !reverse) { setReverse(true); return; }
        if (subIndex === 0 && reverse) { setReverse(false); setIndex((p) => (p + 1) % words.length); return; }
        const t = setTimeout(() => setSubIndex((p) => p + (reverse ? -1 : 1)), reverse ? 75 : subIndex === words[index].length ? wait : speed);
        return () => clearTimeout(t);
    }, [subIndex, index, reverse, words, speed, wait]);

    return (
        <span>
            {words[index].substring(0, subIndex)}
            <span className={`${blink ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
        </span>
    );
};

// ─── Login (UserLogin) — Step 2 of 2 ─────────────────────────────────────────
const Login: React.FC = () => {
    const { userLogin, companyName, isLoading, logout, loginStep } = useAuth();
    const navigate = useNavigate();
    const { showMessage, ModalRenderer } = useMessageModal();

    useEffect(() => {
        if (loginStep === 0) navigate('/CompanyLogin', { replace: true });
        else if (loginStep === 2) navigate('/dashboard', { replace: true });
    }, [loginStep, navigate]);

    const [userName, setUserName] = useState('');
    const [userPass, setUserPass] = useState('');
    const [fYear, setFYear] = useState('2025-2026');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [recentUsers, setRecentUsers] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        setRecentUsers(JSON.parse(localStorage.getItem('recent_users') || '[]'));
    }, []);

    const saveRecentUser = (val: string) => {
        if (!val.trim()) return;
        const current = JSON.parse(localStorage.getItem('recent_users') || '[]');
        const updated = [val, ...current.filter((i: string) => i !== val)].slice(0, 8);
        localStorage.setItem('recent_users', JSON.stringify(updated));
        setRecentUsers(updated);
    };

    const handleUserLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            saveRecentUser(userName);
            await userLogin({ userName, password: userPass, fYear });
        } catch (error: any) {
            showMessage('error', 'Login Failed', error.message || 'Invalid credentials. Please check your username and password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        setAnimating(true);
        setTimeout(() => { logout(); setAnimating(false); }, 300);
    };

    // ─── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-indigo-500/50 rounded-full animate-spin-reverse" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <img src="/printude.ai.png" className="w-8 h-8 opacity-90 animate-pulse" alt="Loading..." />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 relative overflow-hidden p-4 font-sans">
            {ModalRenderer}

            {/* Ambient blobs */}
            <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-300/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-orange-300/20 rounded-full blur-[120px] animate-pulse-slow delay-1000 pointer-events-none" />
            <div className="absolute top-[35%] left-[42%] w-[20vw] h-[20vw] bg-emerald-200/15 rounded-full blur-[80px] animate-blob pointer-events-none" />

            {/* Main Card */}
            <div className={`relative w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_70px_-15px_rgba(15,41,77,0.18)] flex flex-col lg:flex-row overflow-hidden border border-slate-100 transition-all duration-300 ${animating ? 'opacity-0 translate-x-8 scale-[0.98]' : 'opacity-100 translate-x-0 scale-100'}`}>

                {/* ── LEFT: FORM ─────────────────────────────────────────────── */}
                <div className="w-full lg:w-[45%] px-8 py-6 sm:px-10 sm:py-7 flex flex-col justify-center relative z-20">

                    {/* Step progress */}
                    <div className="flex items-center gap-2 mb-5">
                        {/* Step 1 done */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                                <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Company</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-300 to-indigo-200 rounded-full mx-1" />
                        {/* Step 2 active */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-[#0F294D] flex items-center justify-center shadow-sm shadow-indigo-500/30">
                                <span className="text-xs font-bold text-white">2</span>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">User Login</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-slate-200 rounded-full mx-1" />
                        {/* Step 3 pending */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full border-2 border-slate-200 flex items-center justify-center">
                                <span className="text-xs font-bold text-slate-300">3</span>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Dashboard</span>
                        </div>
                    </div>

                    {/* Company badge */}
                    <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 mb-3 w-fit">
                        <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                        <span className="text-orange-600 text-xs font-bold tracking-wide uppercase">{companyName}</span>
                    </div>

                    <div className="mb-4">
                        <h2 className="text-[26px] font-extrabold text-[#0F294D] mb-1 tracking-tight">
                            Verify Identity
                        </h2>
                        <p className="text-slate-400 text-sm">Enter your credentials to access the dashboard</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleUserLogin} className="space-y-3">

                        {/* Financial Year */}
                        <div className="space-y-1.5 group">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                Financial Year
                            </label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100 group-focus-within:bg-indigo-50 flex items-center justify-center transition-colors">
                                    <Calendar className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                </div>
                                <select
                                    value={fYear}
                                    onChange={(e) => setFYear(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-14 pr-10 text-[#0F294D] text-[15px] focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-all appearance-none cursor-pointer font-medium"
                                >
                                    <option value="2025-2026">2025-2026</option>
                                    <option value="2024-2025">2024-2025</option>
                                    <option value="2023-2024">2023-2024</option>
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Username */}
                        <div className="space-y-1.5 group">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100 group-focus-within:bg-indigo-50 flex items-center justify-center transition-colors">
                                    <User className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => { setUserName(e.target.value); setShowSuggestions(true); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-14 pr-4 text-[#0F294D] text-[15px] focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-all placeholder-slate-300 font-medium"
                                    placeholder="Enter your username"
                                    required
                                    autoFocus
                                    autoComplete="off"
                                />
                                {showSuggestions && recentUsers.filter(u => u.toLowerCase().includes(userName.toLowerCase())).length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                                        {recentUsers.filter(u => u.toLowerCase().includes(userName.toLowerCase())).map((u, i) => (
                                            <div key={i} className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-[14px] text-slate-700 font-medium flex items-center gap-3 transition-colors"
                                                onClick={() => { setUserName(u); setShowSuggestions(false); }}>
                                                <User className="w-4 h-4 text-indigo-400" />{u}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5 group">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100 group-focus-within:bg-indigo-50 flex items-center justify-center transition-colors">
                                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={userPass}
                                    onChange={(e) => setUserPass(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-14 pr-4 text-[#0F294D] text-[15px] focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-all placeholder-slate-300 font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="pt-1 space-y-2.5">
                            <button type="submit" disabled={isSubmitting}
                                className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-[#0F294D] text-white text-[15px] font-bold py-3 rounded-xl shadow-[0_8px_24px_-6px_rgba(99,102,241,0.45)] hover:shadow-[0_12px_30px_-4px_rgba(99,102,241,0.55)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 flex items-center justify-center group">
                                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                                <span className="relative flex items-center gap-2">
                                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <>Access Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                </span>
                            </button>

                            <button type="button" onClick={handleBack}
                                className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-400 hover:text-slate-600 text-[14px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 group">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Back to Company Login
                            </button>
                        </div>
                    </form>

                    <p className="mt-4 text-center text-xs text-slate-300">&copy; 2026 Printude AI · Secured with JWT &amp; 2FA</p>
                </div>

                {/* ── RIGHT: BRAND PANEL (navy) ────────────────────────────────── */}
                <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-[#0F294D] via-[#1a3a6e] to-[#0e2240] relative overflow-hidden items-center justify-center">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[90px]" />
                    <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-orange-500/8 rounded-full blur-[80px]" />

                    <div className="relative z-10 flex flex-col items-center text-center px-8 py-8 w-full">
                        {/* Logo */}
                        <div className="relative mb-6 animate-float">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] border border-white/8 rounded-full animate-[spin_20s_linear_infinite]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-orange-400/10 rounded-full animate-[spin_28s_linear_infinite_reverse]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-white/5 rounded-full blur-sm" />
                            <img
                                src="/printude.ai.png"
                                alt="Indus Analytics"
                                className="w-[240px] h-auto object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(99,102,241,0.3)]"
                            />
                        </div>

                        <h2 className="text-2xl font-extrabold text-white tracking-tight min-h-[40px] mb-2">
                            <Typewriter words={['Almost There!', 'Step 2 of 2...', 'Verify Identity', 'Secure Access', 'Let\'s Go!']} speed={100} wait={2200} />
                        </h2>
                        <p className="text-white/40 text-sm mb-6">Complete your login to access the full portal</p>

                        {/* Status cards */}
                        <div className="w-full max-w-xs space-y-3">
                            <div className="flex items-center gap-3 bg-emerald-500/15 border border-emerald-400/25 rounded-2xl px-4 py-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                </div>
                                <span className="text-sm text-emerald-200/80 font-medium">Company verified ✓</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-4 py-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-400/20 border border-indigo-400/25 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-indigo-200" />
                                </div>
                                <span className="text-sm text-white/60 font-medium">User authentication…</span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-12 right-12 w-2 h-2 bg-indigo-300/50 rounded-full animate-ping" />
                    <div className="absolute bottom-16 left-12 w-1.5 h-1.5 bg-orange-400/40 rounded-full animate-ping delay-700" />
                </div>
            </div>
        </div>
    );
};

export default Login;
