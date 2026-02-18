import React from 'react';
import { Moon, Sun, User, Menu, Building2, LogOut, Settings, UserCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
    onMenuClick: () => void;
    isSidebarCollapsed?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isSidebarCollapsed = false }) => {
    const { isDark, toggleTheme } = useTheme();
    const { companyName, userName, logout } = useAuth();

    return (
        <header className={`h-16 bg-[#0B1120] border-b border-gray-800 fixed top-0 right-0 z-10 transition-all duration-300 ${isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-64'}`}>
            <div className="h-full px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 md:hidden"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Company Name Display */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-base font-semibold text-white tracking-wide">{companyName}</h1>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                        aria-label="Toggle theme"
                    >
                        {isDark ? (
                            <Sun className="w-5 h-5 text-yellow-500" />
                        ) : (
                            <Moon className="w-5 h-5" />
                        )}
                    </button>

                    {/* Profile Icon */}
                    <div className="relative group">
                        <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-700">
                            <div className="hidden text-right md:block">
                                <p className="text-sm font-medium text-white">{userName}</p>
                                <p className="text-xs text-gray-400">User</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white border border-gray-600">
                                <User className="w-4 h-4" />
                            </div>
                        </button>

                        {/* Dropdown menu */}
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{companyName}</p>
                            </div>
                            <div className="p-2">
                                <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    <UserCircle className="w-4 h-4" />
                                    Profile
                                </button>
                                <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </button>
                                <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
