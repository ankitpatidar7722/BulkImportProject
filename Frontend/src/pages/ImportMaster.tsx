import React, { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getModules, previewExcel, importExcel, ModuleDto, ExcelPreviewDto } from '../services/api';

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

    useEffect(() => {
        fetchModules();
    }, []);

    // Reset preview state when file changes
    useEffect(() => {
        setIsPreviewShown(false);
        setShowErrorModal(false);
        setErrorList([]);
    }, [uploadedFile]);

    const fetchModules = async () => {
        try {
            const data = await getModules('Masters');
            console.log('Fetched Modules:', data);
            setModules(data);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to fetch modules');
        }
    };

    const handleModuleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const moduleId = e.target.value;
        setSelectedModule(moduleId);
        setSelectedSubModule('');
        setSubModules([]);
        setPreviewData(null);
        setIsPreviewShown(false);
        setShowErrorModal(false);
        setErrorList([]);

        if (moduleId) {
            const module = modules.find(m => m.moduleId.toString() === moduleId);
            if (module) {
                try {
                    const lookupName = module.moduleDisplayName || module.moduleName;
                    const subs = await getModules(lookupName);

                    if (subs.length === 0) {
                        toast("Server returned 0 sub-modules", { icon: '⚠️' });
                    }
                    setSubModules(subs);
                } catch (error: any) {
                    console.error('Failed to fetch sub-modules', error);
                    toast.error(error?.response?.data?.error || 'Failed to fetch sub-modules');
                    setSubModules([]);
                }
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const extension = file.name.toLowerCase();
        if (!extension.endsWith('.xlsx') && !extension.endsWith('.xls')) {
            toast.error('Only Excel files (.xlsx, .xls) are allowed');
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
        if (!uploadedFile) {
            toast.error('Please upload a file first');
            return;
        }

        setIsLoading(true);
        try {
            const data = await previewExcel(uploadedFile);
            setPreviewData(data);
            setIsPreviewShown(true);
            toast.success('Preview loaded successfully');
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to load preview');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (!uploadedFile) {
            toast.error('Please upload a file first');
            return;
        }

        if (!selectedModule) {
            toast.error('Please select a module');
            return;
        }

        setIsLoading(true);
        setShowErrorModal(false);
        setErrorList([]);

        try {
            const selectedModuleData = modules.find(m => m.moduleId.toString() === selectedModule);
            const result = await importExcel(uploadedFile, selectedModuleData?.moduleName || '');

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

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-gray-50 dark:bg-[#020617] min-h-screen transition-colors duration-200">
            <ErrorModal />
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Import</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Upload and import master data tables into the system.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Column 1: Select Module */}
                <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 h-fit transition-colors duration-200">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">1. Select Module</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose the category of data you want to import.</p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Module Name
                            </label>
                            <select
                                className="w-full px-4 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sub-module Name
                            </label>
                            <select
                                className="w-full px-4 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 dark:disabled:bg-gray-900/50 disabled:text-gray-400 dark:disabled:text-gray-600 text-gray-900 dark:text-white"
                                value={selectedSubModule}
                                onChange={(e) => setSelectedSubModule(e.target.value)}
                                disabled={!selectedModule || subModules.length === 0}
                            >
                                <option value="">Select Sub-module</option>
                                {subModules.map((sub) => (
                                    <option key={sub.moduleId} value={sub.moduleId}>
                                        {sub.moduleDisplayName || sub.moduleName}
                                    </option>
                                ))}
                            </select>
                            {selectedModule && subModules.length === 0 && (
                                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                    <span>⚠️</span> No sub-modules available
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 2: Upload Data */}
                <div className={`bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 h-fit transition-all duration-300 ${!selectedModule ? 'opacity-60 pointer-events-none grayscale' : 'opacity-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Upload Data</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Upload Excel for <span className="font-medium text-blue-600 dark:text-blue-400">{selectedModule ? modules.find(m => m.moduleId.toString() === selectedModule)?.moduleDisplayName : '...'}</span>.</p>
                        </div>

                        {/* Action Buttons - Top Right */}
                        {uploadedFile && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleShowPreview}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    Preview
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={isLoading || !isPreviewShown}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-800 transition-colors flex items-center gap-2"
                                >
                                    Import Data
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50/50 dark:bg-[#020617]/50">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                        </div>

                        <p className="text-blue-600 dark:text-blue-400 font-medium mb-1 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
                            Click to upload <span className="text-gray-500 dark:text-gray-400 no-underline">or drag and drop</span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                            Excel files (.xlsx, .xls) up to 50MB
                        </p>

                        {uploadedFile && (
                            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 p-3 rounded-lg flex items-center justify-between shadow-sm max-w-sm mx-auto">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{uploadedFile.name}</span>
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Ready</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Excel Preview Table */}
            {
                previewData && (
                    <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-fade-in mt-8 transition-colors duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Excel Preview</h2>
                            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1e293b] px-3 py-1 rounded-full">
                                {previewData.totalRows} rows • {previewData.totalColumns} columns
                            </div>
                        </div>

                        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-[600px] custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 relative">
                                <thead className="bg-gray-50 dark:bg-[#1e293b] sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16 bg-gray-50 dark:bg-[#1e293b] sticky top-0 z-10">#</th>
                                        {previewData.headers.map((header, index) => (
                                            <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#1e293b] sticky top-0 z-10">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-[#0f172a] divide-y divide-gray-200 dark:divide-gray-800">
                                    {previewData.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500 font-mono">{rowIndex + 1}</td>
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{cell?.toString() || ''}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default ImportMaster;
