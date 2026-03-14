import React, { useState, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { getItemGroups, getToolGroups, ItemGroupDto, ToolGroupDto } from '../services/api';
import ItemStockUpload from '../components/ItemStockUpload';
import SparePartMasterStockUpload from '../components/SparePartMasterStockUpload';

const StockUpload: React.FC = () => {
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [selectedSubModule, setSelectedSubModule] = useState<string>('');
    const [itemGroups, setItemGroups] = useState<ItemGroupDto[]>([]);
    const [toolGroups, setToolGroups] = useState<ToolGroupDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Track whether the child component has data loaded
    const [childHasData, setChildHasData] = useState(false);

    // Switch confirmation state
    const [switchConfirm, setSwitchConfirm] = useState<{
        type: 'module' | 'submodule' | 'refresh';
        newValue: string;
        message: string;
    } | null>(null);

    const onChildHasDataChange = useCallback((hasData: boolean) => {
        setChildHasData(hasData);
    }, []);

    const handleModuleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const moduleValue = e.target.value;

        // If child has data, show confirmation before switching module
        if (childHasData) {
            setSwitchConfirm({
                type: 'module',
                newValue: moduleValue,
                message: `You have data loaded in the current window. Switching the module will close this window and clear all data. Do you want to continue?`
            });
            return;
        }

        await applyModuleChange(moduleValue);
    };

    const applyModuleChange = async (moduleValue: string) => {
        setSelectedModule(moduleValue);
        setSelectedSubModule('');
        setItemGroups([]);
        setToolGroups([]);
        setChildHasData(false);

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

    const handleSubModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;

        // If child has data, show confirmation before switching sub module
        if (childHasData) {
            setSwitchConfirm({
                type: 'submodule',
                newValue,
                message: `You have data loaded in the current window. Switching the Sub Module will close this window and clear all data. Do you want to continue?`
            });
            return;
        }

        setSelectedSubModule(newValue);
    };

    const handleRefresh = () => {
        // If child has data, show confirmation before refreshing
        if (childHasData) {
            setSwitchConfirm({
                type: 'refresh',
                newValue: '',
                message: `You have data loaded in the current window. Refreshing will close this window and clear all data. Do you want to continue?`
            });
            return;
        }

        applyRefresh();
    };

    const applyRefresh = () => {
        setSelectedModule('');
        setSelectedSubModule('');
        setItemGroups([]);
        setToolGroups([]);
        setChildHasData(false);
    };

    const handleSwitchConfirm = async () => {
        if (!switchConfirm) return;
        const { type, newValue } = switchConfirm;
        setSwitchConfirm(null);
        setChildHasData(false);

        if (type === 'module') {
            await applyModuleChange(newValue);
        } else if (type === 'submodule') {
            setSelectedSubModule(newValue);
        } else if (type === 'refresh') {
            applyRefresh();
        }
    };

    const handleSwitchCancel = () => {
        setSwitchConfirm(null);
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
                        onChange={handleSubModuleChange}
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
                        onChange={handleSubModuleChange}
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
                    key={selectedSubModule}
                    itemGroupId={Number(selectedSubModule)}
                    itemGroupName={getSelectedItemGroupName()}
                    onHasDataChange={onChildHasDataChange}
                />
            )}

            {/* Spare Part Master Stock Upload Component */}
            {selectedModule === 'SparePartMaster' && selectedSubModule === 'SparePartMaster' && (
                <SparePartMasterStockUpload
                    key="SparePartMaster"
                    onHasDataChange={onChildHasDataChange}
                />
            )}

            {/* ─── Switch Confirmation Modal ────────────────────────────────── */}
            {switchConfirm && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border-2 border-orange-400">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-6 h-6 text-orange-500" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Switch Confirmation</h3>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            {switchConfirm.message}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleSwitchCancel}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSwitchConfirm}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                            >
                                OK, Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockUpload;
