import React, { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import LedgerMasterEnhanced from '../components/LedgerMasterEnhanced';
import {
    getModules,
    previewExcel,
    importExcel,
    importLedger,
    importItemMaster,
    getItemGroups,
    ModuleDto,
    ExcelPreviewDto,
    ItemGroupDto
} from '../services/api';

const ImportMaster: React.FC = () => {
    const [modules, setModules] = useState<ModuleDto[]>([]);
    const [subModules, setSubModules] = useState<ModuleDto[]>([]);
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [selectedSubModule, setSelectedSubModule] = useState<string>('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ExcelPreviewDto | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewShown, setIsPreviewShown] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorList, setErrorList] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Ledger-specific states
    const [selectedLedgerGroup, setSelectedLedgerGroup] = useState<number>(0);
    const [isLedgerMode, setIsLedgerMode] = useState(false);
    const [isFileUploadEnabled, setIsFileUploadEnabled] = useState(false);
    const [showSubModuleDropdown, setShowSubModuleDropdown] = useState(true);

    // Item Master-specific states
    const [selectedItemGroup, setSelectedItemGroup] = useState<number>(0);
    const [itemGroups, setItemGroups] = useState<ItemGroupDto[]>([]);
    const [isItemMode, setIsItemMode] = useState(false);

    // Column resize states for Excel Preview Table
    const [previewColWidths, setPreviewColWidths] = useState<Record<number, number>>({});
    const previewResizeRef = useRef<{ colIndex: number; startX: number; startWidth: number; active: boolean }>({ colIndex: -1, startX: 0, startWidth: 0, active: false });

    // Initialize column widths when preview data changes
    useEffect(() => {
        if (previewData) {
            const widths: Record<number, number> = {};
            previewData.headers.forEach((_, idx) => {
                widths[idx] = 150;
            });
            setPreviewColWidths(widths);
        }
    }, [previewData]);

    // Persistent document-level resize listeners (set up once, cleaned up on unmount)
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!previewResizeRef.current.active) return;
            const { colIndex, startX, startWidth } = previewResizeRef.current;
            const diff = e.clientX - startX;
            const newWidth = Math.max(50, startWidth + diff);
            setPreviewColWidths(prev => ({ ...prev, [colIndex]: newWidth }));
        };

        const onMouseUp = () => {
            if (!previewResizeRef.current.active) return;
            previewResizeRef.current.active = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    const handlePreviewResizeStart = (e: React.MouseEvent<HTMLTableCellElement>, colIndex: number) => {
        const th = e.currentTarget;
        const rect = th.getBoundingClientRect();
        const offsetFromRight = rect.right - e.clientX;
        if (offsetFromRight > 8) return;
        e.preventDefault();
        e.stopPropagation();
        previewResizeRef.current = { colIndex, startX: e.clientX, startWidth: previewColWidths[colIndex] || 150, active: true };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const handlePreviewThMouseMove = (e: React.MouseEvent<HTMLTableCellElement>) => {
        const th = e.currentTarget;
        const rect = th.getBoundingClientRect();
        const offsetFromRight = rect.right - e.clientX;
        th.style.cursor = offsetFromRight <= 8 ? 'col-resize' : '';
    };

    const fetchModules = async () => {
        try {
            const data = await getModules('Masters');
            console.log('Fetched Modules:', data);
            setModules(data);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to fetch modules');
        }
    };

    useEffect(() => {
        fetchModules();
    }, []);

    // Helper function to check if module requires sub-module selection
    const requiresSubModuleSelection = (moduleName: string): boolean => {
        const normalizedName = moduleName.toLowerCase();
        return normalizedName.includes('ledger master') ||
            normalizedName.includes('item master') ||
            normalizedName.includes('tool master');
    };

    // Reset preview state when file changes
    useEffect(() => {
        setIsPreviewShown(false);
        setShowErrorModal(false);
        setErrorList([]);
    }, [uploadedFile]);

    const handleModuleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const moduleId = e.target.value;
        setSelectedModule(moduleId);
        setSelectedSubModule('');
        setSubModules([]);
        setPreviewData(null);
        setIsPreviewShown(false);
        setShowErrorModal(false);
        setErrorList([]);
        setIsFileUploadEnabled(false); // Reset file upload button
        setShowSubModuleDropdown(true); // Reset dropdown visibility

        if (!moduleId) {
            setIsLedgerMode(false);
            setIsItemMode(false);
            return;
        }

        // Check if Ledger Master or Item Master is selected
        const module = modules.find(m => m.moduleId.toString() === moduleId);

        if (module && (module.moduleName === 'LedgerMaster' || module.moduleDisplayName?.includes('Ledger'))) {
            setIsLedgerMode(true);
            setIsItemMode(false);
            setSelectedLedgerGroup(0);
        } else if (module && (module.moduleName === 'ItemMaster' || module.moduleDisplayName?.toLowerCase().includes('item'))) {
            setIsItemMode(true);
            setIsLedgerMode(false);
            setSelectedItemGroup(0);

            // Fetch Item Groups
            try {
                const groups = await getItemGroups();
                setItemGroups(groups);
            } catch (error: any) {
                toast.error('Failed to fetch item groups');
                console.error(error);
            }
        } else if (module && (module.moduleName === 'ToolMaster' || module.moduleDisplayName?.toLowerCase().includes('tool master'))) {
            // Tool Master mode - use generic sub-module dropdown
            setIsLedgerMode(false);
            setIsItemMode(false);
        } else {
            setIsLedgerMode(false);
            setIsItemMode(false);
        }

        if (module) {
            try {
                const lookupName = module.moduleDisplayName || module.moduleName;
                const subs = await getModules(lookupName);

                setSubModules(subs);

                // Check if this module requires sub-module selection
                const moduleDisplayName = module.moduleDisplayName || module.moduleName;
                const needsSubModuleSelection = requiresSubModuleSelection(moduleDisplayName);

                if (!needsSubModuleSelection && subs.length > 0) {
                    // Auto-select the first sub-module for non-master modules
                    setSelectedSubModule(subs[0].moduleId.toString());
                    setIsFileUploadEnabled(true); // Enable file upload
                    setShowSubModuleDropdown(true); // Show dropdown with auto-selected value
                } else if (!needsSubModuleSelection && subs.length === 0) {
                    // No sub-modules exist, hide dropdown and enable file upload directly
                    setShowSubModuleDropdown(false);
                    setIsFileUploadEnabled(true);
                } else {
                    // Modules that need sub-module selection (Item/Ledger/Tool Master)
                    setShowSubModuleDropdown(true);
                }
                // For modules that need sub-module selection, keep file upload disabled until selection
            } catch (error: any) {
                console.error('Failed to fetch sub-modules', error);
                toast.error(error?.response?.data?.error || 'Failed to fetch sub-modules');
                setSubModules([]);
            }
        }
    };

    const handleLedgerGroupChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const groupId = parseInt(e.target.value);
        setSelectedLedgerGroup(groupId);
        setPreviewData(null);
        setIsPreviewShown(false);

        if (groupId > 0) {
            setIsFileUploadEnabled(true); // Enable file upload when ledger group is selected
        } else {
            setIsFileUploadEnabled(false); // Disable file upload if no ledger group selected
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const extension = file.name.toLowerCase();
        if (!extension.endsWith('.xlsx')) {
            toast.error('Only .xlsx Excel files are supported. Please convert old .xls files to .xlsx format.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setUploadedFile(file);
        setPreviewData(null);
        setIsPreviewShown(false);
        setShowErrorModal(false);
        setErrorList([]);
        toast.success('File uploaded successfully');
    };

    const handleShowPreview = async () => {
        console.log('[Preview] Starting preview...');
        if (!uploadedFile) {
            console.error('[Preview] No file uploaded');
            toast.error('Please upload a file first');
            return;
        }

        console.log('[Preview] File:', uploadedFile.name, 'Size:', uploadedFile.size);
        setIsLoading(true);
        try {
            console.log('[Preview] Calling previewExcel API...');
            const data = await previewExcel(uploadedFile);
            console.log('[Preview] API response:', data);
            setPreviewData(data);
            setIsPreviewShown(true);
            toast.success('Preview loaded successfully');
        } catch (error: any) {
            console.error('[Preview] Error:', error);
            console.error('[Preview] Error response:', error?.response);
            console.error('[Preview] Error data:', error?.response?.data);
            toast.error(error?.response?.data?.error || 'Failed to load preview');
        } finally {
            setIsLoading(false);
            console.log('[Preview] Loading complete');
        }
    };

    const handleImportClick = () => {
        if (!uploadedFile) {
            toast.error('Please upload a file first');
            return;
        }
        setShowConfirmModal(true);
    };

    const handleImport = async () => {
        setShowConfirmModal(false); // Close modal

        if (!uploadedFile) {
            toast.error('Please upload a file first');
            return;
        }

        if (isLedgerMode) {
            // Ledger import mode
            if (selectedLedgerGroup <= 0) {
                toast.error('Please select a Ledger Group');
                return;
            }

            setIsLoading(true);
            setShowErrorModal(false);
            setErrorList([]);

            try {
                const result = await importLedger(uploadedFile, selectedLedgerGroup);

                if (result.success) {
                    toast.success(result.message);
                    setUploadedFile(null);
                    setPreviewData(null);
                    setIsPreviewShown(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } else {
                    toast.error(result.message);

                    if (result.errorMessages && result.errorMessages.length > 0) {
                        setErrorList(result.errorMessages);
                        setShowErrorModal(true);
                    }
                }
            } catch (error: any) {
                toast.error(error?.response?.data?.error || 'Failed to import ledger data');
            } finally {
                setIsLoading(false);
            }
        } else if (isItemMode) {
            // Item Master import mode
            if (selectedItemGroup <= 0) {
                toast.error('Please select an Item Group');
                return;
            }

            setIsLoading(true);
            setShowErrorModal(false);
            setErrorList([]);

            try {
                const result = await importItemMaster(uploadedFile, selectedItemGroup);

                if (result.success) {
                    toast.success(result.message);
                    setUploadedFile(null);
                    setPreviewData(null);
                    setIsPreviewShown(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } else {
                    toast.error(result.message);

                    if (result.errorMessages && result.errorMessages.length > 0) {
                        setErrorList(result.errorMessages);
                        setShowErrorModal(true);
                    }
                }
            } catch (error: any) {
                toast.error(error?.response?.data?.error || 'Failed to import item data');
            } finally {
                setIsLoading(false);
            }
        } else {
            // Standard module import mode
            if (!selectedModule) {
                toast.error('Please select a module');
                return;
            }

            setIsLoading(true);
            setShowErrorModal(false);
            setErrorList([]);

            try {
                const selectedModuleData = modules.find(m => m.moduleId.toString() === selectedModule);
                const moduleName = selectedModuleData?.moduleName || '';

                // Check if Tool Master and pass subModuleId
                const isToolMaster = moduleName === 'ToolMaster' || selectedModuleData?.moduleDisplayName?.toLowerCase().includes('tool master');

                if (isToolMaster && !selectedSubModule) {
                    toast.error('Please select a Tool Group');
                    setIsLoading(false);
                    return;
                }

                const subModuleId = isToolMaster && selectedSubModule ? parseInt(selectedSubModule) : undefined;
                const result = await importExcel(uploadedFile, moduleName, subModuleId);

                if (result.success) {
                    toast.success(result.message);
                    setUploadedFile(null);
                    setPreviewData(null);
                    setIsPreviewShown(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } else {
                    toast.error(result.message);

                    if (result.errorMessages && result.errorMessages.length > 0) {
                        setErrorList(result.errorMessages);
                        setShowErrorModal(true);
                    }
                }
            } catch (error: any) {
                toast.error(error?.response?.data?.error || 'Failed to import data');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Error Modal Helper
    const ErrorModal = () => {
        if (!showErrorModal || errorList.length === 0) return null;

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <span className="text-xl">⚠️</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import Validation Errors</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Found {errorList.length} issues in the file</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowErrorModal(false)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <span className="text-xl">×</span>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50 dark:bg-[#020617]/30">
                        <ul className="space-y-3">
                            {errorList.map((err, idx) => (
                                <li key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-[#0f172a] rounded-lg border border-red-100 dark:border-red-900/30 shadow-sm">
                                    <span className="text-red-500 mt-0.5">•</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium font-mono">{err}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e293b] rounded-b-xl flex justify-end">
                        <button
                            onClick={() => setShowErrorModal(false)}
                            className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Confirmation Modal
    const ConfirmationModal = () => {
        if (!showConfirmModal) return null;

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-md w-full flex flex-col border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <span className="text-xl">🤔</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Import</h3>
                        </div>
                    </div>

                    <div className="p-6">
                        <p className="text-gray-700 dark:text-gray-300">
                            Are you sure you want to import and have verified all the fields correctly?
                        </p>
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e293b] rounded-b-xl flex justify-end gap-3">
                        <button
                            onClick={() => setShowConfirmModal(false)}
                            className="px-4 py-2 bg-gray-200 dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            Yes, Import
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-3 md:p-4 bg-gray-50 dark:bg-[#020617] min-h-screen transition-colors duration-200">
            <ErrorModal />
            <ConfirmationModal />

            {/* Header */}
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Master Import</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Upload and import master data tables into the system.</p>
            </div>

            {/* Main Control Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Module Selection */}
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
                            {modules.map((module) => (
                                <option key={module.moduleId} value={module.moduleId}>
                                    {module.moduleDisplayName || module.moduleName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Conditional: Ledger Group,Item Group, or Sub-module Selection */}
                    {isLedgerMode ? (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Ledger Group
                            </label>
                            <select
                                className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white"
                                value={selectedLedgerGroup}
                                onChange={handleLedgerGroupChange}
                            >
                                <option value="0">Select Ledger Group</option>
                                {subModules.map((sub) => (
                                    <option key={sub.moduleId} value={sub.moduleId}>
                                        {sub.moduleDisplayName || sub.moduleName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : isItemMode ? (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Item Group
                            </label>
                            <select
                                className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white"
                                value={selectedItemGroup}
                                onChange={(e) => {
                                    setSelectedItemGroup(Number(e.target.value));
                                    if (Number(e.target.value) > 0) {
                                        setIsFileUploadEnabled(true);
                                    } else {
                                        setIsFileUploadEnabled(false);
                                    }
                                }}
                            >
                                <option value="0">Select Item Group</option>
                                {itemGroups.map((group) => (
                                    <option key={group.itemGroupID} value={group.itemGroupID}>
                                        {group.itemGroupName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : showSubModuleDropdown ? (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Sub-module Name
                            </label>
                            <select
                                className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 dark:disabled:bg-gray-900/50 disabled:text-gray-400 dark:disabled:text-gray-600 text-sm text-gray-900 dark:text-white"
                                value={selectedSubModule}
                                onChange={(e) => {
                                    setSelectedSubModule(e.target.value);
                                    // Enable file upload when sub-module is selected
                                    if (e.target.value) {
                                        setIsFileUploadEnabled(true);
                                    } else {
                                        setIsFileUploadEnabled(false);
                                    }
                                }}
                                disabled={!selectedModule || subModules.length === 0}
                            >
                                <option value="">Select Sub-module</option>
                                {subModules.map((sub) => (
                                    <option key={sub.moduleId} value={sub.moduleId}>
                                        {sub.moduleDisplayName || sub.moduleName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="invisible">
                            {/* Hidden placeholder to maintain grid layout */}
                        </div>
                    )}

                    {/* File Upload */}
                    {(selectedModule && !isLedgerMode) && (
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Excel File (.xlsx only)
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div
                                        onClick={() => isFileUploadEnabled && fileInputRef.current?.click()}
                                        className={`w-full px-3 py-1.5 border-2 border-dashed rounded-lg transition-all ${!isFileUploadEnabled
                                            ? 'border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-gray-900/50 cursor-not-allowed opacity-60'
                                            : uploadedFile
                                                ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10 cursor-pointer'
                                                : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50/50 dark:bg-[#020617]/50 cursor-pointer'
                                            }`}
                                    >
                                        {uploadedFile ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{uploadedFile.name}</span>
                                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-xs">
                                                    {isFileUploadEnabled ? 'Click to upload Excel file' : 'Select module first'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {uploadedFile && (
                                    <>
                                        <button
                                            onClick={handleShowPreview}
                                            disabled={isLoading}
                                            className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors whitespace-nowrap"
                                        >
                                            Preview
                                        </button>
                                        <button
                                            onClick={handleImportClick}
                                            disabled={isLoading || !isPreviewShown}
                                            className="px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-800 transition-colors whitespace-nowrap"
                                        >
                                            Import
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Text */}
                {!selectedModule && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                        Please select a module to begin
                    </p>
                )}

                {/* Column Mapping Info for Ledger Mode - HIDDEN PER USER REQUEST */}
                {/* {isLedgerMode && selectedLedgerGroup > 0 && (
                    masterColumns.length > 0 ? (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                            <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                <span>📋</span> Expected Excel Columns ({masterColumns.length} columns)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {masterColumns.map((col, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                                        <span className={`${col.isRequired ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {col.isRequired ? '●' : '○'}
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-300 font-mono">{col.fieldName}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                                <span className="text-red-600 dark:text-red-400">●</span> Required fields
                                <span className="ml-3 text-gray-500 dark:text-gray-400">○</span> Optional fields
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                            <h3 className="text-xs font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                                <span>ℹ️</span> Flexible Import Mode
                            </h3>
                            <p className="text-xs text-green-700 dark:text-green-300">
                                No column definitions configured for this Ledger Group. You can import Excel files with any column structure.
                                All columns from your Excel file will be imported.
                            </p>
                    </div>
                )} */}
            </div>

            {/* Ledger Master Enhanced Component */}
            {isLedgerMode && selectedLedgerGroup > 0 && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-4">
                    <LedgerMasterEnhanced
                        ledgerGroupId={selectedLedgerGroup}
                        ledgerGroupName={subModules.find(s => s.moduleId === selectedLedgerGroup)?.moduleDisplayName || subModules.find(s => s.moduleId === selectedLedgerGroup)?.moduleName || 'Ledger'}
                    />
                </div>
            )}

            {/* Excel Preview Table */}
            {previewData && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Excel Preview</h2>
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1e293b] px-2 py-1 rounded-full">
                            {previewData.totalRows} rows • {previewData.totalColumns} columns
                        </div>
                    </div>

                    {/* Fixed Height Scrollable Container */}
                    <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: '450px' }}>
                        <div className="excel-scroll-container absolute inset-0 overflow-auto scroll-smooth">
                            <table className="divide-y divide-gray-200 dark:divide-gray-800 text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '48px' }} />
                                    {previewData.headers.map((_, idx) => (
                                        <col key={idx} style={{ width: `${previewColWidths[idx] || 150}px` }} />
                                    ))}
                                </colgroup>
                                <thead className="bg-gray-50 dark:bg-[#1e293b] sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12 bg-gray-50 dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-700 sticky left-0 z-20">
                                            #
                                        </th>
                                        {previewData.headers.map((header, index) => (
                                            <th
                                                key={index}
                                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#1e293b] whitespace-nowrap relative select-none border-b border-r border-gray-300 dark:border-gray-600"
                                                onMouseDown={(e) => handlePreviewResizeStart(e, index)}
                                                onMouseMove={handlePreviewThMouseMove}
                                            >
                                                <span className="truncate">{header}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-[#0f172a] divide-y divide-gray-200 dark:divide-gray-800">
                                    {previewData.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors">
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-50/50 dark:bg-[#1e293b]/50 border-r border-gray-200 dark:border-gray-700 sticky left-0 z-10">
                                                {rowIndex + 1}
                                            </td>
                                            {row.map((cell, cellIndex) => (
                                                <td
                                                    key={cellIndex}
                                                    className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
                                                >
                                                    <span className="block truncate" title={cell?.toString() || ''}>
                                                        {cell?.toString() || ''}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Scroll Hint */}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                        Scroll horizontally and vertically to view all data
                    </p>
                </div>
            )}
        </div>
    );
};

export default ImportMaster;
