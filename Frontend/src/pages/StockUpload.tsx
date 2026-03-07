import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getItemGroups, getToolGroups, ItemGroupDto, ToolGroupDto } from '../services/api';
import ItemStockUpload from '../components/ItemStockUpload';

const StockUpload: React.FC = () => {
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [selectedSubModule, setSelectedSubModule] = useState<string>('');
    const [itemGroups, setItemGroups] = useState<ItemGroupDto[]>([]);
    const [toolGroups, setToolGroups] = useState<ToolGroupDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleModuleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const moduleValue = e.target.value;
        setSelectedModule(moduleValue);
        setSelectedSubModule('');
        setItemGroups([]);
        setToolGroups([]);

        if (moduleValue === 'ItemMasters') {
            setIsLoading(true);
            try {
                const groups = await getItemGroups();
                setItemGroups(groups);
            } catch (error) {
                console.error('Failed to fetch item groups', error);
            } finally {
                setIsLoading(false);
            }
        } else if (moduleValue === 'ToolMaster') {
            setIsLoading(true);
            try {
                const groups = await getToolGroups();
                setToolGroups(groups);
            } catch (error) {
                console.error('Failed to fetch tool groups', error);
            } finally {
                setIsLoading(false);
            }
        } else if (moduleValue === 'SparePartMaster') {
            setSelectedSubModule('SparePartMaster');
        }
    };

    const handleRefresh = () => {
        setSelectedModule('');
        setSelectedSubModule('');
        setItemGroups([]);
        setToolGroups([]);
    };

    // Get selected item group name for display
    const getSelectedItemGroupName = (): string => {
        if (selectedModule !== 'ItemMasters' || !selectedSubModule) return '';
        const group = itemGroups.find(g => g.itemGroupID === Number(selectedSubModule));
        return group?.itemGroupName || '';
    };

    const renderSubModuleDropdown = () => {
        if (!selectedModule) {
            return (
                <div className="invisible">
                    {/* Hidden placeholder to maintain grid layout */}
                </div>
            );
        }

        if (selectedModule === 'ItemMasters') {
            return (
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Sub Module Name
                    </label>
                    <select
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white"
                        value={selectedSubModule}
                        onChange={(e) => setSelectedSubModule(e.target.value)}
                        disabled={isLoading || itemGroups.length === 0}
                    >
                        <option value="">Select Item Group</option>
                        {itemGroups.map((group) => (
                            <option key={group.itemGroupID} value={group.itemGroupID}>
                                {group.itemGroupName}
                            </option>
                        ))}
                    </select>
                </div>
            );
        }

        if (selectedModule === 'ToolMaster') {
            return (
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Sub Module Name
                    </label>
                    <select
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white"
                        value={selectedSubModule}
                        onChange={(e) => setSelectedSubModule(e.target.value)}
                        disabled={isLoading || toolGroups.length === 0}
                    >
                        <option value="">Select Tool Group</option>
                        {toolGroups.map((group) => (
                            <option key={group.toolGroupID} value={group.toolGroupID}>
                                {group.toolGroupName}
                            </option>
                        ))}
                    </select>
                </div>
            );
        }

        if (selectedModule === 'SparePartMaster') {
            return (
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Sub Module Name
                    </label>
                    <select
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white"
                        value={selectedSubModule}
                        disabled
                    >
                        <option value="SparePartMaster">Spare Part Master</option>
                    </select>
                </div>
            );
        }

        return (
            <div className="invisible">
                {/* Hidden placeholder to maintain grid layout */}
            </div>
        );
    };

    return (
        <div className="p-3 md:p-4 bg-gray-50 dark:bg-[#020617] min-h-screen transition-colors duration-200">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Stock Upload</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Upload stock data into the system.</p>
            </div>

            {/* Main Control Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Module Name Dropdown */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Module Name
                        </label>
                        <select
                            className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white"
                            value={selectedModule}
                            onChange={handleModuleChange}
                        >
                            <option value="">Select Module</option>
                            <option value="ItemMasters">Item Masters</option>
                            <option value="ToolMaster">Tool Master</option>
                            <option value="SparePartMaster">Spare Part Master</option>
                        </select>
                    </div>

                    {/* Sub Module Name Dropdown */}
                    {renderSubModuleDropdown()}

                    {/* Refresh Button */}
                    <div className="flex items-end">
                        <button
                            onClick={handleRefresh}
                            className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent rounded-lg transition-all shadow-sm hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30 flex items-center justify-center gap-2 h-[38px] mt-6 md:mt-0 active:scale-95 transform font-medium"
                            title="Reset Module"
                        >
                            <RefreshCw className="w-4 h-4 animate-in spin-in-180 duration-300" />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Item Stock Upload Component */}
            {selectedModule === 'ItemMasters' && selectedSubModule && (
                <ItemStockUpload
                    itemGroupId={Number(selectedSubModule)}
                    itemGroupName={getSelectedItemGroupName()}
                />
            )}
        </div>
    );
};

export default StockUpload;
