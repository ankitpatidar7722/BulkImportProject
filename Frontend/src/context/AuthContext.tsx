import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    companyLogin as companyLoginApi,
    userLogin as userLoginApi,
    logout as logoutApi,
    CompanyLoginRequest,
    UserLoginRequest
} from '../services/api';


interface AuthContextType {
    loginStep: 0 | 1 | 2; // 0: None, 1: Company, 2: User
    companyName: string;
    userName: string;
    fYear: string;
    isAuthenticated: boolean;
    companyLogin: (data: CompanyLoginRequest) => Promise<void>;
    userLogin: (data: UserLoginRequest) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loginStep, setLoginStep] = useState<0 | 1 | 2>(0);
    const [companyName, setCompanyName] = useState('');
    const [userName, setUserName] = useState('');
    const [fYear, setFYear] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Always start fresh from CompanyLogin on every page load / refresh
        localStorage.removeItem('authToken');
        localStorage.removeItem('companyToken');
        localStorage.removeItem('companyName');
        localStorage.removeItem('userName');
        localStorage.removeItem('fYear');
        setLoginStep(0);
        setCompanyName('');
        setUserName('');
        setFYear('');
        setIsLoading(false);

        // Listen for 401 Unauthorized events from API interceptor
        const handleUnauthorized = () => {
            // Clear state and redirect to login
            setLoginStep(0);
            setCompanyName('');
            setUserName('');
            setFYear('');
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, []);

    const companyLogin = async (data: CompanyLoginRequest) => {
        const response = await companyLoginApi(data);
        if (response.companyToken) {
            localStorage.setItem('companyToken', response.companyToken);
            localStorage.setItem('companyName', response.companyName);
            setCompanyName(response.companyName);
            setLoginStep(1);
        } else {
            throw new Error(response.message || 'Company login failed. Please check your credentials.');
        }
    };

    const userLogin = async (data: UserLoginRequest) => {
        const response = await userLoginApi(data);
        if (response.token) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userName', response.userName);
            localStorage.setItem('fYear', response.fYear);

            setUserName(response.userName);
            setFYear(response.fYear);
            setLoginStep(2);
        } else {
            throw new Error(response.message || 'User login failed. Please check your credentials.');
        }
    };

    const logout = () => {
        logoutApi(); // Fire and forget
        localStorage.clear();
        setLoginStep(0);
        setCompanyName('');
        setUserName('');
        setFYear('');
        window.location.href = '/'; // Redirect to login
    };

    return (
        <AuthContext.Provider value={{
            loginStep,
            companyName,
            userName,
            fYear,
            isAuthenticated: loginStep === 2,
            companyLogin,
            userLogin,
            logout,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
