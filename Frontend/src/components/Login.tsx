import React, { useState, useEffect } from 'react';
import './Login.css';
import { useAuth } from '../context/AuthContext';
import { User, Calendar, ArrowRight, Loader2, ArrowLeft, Lock, ChevronRight } from 'lucide-react';
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

        if (subIndex === words[index].length + 1 && !reverse) {
            setReverse(true);
            return;
        }
        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((p) => (p + 1) % words.length);
            return;
        }

        const t = setTimeout(
            () => setSubIndex((p) => p + (reverse ? -1 : 1)),
            reverse ? 75 : subIndex === words[index].length ? wait : speed
        );
        return () => clearTimeout(t);
    }, [subIndex, index, reverse, words, speed, wait]);

    return (
        <span>
            {words[index].substring(0, subIndex)}
            <span className={`${blink ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
        </span>
    );
};

// ─── User Login Component (Step 1 → Step 2) ──────────────────────────────────
const Login: React.FC = () => {
    const { userLogin, companyName, isLoading, logout } = useAuth();
    const { showMessage, ModalRenderer } = useMessageModal();

    const [userName, setUserName] = useState('');
    const [userPass, setUserPass] = useState('');
    const [fYear, setFYear] = useState('2025-2026');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [animating, setAnimating] = useState(false);

    const handleUserLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await userLogin({ userName, password: userPass, fYear });
        } catch (error: any) {
            showMessage('error', 'Login Failed', error.message || 'Invalid credentials. Please check your username and password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        setAnimating(true);
        setTimeout(() => {
            logout();
            setAnimating(false);
        }, 300);
    };

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
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

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4 font-sans text-gray-900 selection:bg-orange-500/20 selection:text-orange-700">
            {ModalRenderer}

            {/* Background Ambient Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-orange-200/30 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
            <div className="absolute top-[30%] left-[40%] w-[30vw] h-[30vw] bg-blue-200/20 rounded-full blur-[100px] animate-blob" />

            {/* Main Card */}
            <div className="relative w-full max-w-5xl bg-white/70 backdrop-blur-2xl border border-white/50 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col lg:flex-row overflow-hidden group hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.1)] transition-shadow duration-700">

                {/* ── LEFT PANEL: FORM ──────────────────────────────────────── */}
                <div className="w-full lg:w-[45%] p-6 sm:p-8 flex flex-col justify-center relative z-20 bg-white/40 border-r border-white/50">
                    <div className="mb-5">
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-1.5 tracking-tight">
                            <span className="text-indigo-600">Welcome Back</span>
                        </h2>
                        <p className="text-gray-500 text-sm font-medium">
                            Please verify your identity for <span className="font-semibold text-gray-700">{companyName}</span>
                        </p>
                    </div>

                    <div className={`transition-all duration-500 ${animating ? 'opacity-0 translate-x-10' : 'opacity-100 translate-x-0'}`}>
                        <form onSubmit={handleUserLogin} className="space-y-5 animate-slide-in">
                            {/* Financial Year */}
                            <div className="space-y-1.5 group">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors ml-1">
                                    Financial Year
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-focus-within:bg-indigo-100 transition-colors">
                                        <Calendar className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                    </div>
                                    <select
                                        value={fYear}
                                        onChange={(e) => setFYear(e.target.value)}
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 pl-14 text-gray-900 text-[15px] focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all appearance-none cursor-pointer font-medium shadow-sm focus:shadow-md"
                                    >
                                        <option value="2025-2026">2025-2026</option>
                                        <option value="2024-2025">2024-2025</option>
                                        <option value="2023-2024">2023-2024</option>
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                                </div>
                            </div>

                            {/* Username */}
                            <div className="space-y-1.5 group">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors ml-1">
                                    Username
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-focus-within:bg-indigo-100 transition-colors">
                                        <User className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 pl-14 text-gray-900 text-[15px] focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all placeholder-gray-400 font-medium tracking-wide shadow-sm focus:shadow-md"
                                        placeholder="Enter your username"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5 group">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors ml-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-focus-within:bg-indigo-100 transition-colors">
                                        <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={userPass}
                                        onChange={(e) => setUserPass(e.target.value)}
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 pl-14 text-gray-900 text-[15px] focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all placeholder-gray-400 font-medium tracking-wide shadow-sm focus:shadow-md"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="pt-6 space-y-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[15px] font-bold py-3.5 rounded-xl shadow-[0_10px_30px_-10px_rgba(79,70,229,0.3)] hover:shadow-[0_20px_40px_-5px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center tracking-wide">
                                        {isSubmitting ? (
                                            <Loader2 className="animate-spin w-5 h-5" />
                                        ) : (
                                            <>
                                                Access Dashboard
                                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="w-full py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 text-[15px] font-semibold transition-all duration-300 flex items-center justify-center group"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform text-indigo-500" />
                                    Back to Company Login
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* ── RIGHT PANEL: VISUALS ──────────────────────────────────── */}
                <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-indigo-50 to-slate-100 relative overflow-hidden items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />

                    <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 w-full max-w-xl">
                        <div className="relative mb-8 animate-float group perspective-1000">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-white rounded-full blur-[60px] opacity-90" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] border border-indigo-200 rounded-full animate-[spin_12s_linear_infinite]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-orange-200 rounded-full animate-[spin_18s_linear_infinite_reverse]" />
                            <img
                                src="/printude.ai.png"
                                alt="AI Assistant"
                                className="w-[380px] h-auto object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] transform group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                        </div>

                        <div className="min-h-[80px] w-full">
                            <h2 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-800 to-gray-600 tracking-tight leading-tight min-h-[44px]">
                                <Typewriter
                                    words={['Welcome Back!', 'Secure Login...', 'Bulk Import Master...', 'AI-Powered Solutions.', 'Efficiency Redefined.']}
                                    speed={100}
                                    wait={2000}
                                />
                            </h2>
                            <p className="mt-3 text-gray-500 text-sm font-medium tracking-wide animate-pulse-slow">
                                Your gateway to seamless data management
                            </p>
                        </div>
                    </div>

                    <div className="absolute top-16 right-16 w-2.5 h-2.5 bg-orange-400 rounded-full blur-[2px] animate-blob delay-100" />
                    <div className="absolute bottom-24 left-16 w-2 h-2 bg-indigo-400 rounded-full blur-[1px] animate-blob delay-300" />
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
                &copy; 2026 Printude AI. Secured with JWT &amp; 2FA.
            </div>
        </div>
    );
};

export default Login;
