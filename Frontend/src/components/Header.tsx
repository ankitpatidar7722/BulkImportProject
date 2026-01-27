import React from 'react';
import { Moon, Sun, User, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <header className="h-16 bg-[#0B1120] border-b border-gray-800 fixed top-0 right-0 left-0 md:left-64 z-10 transition-all duration-200">
            <div className="h-full px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 md:hidden"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        {/* Page title or breadcrumb can go here */}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                        aria-label="Toggle theme"
                    >
                        {isDark ? (
                            <Sun className="w-5 h-5 text-yellow-500" />
                        ) : (
                            <Moon className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {/* Profile Icon */}
                    <div className="relative group">
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        </button>

                        {/* Dropdown menu (hidden by default) */}
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Admin User</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">admin@example.com</p>
                            </div>
                            <div className="p-2">
                                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                                    Profile
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                                    Settings
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
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
