import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Upload,
    Building2,
    ShieldCheck,
    X
} from 'lucide-react';


interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
                w-64 bg-[#0B1120] text-white border-r border-gray-800 h-screen fixed left-0 top-0 
                overflow-y-auto custom-scrollbar flex flex-col z-50 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center font-bold text-lg text-white">
                            E
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">ExcelJet</span>
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

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
                                        className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group ${isActive
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                        <span className="font-medium text-sm">{item.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold">
                            9
                        </div>
                        <span className="text-sm font-medium text-gray-300">Sunset</span>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
