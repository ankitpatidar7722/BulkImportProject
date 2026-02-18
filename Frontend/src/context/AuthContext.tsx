import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    companyLogin as companyLoginApi,
    userLogin as userLoginApi,
    logout as logoutApi,
    CompanyLoginRequest,
    UserLoginRequest
} from '../services/api';
import toast from 'react-hot-toast';

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
        try {
            const response = await companyLoginApi(data);
            if (response.companyToken) {
                localStorage.setItem('companyToken', response.companyToken);
                localStorage.setItem('companyName', response.companyName);
                setCompanyName(response.companyName);
                setLoginStep(1);
                toast.success('Company Verified');
            } else {
                toast.error(response.message || 'Login Failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Login Failed');
            throw error;
        }
    };

    const userLogin = async (data: UserLoginRequest) => {
        try {
            const response = await userLoginApi(data);
            if (response.token) {
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userName', response.userName);
                localStorage.setItem('fYear', response.fYear); // response.fYear usually matches input but logic in backend ensures it's stored

                setUserName(response.userName);
                setFYear(response.fYear); // Use input or response
                setLoginStep(2);
                toast.success('Login Successful');
            } else {
                toast.error(response.message || 'Login Failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Login Failed');
            throw error;
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
