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
        // Hydrate from localStorage
        const storedCompanyToken = localStorage.getItem('companyToken');
        const storedAuthToken = localStorage.getItem('authToken');
        const storedCompanyName = localStorage.getItem('companyName');
        const storedUserName = localStorage.getItem('userName');
        const storedFYear = localStorage.getItem('fYear');

        if (storedAuthToken) {
            setLoginStep(2);
            setCompanyName(storedCompanyName || '');
            setUserName(storedUserName || '');
            setFYear(storedFYear || '');
        } else if (storedCompanyToken) {
            setLoginStep(1);
            setCompanyName(storedCompanyName || '');
        }
        setIsLoading(false);
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
