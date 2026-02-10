import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Upload,
    Building2,
    ShieldCheck,
    X,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';


interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
    const location = useLocation();

    const menuItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Import Master', path: '/import-master', icon: Upload },
        { name: 'Company Master', path: '/company-master', icon: Building2 },
        { name: 'Module Authority', path: '/module-authority', icon: ShieldCheck },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside className={`
                ${isCollapsed ? 'w-20' : 'w-64'} bg-[#0B1120] text-white border-r border-gray-800 h-screen fixed left-0 top-0 
                overflow-y-auto custom-scrollbar flex flex-col z-50 transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Header */}
                <div className={`p-6 border-b border-gray-800 flex justify-between items-center`}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center font-bold text-lg text-white">
                            E
                        </div>
                        {!isCollapsed && <span className="text-xl font-bold text-white tracking-tight">ExcelJet</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle Button - Desktop Only */}
                        <button
                            onClick={onToggleCollapse}
                            className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200"
                            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        >
                            {isCollapsed ? (
                                <ChevronsRight className="w-5 h-5" />
                            ) : (
                                <ChevronsLeft className="w-5 h-5" />
                            )}
                        </button>

                        {/* Close button for mobile */}
                        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 flex-1">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={() => window.innerWidth < 768 && onClose()}
                                        className={`flex items-center ${isCollapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-md transition-all duration-200 group relative ${isActive
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                            }`}
                                        title={isCollapsed ? item.name : ''}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                        {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}

                                        {/* Tooltip for collapsed state */}
                                        {isCollapsed && (
                                            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                                {item.name}
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                                            </div>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
