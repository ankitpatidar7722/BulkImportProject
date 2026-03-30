import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoaderProvider } from './context/LoaderContext';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';
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
import ModuleGroupAuthority from './pages/ModuleGroupAuthority';

// Login Flow Component (handles two-step login)
const LoginFlow = () => {
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

    // Step 2: Already authenticated, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
};

// Authenticated Layout Component
const AuthenticatedLayout = () => {
    const { loginType } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const defaultPath = loginType === 'indus' ? '/company-subscription' : '/dashboard';

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
                <Header onMenuClick={() => setIsSidebarOpen(true)} isSidebarCollapsed={isSidebarCollapsed} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-0">
                    <div className="p-4 md:p-6 lg:p-8">
                    <Routes>
                        <Route path="/dashboard" element={loginType === 'indus' ? <Navigate to="/company-subscription" replace /> : <Dashboard />} />
                        <Route path="/import-master" element={<ImportMaster />} />
                        <Route path="/stock-upload" element={<StockUpload />} />
                        <Route path="/company-master" element={<CompanyMaster />} />
                        <Route path="/module-authority" element={<ModuleAuthority />} />
                        <Route path="/create-module" element={<CreateModule />} />
                        <Route path="/dynamic-module" element={<DynamicModule />} />
                        <Route path="/company-subscription" element={<CompanySubscription />} />
                        <Route path="/module-group-authority" element={<ModuleGroupAuthority />} />
                        <Route path="*" element={<Navigate to={defaultPath} replace />} />
                    </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
};

function App() {
    return (
        <ThemeProvider>
            <LoaderProvider>
                <AuthProvider>
                    <Router>
                        <Routes>
                            {/* Public Route: Login */}
                            <Route path="/login" element={<LoginFlow />} />

                            {/* Root Route: Redirect to login */}
                            <Route path="/" element={<Navigate to="/login" replace />} />

                            {/* Protected Routes: Require Authentication */}
                            <Route path="/*" element={
                                <PrivateRoute>
                                    <AuthenticatedLayout />
                                </PrivateRoute>
                            } />
                        </Routes>
                    </Router>
                </AuthProvider>
            </LoaderProvider>
        </ThemeProvider>
    );
}

export default App;
