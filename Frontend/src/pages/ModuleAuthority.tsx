import React from 'react';
import { ShieldCheck, Users, Lock } from 'lucide-react';

const ModuleAuthority: React.FC = () => {
    const modules = [
        { name: 'Dashboard', users: 45, access: 'Full Access' },
        { name: 'Import Master', users: 32, access: 'Read & Write' },
        { name: 'Company Master', users: 12, access: 'Admin Only' },
        { name: 'Module Authority', users: 5, access: 'Admin Only' },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Module Authority</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user permissions and module access</p>
            </div>

            <div className="card">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-lg">
                        <ShieldCheck className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Control</h2>
                        <p className="text-gray-600 dark:text-gray-400">Configure module permissions</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Module Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Authorized Users
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Access Level
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {modules.map((module, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{module.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{module.users} users</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                            {module.access}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ModuleAuthority;
