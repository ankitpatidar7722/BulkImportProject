import React, { useState, useEffect } from 'react';
import './Login.css';
import { useAuth } from '../context/AuthContext';
import { User, Building2, Calendar, ArrowRight, Loader2, ArrowLeft, Lock, ChevronRight } from 'lucide-react';

// Custom Typewriter Component (Dependency-free)
const Typewriter = ({ words, speed = 150, wait = 3000 }: { words: string[], speed?: number, wait?: number }) => {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);
    const [blink, setBlink] = useState(true);

    // Blinking cursor
    useEffect(() => {
        const timeout2 = setTimeout(() => {
            setBlink(!blink);
        }, 500);
        return () => clearTimeout(timeout2);
    }, [blink]);

    // Typing logic
    useEffect(() => {
        if (index === words.length) return;

        if (subIndex === words[index].length + 1 && !reverse) {
            setReverse(true);
            return;
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prev) => (prev + 1) % words.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, reverse ? 75 : subIndex === words[index].length ? wait : speed);

        return () => clearTimeout(timeout);
    }, [subIndex, index, reverse, words, speed, wait]);

    return (
        <span>
            {words[index].substring(0, subIndex)}
            <span className={`${blink ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
        </span>
    );
};

const Login: React.FC = () => {
    const { loginStep, companyLogin, userLogin, companyName, isLoading, logout } = useAuth();

    // Form States
    const [companyUser, setCompanyUser] = useState('');
    const [companyPass, setCompanyPass] = useState('');
    const [userName, setUserName] = useState('');
    const [userPass, setUserPass] = useState('');
    const [fYear, setFYear] = useState('2025-2026');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Animation State
    const [animating, setAnimating] = useState(false);

    const handleCompanyLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await companyLogin({ companyUserID: companyUser, password: companyPass });
        } catch (error) {
            // Toast handled in context
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUserLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await userLogin({ userName: userName, password: userPass, fYear: fYear });
        } catch (error) {
            // Toast handled in context
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

    // LIGHT THEME LOADING SCREEN
    if (isLoading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            {/* Loading Animation */}
            <div className="relative">
                <div className="w-20 h-20 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-indigo-500/50 rounded-full animate-spin-reverse"></div>
                {/* Center Robot Icon */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <img src="/printude.ai.png" className="w-8 h-8 opacity-90 animate-pulse" alt="Loading..." />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4 font-sans text-gray-900 selection:bg-orange-500/20 selection:text-orange-700">

            {/* Background Ambient Glows (Light Mode) */}
            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-orange-200/30 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
            <div className="absolute top-[30%] left-[40%] w-[30vw] h-[30vw] bg-blue-200/20 rounded-full blur-[100px] animate-blob" />

            {/* Main Card Container (Glassmorphism Light) */}
            <div className="relative w-full max-w-7xl min-h-[800px] bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col lg:flex-row overflow-hidden group hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.1)] transition-shadow duration-700">

                {/* LEFT PANEL: FORM */}
                <div className="w-full lg:w-[45%] p-8 sm:p-12 flex flex-col justify-center relative z-20 bg-white/40 border-r border-white/50">

                    <div className="mt-10 mb-8">
                        <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
                            {loginStep === 1 ? <span className="text-indigo-600">Welcome Back</span> : <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Sign In</span>}
                        </h2>
                        <p className="text-gray-500 text-base font-medium">
                            {loginStep === 1
                                ? `Please verify your identity for ${companyName}`
                                : 'Enter your company credentials to access the portal'}
                        </p>
                    </div>

                    <div className={`transition-all duration-500 ${animating ? 'opacity-0 translate-x-10' : 'opacity-100 translate-x-0'}`}>
                        {loginStep === 0 && (
                            <form onSubmit={handleCompanyLogin} className="space-y-7">
                                <div className="space-y-2 group">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-orange-600 transition-colors ml-1">Company ID</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-100 transition-colors">
                                            <Building2 className="w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={companyUser}
                                            onChange={(e) => setCompanyUser(e.target.value)}
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-16 text-gray-900 text-lg focus:outline-none focus:border-orange-500/50 focus:bg-white transition-all placeholder-gray-400 font-medium tracking-wide shadow-sm focus:shadow-md"
                                            placeholder="Ex: COMP001"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-orange-600 transition-colors ml-1">Password</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-100 transition-colors">
                                            <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            value={companyPass}
                                            onChange={(e) => setCompanyPass(e.target.value)}
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-16 text-gray-900 text-lg focus:outline-none focus:border-orange-500/50 focus:bg-white transition-all placeholder-gray-400 font-medium tracking-wide shadow-sm focus:shadow-md"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-10 bg-gradient-to-r from-orange-600 to-red-600 text-white text-lg font-bold py-5 rounded-2xl shadow-[0_10px_30px_-10px_rgba(234,88,12,0.3)] hover:shadow-[0_20px_40px_-5px_rgba(234,88,12,0.4)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center tracking-wide">
                                        {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : (
                                            <>
                                                Continue Securely
                                                <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </form>
                        )}

                        {loginStep === 1 && (
                            <form onSubmit={handleUserLogin} className="space-y-6 animate-slide-in">
                                <div className="space-y-2 group">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors ml-1">Financial Year</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-focus-within:bg-indigo-100 transition-colors">
                                            <Calendar className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                        </div>
                                        <select
                                            value={fYear}
                                            onChange={(e) => setFYear(e.target.value)}
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-16 text-gray-900 text-lg focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all appearance-none cursor-pointer font-medium shadow-sm focus:shadow-md"
                                        >
                                            <option value="2025-2026">2025-2026</option>
                                            <option value="2024-2025">2024-2025</option>
                                            <option value="2023-2024">2023-2024</option>
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors ml-1">Username</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-focus-within:bg-indigo-100 transition-colors">
                                            <User className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-16 text-gray-900 text-lg focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all placeholder-gray-400 font-medium tracking-wide shadow-sm focus:shadow-md"
                                            placeholder="Enter your username"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors ml-1">Password</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-focus-within:bg-indigo-100 transition-colors">
                                            <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            value={userPass}
                                            onChange={(e) => setUserPass(e.target.value)}
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-16 text-gray-900 text-lg focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all placeholder-gray-400 font-medium tracking-wide shadow-sm focus:shadow-md"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 space-y-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold py-5 rounded-2xl shadow-[0_10px_30px_-10px_rgba(79,70,229,0.3)] hover:shadow-[0_20px_40px_-5px_rgba(79,70,229,0.4)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
                                    >
                                        <span className="relative z-10 flex items-center tracking-wide">
                                            {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : (
                                                <>
                                                    Access Dashboard
                                                    <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="w-full py-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 font-semibold transition-all duration-300 flex items-center justify-center group"
                                    >
                                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform text-indigo-500" />
                                        Back to Company Login
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: VISUALS WITH LIGHTER BACKGROUND FOR LOGO VISIBILITY */}
                <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-indigo-50 to-slate-100 relative overflow-hidden items-center justify-center">

                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                    {/* Content Container */}
                    <div className="relative z-10 flex flex-col items-center justify-center text-center p-8 w-full max-w-3xl">

                        {/* Floating Robot */}
                        <div className="relative mb-12 animate-float group perspective-1000">
                            {/* Glow behind robot */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white rounded-full blur-[80px] opacity-90"></div>

                            {/* Ring Animation */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] border border-indigo-200 rounded-full animate-[spin_12s_linear_infinite]"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-orange-200 rounded-full animate-[spin_18s_linear_infinite_reverse]"></div>

                            <img
                                src="/printude.ai.png"
                                alt="AI Assistant"
                                className="w-[600px] h-auto object-contain relative z-10 drop-shadow-[0_30px_60px_rgba(0,0,0,0.2)] transform group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                        </div>

                        {/* Animated Text - Darker for Light Mode */}
                        <div className="min-h-[100px] w-full">
                            <h2 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-800 to-gray-600 tracking-tight leading-tight min-h-[60px]">
                                <Typewriter
                                    words={[
                                        'Welcome Back!',
                                        'Secure Login...',
                                        'Bulk Import Master...',
                                        'AI-Powered Solutions.',
                                        'Efficiency Redefined.'
                                    ]}
                                    speed={100}
                                    wait={2000}
                                />
                            </h2>
                            <p className="mt-4 text-gray-500 text-lg font-medium tracking-wide animate-pulse-slow">
                                Your gateway to seamless data management
                            </p>
                        </div>
                    </div>

                    {/* Floating Tech Particles */}
                    <div className="absolute top-20 right-20 w-3 h-3 bg-orange-400 rounded-full blur-[2px] animate-blob delay-100"></div>
                    <div className="absolute bottom-32 left-20 w-2 h-2 bg-indigo-400 rounded-full blur-[1px] animate-blob delay-300"></div>
                </div>
            </div>

            {/* Footer Credits */}
            <div className="absolute bottom-4 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
                &copy; 2026 Printude AI. Secured with JWT & 2FA.
            </div>
        </div>
    );
};

export default Login;
