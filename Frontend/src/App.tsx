
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ImportMaster from './pages/ImportMaster';
import CompanyMaster from './pages/CompanyMaster';
import ModuleAuthority from './pages/ModuleAuthority';

function App() {
    return (
        <ThemeProvider>
            <Router>
                <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                    <Sidebar />
                    <div className="flex-1 flex flex-col ml-64">
                        <Header />
                        <main className="flex-1 overflow-y-auto mt-16 custom-scrollbar">
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/import-master" element={<ImportMaster />} />
                                <Route path="/company-master" element={<CompanyMaster />} />
                                <Route path="/module-authority" element={<ModuleAuthority />} />
                            </Routes>
                        </main>
                    </div>
                </div>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: 'var(--toast-bg)',
                            color: 'var(--toast-color)',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
            </Router>
        </ThemeProvider>
    );
}

export default App;
