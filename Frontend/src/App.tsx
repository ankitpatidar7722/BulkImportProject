import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CompanyLogin from './pages/CompanyLogin';
import Login from './components/Login';

import Dashboard from './pages/Dashboard';
import ImportMaster from './pages/ImportMaster';
import StockUpload from './pages/StockUpload';
import CompanyMaster from './pages/CompanyMaster';
import ModuleAuthority from './pages/ModuleAuthority';
import CreateModule from './pages/CreateModule';
import DynamicModule from './pages/DynamicModule';
import CompanySubscription from './pages/CompanySubscription';

// Authenticated Layout Component
const AuthenticatedLayout = () => {
    const { loginType } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const defaultPath = loginType === 'indus' ? '/company-subscription' : '/';

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0`}>
                <Header onMenuClick={() => setIsSidebarOpen(true)} isSidebarCollapsed={isSidebarCollapsed} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden mt-16 custom-scrollbar p-4 md:p-6">
                    <Routes>
                        <Route path="/" element={loginType === 'indus' ? <Navigate to="/company-subscription" replace /> : <Dashboard />} />
                        <Route path="/import-master" element={<ImportMaster />} />
                        <Route path="/stock-upload" element={<StockUpload />} />
                        <Route path="/company-master" element={<CompanyMaster />} />
                        <Route path="/module-authority" element={<ModuleAuthority />} />
                        <Route path="/create-module" element={<CreateModule />} />
                        <Route path="/dynamic-module" element={<DynamicModule />} />
                        <Route path="/company-subscription" element={<CompanySubscription />} />
                        <Route path="*" element={<Navigate to={defaultPath} replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

// Gatekeeper Component
const AuthGate = () => {
    const { loginStep, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    // Step 0: Company Login
    if (loginStep === 0) {
        return <CompanyLogin />;
    }

    // Step 1: User Login
    if (loginStep === 1) {
        return <Login />;
    }

    // Step 2: Fully authenticated → show app
    return <AuthenticatedLayout />;
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <AuthGate />
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
