import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Login.css';
import { useAuth } from '../context/AuthContext';
import { Building2, ArrowRight, Loader2, Lock, User, Shield, Zap, Database } from 'lucide-react';
import { useMessageModal } from '../components/MessageModal';

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

// ─── Feature Badge (right panel) ─────────────────────────────────────────────
const FeatureBadge = ({ icon: Icon, text, delay }: { icon: any; text: string; delay: string }) => (
    <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: delay }}>
        <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-orange-300" />
        </div>
        <span className="text-sm text-white/80 font-medium">{text}</span>
    </div>
);

// ─── CompanyLogin Page ────────────────────────────────────────────────────────
const CompanyLogin: React.FC = () => {
    const { companyLogin, indusLogin, isLoading, loginStep, loginType } = useAuth();
    const navigate = useNavigate();
    const { showMessage, ModalRenderer } = useMessageModal();

    useEffect(() => {
        if (loginStep === 1) navigate('/UserLogin', { replace: true });
        else if (loginStep === 2) navigate(loginType === 'indus' ? '/company-subscription' : '/dashboard', { replace: true });
    }, [loginStep, loginType, navigate]);

    const [loginMode, setLoginMode] = useState<'customer' | 'indus'>('customer');
    const [companyUser, setCompanyUser] = useState('');
    const [companyPass, setCompanyPass] = useState('');
    const [indusUser, setIndusUser] = useState('');
    const [indusPass, setIndusPass] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentCompanies, setRecentCompanies] = useState<string[]>(() => JSON.parse(localStorage.getItem('recent_companies') || '[]'));
    const [recentIndusUsers, setRecentIndusUsers] = useState<string[]>(() => JSON.parse(localStorage.getItem('recent_indus_users') || '[]'));
    const [showCompSuggestions, setShowCompSuggestions] = useState(false);
    const [showIndusSuggestions, setShowIndusSuggestions] = useState(false);

    const saveRecentInput = (type: 'company' | 'indus', val: string) => {
        if (!val.trim()) return;
        const key = type === 'company' ? 'recent_companies' : 'recent_indus_users';
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = [val, ...current.filter((i: string) => i !== val)].slice(0, 8);
        localStorage.setItem(key, JSON.stringify(updated));
        if (type === 'company') setRecentCompanies(updated);
        else setRecentIndusUsers(updated);
    };

    const handleCompanySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            saveRecentInput('company', companyUser);
            await companyLogin({ companyUserID: companyUser, password: companyPass });
        } catch (error: any) {
            showMessage('error', 'Login Failed', error.message || 'Invalid company credentials. Please try again.');
        } finally { setIsSubmitting(false); }
    };

    const handleIndusSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            saveRecentInput('indus', indusUser);
            await indusLogin({ webUserName: indusUser, password: indusPass });
        } catch (error: any) {
            showMessage('error', 'Login Failed', error.message || 'Invalid Indus credentials. Please try again.');
        } finally { setIsSubmitting(false); }
    };

    const isCustomer = loginMode === 'customer';

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 relative overflow-hidden p-4 font-sans">
            {ModalRenderer}

            {/* Subtle ambient blobs */}
            <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-orange-300/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-indigo-300/25 rounded-full blur-[120px] animate-pulse-slow delay-1000 pointer-events-none" />
            <div className="absolute top-[40%] left-[45%] w-[20vw] h-[20vw] bg-blue-200/20 rounded-full blur-[80px] animate-blob pointer-events-none" />

            {/* Main Card */}
            <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_70px_-15px_rgba(15,41,77,0.18)] flex flex-col lg:flex-row overflow-hidden border border-slate-100">

                {/* ── LEFT: FORM ─────────────────────────────────────────────── */}
                <div className="w-full lg:w-[45%] px-8 py-6 sm:px-10 sm:py-7 flex flex-col justify-center relative z-20">

                    {/* Logo mark */}
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md shadow-orange-500/30">
                            <Database className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[#0F294D] font-bold text-lg tracking-tight">INDAS ESTIMO</span>
                    </div>

                    <div className="mb-4">
                        <h2 className="text-[26px] font-extrabold text-[#0F294D] mb-1 tracking-tight">
                            Welcome back
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {isCustomer ? 'Sign in to access your company portal' : 'Sign in to Indus admin portal'}
                        </p>
                    </div>

                    {/* ── Toggle Pill ── */}
                    <div className="relative flex bg-slate-100 border border-slate-200 rounded-2xl p-1 mb-5">
                        <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out shadow-sm ${isCustomer ? 'left-1 bg-gradient-to-r from-orange-500 to-red-500' : 'left-[calc(50%+3px)] bg-gradient-to-r from-[#0F294D] to-indigo-700'}`} />
                        <button
                            type="button"
                            onClick={() => setLoginMode('customer')}
                            className={`relative z-10 flex-1 text-[13px] font-semibold py-2.5 rounded-xl transition-colors duration-200 ${isCustomer ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Customer Login
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginMode('indus')}
                            className={`relative z-10 flex-1 text-[13px] font-semibold py-2.5 rounded-xl transition-colors duration-200 ${!isCustomer ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Indus Login
                        </button>
                    </div>

                    {/* ── Customer Form ── */}
                    {isCustomer ? (
                        <form onSubmit={handleCompanySubmit} className="space-y-3">
                            <div className="space-y-1.5 group">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-orange-500 transition-colors">
                                    Company ID
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100 group-focus-within:bg-orange-50 flex items-center justify-center transition-colors">
                                        <Building2 className="w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={companyUser}
                                        onChange={(e) => { setCompanyUser(e.target.value); setShowCompSuggestions(true); }}
                                        onFocus={() => setShowCompSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowCompSuggestions(false), 200)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-14 pr-4 text-[#0F294D] text-[15px] focus:outline-none focus:border-orange-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(249,115,22,0.12)] transition-all placeholder-slate-300 font-medium"
                                        placeholder="Ex: COMP001"
                                        required
                                        autoFocus
                                        autoComplete="organization"
                                    />
                                    {showCompSuggestions && recentCompanies.filter(c => c.toLowerCase().includes(companyUser.toLowerCase())).length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                                            {recentCompanies.filter(c => c.toLowerCase().includes(companyUser.toLowerCase())).map((c, i) => (
                                                <div key={i} className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer text-[14px] text-slate-700 font-medium flex items-center gap-3 transition-colors"
                                                    onClick={() => { setCompanyUser(c); setShowCompSuggestions(false); }}>
                                                    <Building2 className="w-4 h-4 text-orange-400" />{c}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5 group">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-orange-500 transition-colors">Password</label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100 group-focus-within:bg-orange-50 flex items-center justify-center transition-colors">
                                        <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={companyPass}
                                        onChange={(e) => setCompanyPass(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-14 pr-4 text-[#0F294D] text-[15px] focus:outline-none focus:border-orange-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(249,115,22,0.12)] transition-all placeholder-slate-300 font-medium"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={isSubmitting}
                                className="w-full mt-2 relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 text-white text-[15px] font-bold py-3 rounded-xl shadow-[0_8px_24px_-6px_rgba(249,115,22,0.45)] hover:shadow-[0_12px_30px_-4px_rgba(249,115,22,0.55)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 flex items-center justify-center group">
                                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                                <span className="relative flex items-center gap-2">
                                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <>Continue Securely <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                </span>
                            </button>
                        </form>
                    ) : (
                        /* ── Indus Form ── */
                        <form onSubmit={handleIndusSubmit} className="space-y-3">
                            <div className="space-y-1.5 group">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-indigo-600 transition-colors">Username</label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100 group-focus-within:bg-indigo-50 flex items-center justify-center transition-colors">
                                        <User className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={indusUser}
                                        onChange={(e) => { setIndusUser(e.target.value); setShowIndusSuggestions(true); }}
                                        onFocus={() => setShowIndusSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowIndusSuggestions(false), 200)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-14 pr-4 text-[#0F294D] text-[15px] focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-all placeholder-slate-300 font-medium"
                                        placeholder="Enter username"
                                        required
                                        autoComplete="off"
                                    />
                                    {showIndusSuggestions && recentIndusUsers.filter(u => u.toLowerCase().includes(indusUser.toLowerCase())).length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                                            {recentIndusUsers.filter(u => u.toLowerCase().includes(indusUser.toLowerCase())).map((u, i) => (
                                                <div key={i} className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-[14px] text-slate-700 font-medium flex items-center gap-3 transition-colors"
                                                    onClick={() => { setIndusUser(u); setShowIndusSuggestions(false); }}>
                                                    <User className="w-4 h-4 text-indigo-500" />{u}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5 group">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-indigo-600 transition-colors">Password</label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100 group-focus-within:bg-indigo-50 flex items-center justify-center transition-colors">
                                        <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={indusPass}
                                        onChange={(e) => setIndusPass(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-14 pr-4 text-[#0F294D] text-[15px] focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-all placeholder-slate-300 font-medium"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={isSubmitting}
                                className="w-full mt-2 relative overflow-hidden bg-gradient-to-r from-[#0F294D] to-indigo-700 text-white text-[15px] font-bold py-3 rounded-xl shadow-[0_8px_24px_-6px_rgba(15,41,77,0.45)] hover:shadow-[0_12px_30px_-4px_rgba(15,41,77,0.55)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 flex items-center justify-center group">
                                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                                <span className="relative flex items-center gap-2">
                                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <>Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                </span>
                            </button>
                        </form>
                    )}

                    <p className="mt-4 text-center text-xs text-slate-300">&copy; 2026 Printude AI · Secured with JWT &amp; 2FA</p>
                </div>

                {/* ── RIGHT: BRAND PANEL (navy) ────────────────────────────────── */}
                <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-[#0F294D] via-[#1a3a6e] to-[#0e2240] relative overflow-hidden items-center justify-center">
                    {/* subtle grid pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
                    {/* glow blobs */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[90px]" />
                    <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-indigo-500/10 rounded-full blur-[80px]" />

                    <div className="relative z-10 flex flex-col items-center text-center px-8 py-8 w-full">
                        {/* Logo with rotating rings */}
                        <div className="relative mb-6 animate-float">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] border border-white/8 rounded-full animate-[spin_20s_linear_infinite]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-orange-400/10 rounded-full animate-[spin_28s_linear_infinite_reverse]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-white/5 rounded-full blur-sm" />
                            <img
                                src="/printude.ai.png"
                                alt="Indus Analytics"
                                className="w-[240px] h-auto object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(249,115,22,0.25)]"
                            />
                        </div>

                        <h2 className="text-2xl font-extrabold text-white tracking-tight min-h-[40px] mb-2">
                            <Typewriter words={['Welcome Back!', 'Secure Login...', 'Indas Estimo Master', 'AI-Powered ERP', 'Efficiency Redefined.']} speed={100} wait={2200} />
                        </h2>
                        <p className="text-white/40 text-sm mb-6">Your gateway to seamless data management</p>

                        {/* Feature badges */}
                        <div className="w-full max-w-xs space-y-3">
                            <FeatureBadge icon={Zap} text="Import 10,000+ rows from Excel in seconds" delay="0ms" />
                            <FeatureBadge icon={Shield} text="Smart duplicate detection & auto-validation" delay="80ms" />
                            <FeatureBadge icon={Database} text="Multi-company, multi-year data control" delay="160ms" />
                        </div>
                    </div>

                    {/* corner dots */}
                    <div className="absolute top-12 right-12 w-2 h-2 bg-orange-400/50 rounded-full animate-ping" />
                    <div className="absolute bottom-16 left-12 w-1.5 h-1.5 bg-blue-300/40 rounded-full animate-ping delay-700" />
                </div>
            </div>
        </div>
    );
};

export default CompanyLogin;
