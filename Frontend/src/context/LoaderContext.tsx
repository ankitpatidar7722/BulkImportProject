import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { setLoaderHooks } from '../services/api';

interface LoaderContextType {
    isLoading: boolean;
    loadingText: string;
    showLoader: (text?: string) => void;
    hideLoader: () => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const useLoader = () => {
    const context = useContext(LoaderContext);
    if (!context) throw new Error('useLoader must be used within LoaderProvider');
    return context;
};

export const LoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Processing...');
    const activeRequests = useRef(0);

    const showLoader = useCallback((text?: string) => {
        activeRequests.current++;
        if (text) setLoadingText(text);
        setIsLoading(true);
    }, []);

    const hideLoader = useCallback(() => {
        activeRequests.current = Math.max(0, activeRequests.current - 1);
        if (activeRequests.current === 0) {
            setIsLoading(false);
            setLoadingText('Processing...');
        }
    }, []);

    // Connect to axios interceptors
    useEffect(() => {
        setLoaderHooks(showLoader, hideLoader);
    }, [showLoader, hideLoader]);

    return (
        <LoaderContext.Provider value={{ isLoading, loadingText, showLoader, hideLoader }}>
            {children}
            {isLoading && <GlobalLoader text={loadingText} />}
        </LoaderContext.Provider>
    );
};

const GlobalLoader: React.FC<{ text: string }> = ({ text }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all">
            <div className="flex flex-col items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl px-10 py-8 shadow-2xl">
                {/* Spinner */}
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-[3px] border-gray-200 dark:border-gray-700" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 dark:border-t-blue-400 animate-spin" />
                    <div className="absolute inset-[6px] rounded-full border-[3px] border-transparent border-b-orange-500 dark:border-b-orange-400 animate-[spin_0.8s_linear_reverse_infinite]" />
                </div>
                {/* Text */}
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 tracking-wide">
                    {text}
                </p>
            </div>
        </div>
    );
};
