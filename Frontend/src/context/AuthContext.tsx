import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    companyLogin as companyLoginApi,
    userLogin as userLoginApi,
    indusLogin as indusLoginApi,
    logout as logoutApi,
    CompanyLoginRequest,
    UserLoginRequest,
    IndusLoginRequest
} from '../services/api';

export type LoginType = 'customer' | 'indus';

interface AuthContextType {
    loginStep: 0 | 1 | 2;
    loginType: LoginType;
    companyName: string;
    userName: string;
    fYear: string;
    isAuthenticated: boolean;
    companyLogin: (data: CompanyLoginRequest) => Promise<void>;
    userLogin: (data: UserLoginRequest) => Promise<void>;
    indusLogin: (data: IndusLoginRequest) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loginStep, setLoginStep] = useState<0 | 1 | 2>(0);
    const [loginType, setLoginType] = useState<LoginType>('customer');
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
        localStorage.removeItem('loginType');
        setLoginStep(0);
        setLoginType('customer');
        setCompanyName('');
        setUserName('');
        setFYear('');
        setIsLoading(false);

        // Listen for 401 Unauthorized events from API interceptor
        const handleUnauthorized = () => {
            setLoginStep(0);
            setLoginType('customer');
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

    const indusLogin = async (data: IndusLoginRequest) => {
        const response = await indusLoginApi(data);
        if (response.token) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userName', response.webUserName);
            localStorage.setItem('loginType', 'indus');
            localStorage.setItem('companyName', 'Indus');

            setUserName(response.webUserName);
            setCompanyName('Indus');
            setLoginType('indus');
            setLoginStep(2);
        } else {
            throw new Error(response.message || 'Indus login failed. Please check your credentials.');
        }
    };

    const logout = () => {
        logoutApi();
        localStorage.clear();
        setLoginStep(0);
        setLoginType('customer');
        setCompanyName('');
        setUserName('');
        setFYear('');
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{
            loginStep,
            loginType,
            companyName,
            userName,
            fYear,
            isAuthenticated: loginStep === 2,
            companyLogin,
            userLogin,
            indusLogin,
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
