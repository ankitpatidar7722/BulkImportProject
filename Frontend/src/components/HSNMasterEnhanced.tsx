import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Database, Trash2, Upload, Download, CheckCircle2, AlertCircle, FilePlus2, XCircle, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    getHSNs,
    getItemGroupNames, // Added import
    importHSNs,
    softDeleteHSN,
    clearHSNData,
    validateHSNs,
    HSNMasterDto,
    HSNValidationResultDto,
    HSNRowValidation,
    ValidationStatus
} from '../services/api';


// AG Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, GridApi, RowClassRules, ICellRendererParams } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface HSNMasterEnhancedProps {
    moduleId?: number; // Optional, similar to Ledger logic
}

const HSNMasterEnhanced: React.FC<HSNMasterEnhancedProps> = () => {


    const [hsnData, setHsnData] = useState<HSNMasterDto[]>([]);
    const [itemGroups, setItemGroups] = useState<string[]>([]); // Added state for Item Groups
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [validationResult, setValidationResult] = useState<HSNValidationResultDto | null>(null);
    const [mode, setMode] = useState<'idle' | 'loaded' | 'preview' | 'validated'>('idle');
    const [filterType, setFilterType] = useState<'all' | 'valid' | 'duplicate' | 'missing' | 'mismatch' | 'invalid'>('all');
    const [showFileNameError, setShowFileNameError] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingMode, setPendingMode] = useState<{ type: 'load' | 'upload'; action: () => void } | null>(null);
    const [showModeSwitchModal, setShowModeSwitchModal] = useState(false);

    // Clear Data Flow State
    const [clearFlowStep, setClearFlowStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [clearCredentials, setClearCredentials] = useState({ username: '', password: '', reason: '' });
    const [clearActionType, setClearActionType] = useState<'clearOnly' | 'freshUpload'>('freshUpload');

    // CAPTCHA State
    const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState(false);

    // Generate CAPTCHA
    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 50) + 20;
        const num2 = Math.floor(Math.random() * 30) + 10;
        const answer = num1 - num2;
        setCaptchaQuestion({ num1, num2, answer });
        setCaptchaInput('');
        setCaptchaError(false);
    };

    // Validation Modal State
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationModalContent, setValidationModalContent] = useState<{ title: string; messages: string[] } | null>(null);

    // Re-Upload Confirmation State
    const [showReUploadModal, setShowReUploadModal] = useState(false);

    // Standard Error Modal State
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState<string>('');

    const showError = (message: string) => {
        setErrorModalMessage(message);
        setShowErrorModal(true);
    };

    // Success Popup State
    const [successInfo, setSuccessInfo] = useState<{ rowCount: number } | null>(null);

    // --- AG Grid Setup ---
    const gridApiRef = useRef<GridApi | null>(null);

    // Fetch Item Groups on Mount for Dropdown
    useEffect(() => {
        const fetchItemGroups = async () => {
            try {
                const groups = await getItemGroupNames();
                setItemGroups(groups);
            } catch (error) {
                console.error("Failed to fetch item groups", error);
                showError("Failed to load Item Group list");
            }
        };
        fetchItemGroups();
    }, []);

    // Validation Map for O(1) lookup by rowIndex
    const validationMap = useMemo(() => {
        if (!validationResult) return new Map<number, HSNRowValidation>();
        const map = new Map<number, HSNRowValidation>();
        validationResult.rows.forEach((row: HSNRowValidation) => {
            // Ensure we use the correct index field
            if (typeof row.rowIndex === 'number') {
                map.set(row.rowIndex, row);
            }
        });
        return map;
    }, [validationResult]);

    const handleCellEdit = useCallback((rowIndex: number, field: keyof HSNMasterDto, newValue: any) => {
        setHsnData(prevData => {
            const newData = [...prevData];
            newData[rowIndex] = { ...newData[rowIndex], [field]: newValue || '' }; // Ensure non-null for required fields
            return newData;
        });
    }, []);

    const onCellValueChanged = useCallback((params: any) => {
        const { colDef, newValue, data } = params;

        // Use hsnData.indexOf(data) because node.rowIndex may be relative to filtered view
        const rowIndex = hsnData.indexOf(data);

        if (rowIndex === -1) {
            console.warn("Row data not found in state:", data);
            return;
        }

        const field = colDef.field as keyof HSNMasterDto;

        // Logic: Clear Item Group Name if Product Type is NOT Raw Material
        if (field === 'productCategory') {
            const isRawMaterial = (newValue || '').trim().toLowerCase() === 'raw material';
            if (!isRawMaterial && data.itemGroupName) {
                // Clear state
                handleCellEdit(rowIndex, 'itemGroupName', '');
            }
        }

        handleCellEdit(rowIndex, field, newValue);
    }, [handleCellEdit, hsnData]);

    // Custom Cell Renderer for Item Group Name with Clear Button
    const ItemGroupRenderer = (params: ICellRendererParams) => {
        const value = params.value;
        // Replicating editable logic: Mode is preview/validated AND Product Type is Raw Material
        const isModeEditable = mode === 'preview' || mode === 'validated';
        const isRawMaterial = (params.data?.productCategory || '').trim().toLowerCase() === 'raw material';
        const isEditable = isModeEditable && isRawMaterial;

        if (!value || !isEditable) return <span>{value}</span>;

        return (
            <div className="flex items-center justify-between w-full">
                <span className="truncate">{value}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent row selection or editing start
                        params.node.setDataValue('itemGroupName', ''); // Clear value via Grid API
                        // This triggers onCellValueChanged automatically
                    }}
                    className="ml-1 p-0.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Clear Item Group"
                >
                    <XCircle className="w-3 h-3" />
                </button>
            </div>
        );
    };

    const getCellClassRules = () => {
        return {
            'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300': (params: any) => {
                const rowIndex = hsnData.indexOf(params.data);
                if (rowIndex === -1) return false;
                const rowVal = validationMap.get(rowIndex);
                // Check if this specific column has InvalidContent
                return rowVal?.cellValidations?.some(c => c.columnName === params.colDef.field && c.status === ValidationStatus.InvalidContent) || false;
            },
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300': (params: any) => {
                const rowIndex = hsnData.indexOf(params.data);
                if (rowIndex === -1) return false;
                const rowVal = validationMap.get(rowIndex);
                // Check if this specific column has Mismatch
                return rowVal?.cellValidations?.some(c => c.columnName === params.colDef.field && c.status === ValidationStatus.Mismatch) || false;
            },
            'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300': (params: any) => {
                const rowIndex = hsnData.indexOf(params.data);
                if (rowIndex === -1) return false;
                const rowVal = validationMap.get(rowIndex);
                // Check if this specific column has MissingData
                return rowVal?.cellValidations?.some(c => c.columnName === params.colDef.field && c.status === ValidationStatus.MissingData) || false;
            }
        };
    };

    const columnDefs: ColDef[] = useMemo(() => {
        const isEditable = mode === 'preview' || mode === 'validated';
        const commonCellRules = getCellClassRules();

        return [
            {
                field: 'checkbox',
                headerName: '',
                checkboxSelection: true,
                headerCheckboxSelection: true,
                headerCheckboxSelectionFilteredOnly: true,
                width: 40,
                pinned: 'left',
                lockPosition: true,
                resizable: false,
                suppressMenu: true
            },
            {
                headerName: '#',
                valueGetter: "node.rowIndex + 1",
                width: 50,
                pinned: 'left',
                lockPosition: true,
                resizable: true,
                suppressMenu: true
            },
            { field: 'productHSNName', headerName: 'Group Name', minWidth: 150, editable: isEditable, cellClassRules: commonCellRules },
            { field: 'displayName', headerName: 'Display Name', minWidth: 200, editable: isEditable, cellClassRules: commonCellRules },
            { field: 'hsnCode', headerName: 'HSN Code', width: 120, editable: isEditable, cellClassRules: commonCellRules },
            {
                field: 'productCategory',
                headerName: 'Product Type',
                width: 130,
                editable: isEditable,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: ['Raw Material', 'Finish Goods', 'Spare Parts', 'Service', 'Tool']
                },
                cellClassRules: commonCellRules
            },
            { field: 'gstTaxPercentage', headerName: 'GST %', width: 90, editable: isEditable, cellClassRules: commonCellRules },
            { field: 'cgstTaxPercentage', headerName: 'CGST %', width: 90, editable: isEditable, cellClassRules: commonCellRules },
            { field: 'sgstTaxPercentage', headerName: 'SGST %', width: 90, editable: isEditable, cellClassRules: commonCellRules },
            { field: 'igstTaxPercentage', headerName: 'IGST %', width: 90, editable: isEditable, cellClassRules: commonCellRules },
            {
                field: 'itemGroupName',
                headerName: 'Item Group Name',
                minWidth: 150,
                // Only editable if Product Type is 'Raw Material'
                editable: (params) => {
                    if (!isEditable) return false;
                    const productType = (params.data?.productCategory || '').trim();
                    // Case-insensitive check
                    return productType.toLowerCase() === 'raw material';
                },
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: itemGroups
                },
                cellRenderer: ItemGroupRenderer,
                cellClassRules: commonCellRules
            }
        ];
    }, [mode, itemGroups, validationMap]); // Added validationMap dependency

    const rowClassRules: RowClassRules = useMemo(() => {
        return {
            'bg-red-50 dark:bg-red-900/10': (params) => {
                if (!validationResult) return false;
                const rowIndex = hsnData.indexOf(params.data);
                if (rowIndex === -1) return false;
                const rowVal = validationMap.get(rowIndex);
                return rowVal?.rowStatus === ValidationStatus.Duplicate;
            },
            'bg-blue-50 dark:bg-blue-900/10': (params) => {
                const rowIndex = hsnData.indexOf(params.data);
                if (rowIndex === -1) return false;
                const rowVal = validationMap.get(rowIndex);
                return rowVal?.rowStatus === ValidationStatus.MissingData;
            },
            'bg-yellow-50 dark:bg-yellow-900/10': (params) => {
                const rowIndex = hsnData.indexOf(params.data);
                if (rowIndex === -1) return false;
                const rowVal = validationMap.get(rowIndex);
                return rowVal?.rowStatus === ValidationStatus.Mismatch;
            },
            // REMOVED 'bg-purple-50' rule to stop full row highlighting for InvalidContent
            'font-medium': (params) => {
                const rowIndex = hsnData.indexOf(params.data);
                if (rowIndex === -1) return false;
                const rowVal = validationMap.get(rowIndex);
                return rowVal?.rowStatus !== ValidationStatus.Valid && rowVal?.rowStatus !== undefined;
            }
        };
    }, [validationMap, hsnData, validationResult]);

    // External Filter Logic
    const isExternalFilterPresent = useCallback(() => {
        return filterType !== 'all';
    }, [filterType]);

    const doesExternalFilterPass = useCallback((node: any) => {
        if (!validationResult || filterType === 'all') return true;

        const rowIndex = hsnData.indexOf(node.data);
        if (rowIndex === -1) return true;

        const rowVal = validationMap.get(rowIndex);
        if (!rowVal) return true;

        switch (filterType) {
            case 'valid': return rowVal.rowStatus === ValidationStatus.Valid;
            case 'duplicate': return rowVal.rowStatus === ValidationStatus.Duplicate;
            case 'missing': return rowVal.rowStatus === ValidationStatus.MissingData;
            case 'mismatch': return rowVal.rowStatus === ValidationStatus.Mismatch;
            case 'invalid': return rowVal.rowStatus === ValidationStatus.InvalidContent;
            default: return true;
        }
    }, [filterType, validationMap, validationResult, hsnData]);

    // Trigger filter update when type changes
    useEffect(() => {
        if (gridApiRef.current) {
            gridApiRef.current.onFilterChanged();
        }
    }, [filterType, validationResult]);

    // --- Actions ---

    const loadData = async () => {
        // Strict Mode Check
        if (mode === 'preview' || mode === 'validated') {
            setPendingMode({
                type: 'load',
                action: () => performLoadData()
            });
            setShowModeSwitchModal(true);
            return;
        }
        performLoadData();
    };

    const performLoadData = async () => {
        setIsLoading(true);
        try {
            const data = await getHSNs();
            if (data.length === 0) {
                showError('No data found in database');
                setHsnData([]);
                setMode('idle');
                setValidationResult(null); // Ensure validation is cleared
            } else {
                setHsnData(data);
                setMode('loaded');
                setValidationResult(null);
                setFilterType('all');
                toast.success(`Loaded ${data.length} records`);
            }
        } catch (error: any) {
            console.error(error);
            showError(error?.response?.data?.error || 'Failed to load HSN data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelectTrigger = () => {
        // Strict Mode Check: If in Loaded mode, confirm switch
        if (mode === 'loaded') {
            setPendingMode({
                type: 'upload',
                action: () => {
                    // Reset state for upload
                    setHsnData([]);
                    setMode('idle');
                    setValidationResult(null);
                    setSelectedRows(new Set());
                    // Open file dialog
                    if (fileInputRef.current) fileInputRef.current.click();
                }
            });
            setShowModeSwitchModal(true);
            return;
        }

        // Re-Upload Confirmation (Excel Mode)
        if (hsnData.length > 0 && (mode === 'preview' || mode === 'validated')) {
            setShowReUploadModal(true);
            return;
        }

        // Otherwise just click
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const confirmReUpload = () => {
        setShowReUploadModal(false);
        setHsnData([]);
        setValidationResult(null);
        setMode('idle');
        setSelectedRows(new Set());
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset input
            fileInputRef.current.click();
        }
    };

    const handleClearAllDataTrigger = async (type: 'clearOnly' | 'freshUpload') => {
        // If local data exists, proceed
        if (hsnData.length > 0) {
            setClearActionType(type);
            setClearFlowStep(1);
            generateCaptcha();
            return;
        }

        // Check DB
        setIsLoading(true);
        try {
            const data = await getHSNs();
            if (data.length === 0) {
                if (type === 'clearOnly') {
                    showError('No data found in database');
                } else {
                    toast.success('Database is already empty. Proceeding to upload.');
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                    }
                }
                setIsLoading(false);
                return;
            }
            // Proceed
            setClearActionType(type);
            setClearFlowStep(1);
            generateCaptcha();
        } catch (e) {
            showError('Failed to verify database data');
            setIsLoading(false);
        } finally {
            // Loading state handled in catch block if error, else continues? 
            // Ideally we want to keep Loading true while transitioning? 
            // No, generateCaptcha is instantaneous.
            if (hsnData.length > 0) setIsLoading(false); // Only disable here if we didn't enter the try block logic which returns.
        }
        // Correction: The finally block runs always. If we successfully proceeded to setClearFlowStep, we want loading to stop.
        // But wait, if we call async, we set isLoading(true). We must set isLoading(false) at the end.
        setIsLoading(false);
    };

    const handleClearConfirm = () => {
        // Validate CAPTCHA
        const userAnswer = parseInt(captchaInput);
        if (isNaN(userAnswer) || userAnswer !== captchaQuestion.answer) {
            setCaptchaError(true);
            showError('❌ Incorrect CAPTCHA answer. Please try again.');
            return;
        }

        if (clearFlowStep < 3) {
            setClearFlowStep((prev) => (prev + 1) as any);
            generateCaptcha();
        } else {
            setClearFlowStep(4); // Show Credential Popup
        }
    };

    const handleClearCancel = () => {
        setClearFlowStep(0);
        setClearCredentials({ username: '', password: '', reason: '' });
        setCaptchaInput('');
        setCaptchaError(false);
    };

    const handleCredentialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const response = await clearHSNData(2, clearCredentials.username, clearCredentials.password, clearCredentials.reason); // Company ID 2 hardcoded for now
            const deletedCount = response.importedRows || 0; // Using importedRows as deleted count from service

            toast.success(`Successfully cleared ${deletedCount} HSN(s) from database`);
            setHsnData([]);
            setValidationResult(null);
            setMode('idle');

            if (clearActionType === 'freshUpload' && fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }

            handleClearCancel();
        } catch (error: any) {
            console.error(error);
            showError(error.response?.data?.message || 'Failed to clear data. Check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xlsx')) {
            showError('Only .xlsx files are supported');
            return;
        }

        const fileName = file.name.replace(/\.xlsx$/i, '').trim();
        // Validation Rule: File name (without extension) must be "HSN Master" (case insensitive)
        if (fileName.toLowerCase() !== 'hsn master') {
            setShowFileNameError(true);
            if (fileInputRef.current) fileInputRef.current.value = '';
            // Reset any existing data
            setHsnData([]);
            setMode('idle');
            setValidationResult(null);
            return;
        }

        setShowFileNameError(false);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map Excel columns to DTO
                const safeParseFloat = (value: any): number => {
                    if (value === null || value === undefined) return 0;
                    const str = String(value).trim();
                    if (str === '') return 0;
                    const num = parseFloat(str);
                    return isNaN(num) ? 0 : num;
                };

                const mappedData: HSNMasterDto[] = data.map((row: any) => ({
                    productHSNName: String(row['Group Name'] || row['Group Name'] || '').trim(),
                    displayName: String(row['Display Name'] || row['DisplayName'] || '').trim(),
                    hsnCode: String(row['HSN Code'] || row['HSNCode'] || '').trim(),
                    productCategory: String(row['Product Type'] || row['ProductType'] || row['ProductCategory'] || '').trim(),
                    gstTaxPercentage: safeParseFloat(row['GST %'] || row['GSTTaxPercentage']),
                    cgstTaxPercentage: safeParseFloat(row['CGST %'] || row['CGSTTaxPercentage']),
                    sgstTaxPercentage: safeParseFloat(row['SGST %'] || row['SGSTTaxPercentage']),
                    igstTaxPercentage: safeParseFloat(row['IGST %'] || row['IGSTTaxPercentage']),
                    itemGroupName: String(row['ItemGroupName'] || row['Item Group Name'] || '').trim(),
                    companyID: 2 // Default
                }));

                setHsnData(mappedData);
                setMode('preview');

                // Auto-validate to show summary immediately
                setIsLoading(true);
                try {
                    const result = await validateHSNs(mappedData);
                    setValidationResult(result);
                    setMode('validated');

                    if (result.isValid) {
                        toast.success('Data loaded and validated successfully.');
                    } else {
                        const errorCount = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount;
                        toast.success(`Data loaded with ${errorCount} validation issues.`);
                    }
                } catch (validError: any) {
                    console.error(validError);
                    const errorMsg = validError.response?.data?.message || validError.message || 'Validation failed to run.';
                    showError(`Data loaded, but validation failed: ${errorMsg}`);
                } finally {
                    setIsLoading(false);
                }

            } catch (error) {
                console.error(error);
                showError('Failed to parse Excel file');
                setIsLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleValidate = async () => {
        if (hsnData.length === 0) return;
        setIsLoading(true);
        try {
            const result = await validateHSNs(hsnData);
            setValidationResult(result);
            setMode('validated');

            if (result.isValid) {
                toast.success("Validation Successful! You can now save.");
            } else {
                showError(`Validation Failed: Found ${result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount} errors.`);
            }
        } catch (error) {
            console.error(error);
            showError('Validation failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Actual Import/Save
    const handleSave = async () => {
        if (hsnData.length === 0) {
            showError('No data to import');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Full Re-Validation
            const result = await validateHSNs(hsnData);
            setValidationResult(result);

            if (!result.isValid) {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount;

                // Aggregate failures by column
                const columnFailures = new Map<string, Set<string>>();

                result.rows.forEach((row: HSNRowValidation) => {
                    // 1. Handle Duplicates
                    if (row.rowStatus === ValidationStatus.Duplicate) {
                        const col = 'HSNCode'; // Assuming HSNCode or DisplayName is key
                        if (!columnFailures.has(col)) columnFailures.set(col, new Set());
                        columnFailures.get(col)!.add('Duplicate data found');
                    }

                    // 2. Handle Cell Validations
                    if (row.cellValidations && row.cellValidations.length > 0) {
                        row.cellValidations.forEach((cell: any) => {
                            const col = cell.columnName || 'Unknown';
                            if (!columnFailures.has(col)) columnFailures.set(col, new Set());

                            let reason = cell.validationMessage;
                            if (cell.status === ValidationStatus.MissingData) reason = 'Missing data';
                            else if (cell.status === ValidationStatus.Mismatch) reason = 'Mismatch with Master';
                            else if (cell.status === ValidationStatus.InvalidContent) reason = 'Invalid format/Special characters';

                            columnFailures.get(col)!.add(reason);
                        });
                    }
                });

                // Construct Message
                const messages: string[] = [];
                columnFailures.forEach((reasons, col) => {
                    messages.push(`${col} – ${Array.from(reasons).join(', ')}`);
                });

                setValidationModalContent({
                    title: `Validation Failed: ${totalIssues} Issue${totalIssues !== 1 ? 's' : ''} Found`,
                    messages: messages.length > 0 ? messages : ['Please review the grid for specific issues that were not attributed to specific columns.']
                });
                setShowValidationModal(true);
                showError('Validation failed. Please correct highlighted errors before saving.');
                return; // ABORT
            }

            // 3. Import
            const importRes = await importHSNs(hsnData);
            if (importRes.success) {
                // Show success popup
                setSuccessInfo({ rowCount: importRes.importedRows ?? hsnData.length });
                loadData();
                setValidationResult(null);
            } else {
                if (importRes.errorMessages && importRes.errorMessages.length > 0) {
                    setValidationModalContent({
                        title: 'Import Failed',
                        messages: importRes.errorMessages
                    });
                    setShowValidationModal(true);
                } else {
                    toast.error(importRes.message);
                }
            }
        } catch (error: any) {
            console.error(error);
            showError(error.response?.data?.message || 'Import Failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveRow = async () => {
        const selectedNodes = gridApiRef.current?.getSelectedNodes() || [];
        if (selectedNodes.length === 0) {
            showError('Please select at least one row to remove');
            return;
        }

        // Logic split: If uploaded (preview/validated), remove from local state.
        // If loaded (DB mode), remove from DB.

        if (mode === 'loaded') {
            if (!window.confirm(`Are you sure you want to delete ${selectedNodes.length} records from database?`)) return;

            setIsLoading(true);
            try {
                let deleted = 0;
                for (const node of selectedNodes) {
                    if (node.data.productHSNID) {
                        await softDeleteHSN(node.data.productHSNID);
                        deleted++;
                    }
                }
                toast.success(`Deleted ${deleted} records.`);
                loadData();
            } catch (e) {
                console.error(e);
                showError('Failed to delete records');
            } finally {
                setIsLoading(false);
            }
        } else {
            // Local remove
            const selectedIndices = new Set(selectedNodes.map(n => n.rowIndex));
            const newHsnData = hsnData.filter((_, idx) => !selectedIndices.has(idx as number));
            setHsnData(newHsnData);
            setSelectedRows(new Set());
            // Reset validation if rows change, or we could just re-validate manually
            setValidationResult(null);
            setMode('preview'); // Back to preview to force validation
            toast.success(`Removed ${selectedIndices.size} row(s). Please re-validate.`);
        }
    };

    const handleExport = () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('HSN Master');

        const headers = ['Group Name', 'Display Name', 'HSN Code', 'ProductType', 'GST %', 'CGST %', 'SGST %', 'IGST %', 'ItemGroupName'];
        worksheet.addRow(headers);

        hsnData.forEach(row => {
            worksheet.addRow([
                row.productHSNName,
                row.displayName,
                row.hsnCode,
                row.productCategory,
                row.gstTaxPercentage,
                row.cgstTaxPercentage,
                row.sgstTaxPercentage,
                row.igstTaxPercentage,
                row.itemGroupName
            ]);
        });

        workbook.xlsx.writeBuffer().then((buffer) => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, 'HSN Master.xlsx');
            toast.success('Export downloaded');
        });
    };

    // Calculate if Save is enabled
    const canSave = useMemo(() => {
        if (mode !== 'validated' || !validationResult) return false;

        const { duplicateCount, missingDataCount, mismatchCount, invalidContentCount } = validationResult.summary;
        return duplicateCount === 0 && missingDataCount === 0 && mismatchCount === 0 && invalidContentCount === 0 && validationResult.isValid;
    }, [mode, validationResult]);

    return (
        <div className="bg-white dark:bg-[#0f172a] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col h-[calc(100vh-180px)]">

            {/* ✅ Success Popup Modal */}
            {successInfo && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 w-full" />
                        <div className="p-8 text-center">
                            <div className="mx-auto mb-5 w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center ring-8 ring-green-50 dark:ring-green-900/10">
                                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Import Successful!</h2>
                            <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-1">Successfully imported</p>
                            <p className="text-4xl font-extrabold text-green-600 dark:text-green-400 mb-1">{successInfo.rowCount}</p>
                            <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-6">
                                {successInfo.rowCount === 1 ? 'row' : 'rows'} into <span className="font-semibold text-gray-800 dark:text-white">HSN Master</span>
                            </p>
                            <button
                                onClick={() => setSuccessInfo(null)}
                                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 active:scale-95 shadow-md shadow-green-200 dark:shadow-green-900/30"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-[#0f172a] sticky top-0 z-10 rounded-t-lg">
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={loadData} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm">
                        <Database className="w-4 h-4" /> Load Data
                    </button>

                    <button onClick={() => handleClearAllDataTrigger('clearOnly')} disabled={isLoading || selectedRows.size > 0} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm">
                        <XCircle className="w-4 h-4" /> Clear All Data
                    </button>

                    {mode === 'loaded' ? (
                        <button onClick={handleRemoveRow} disabled={isLoading || selectedRows.size === 0} className="flex items-center gap-2 px-4 py-2 bg-[#D2691E] text-white rounded-lg hover:bg-[#A55217] transition-colors disabled:opacity-50 text-sm font-medium shadow-sm">
                            <Trash2 className="w-4 h-4" /> Soft Delete ({selectedRows.size})
                        </button>
                    ) : (mode === 'preview' || mode === 'validated') && (
                        <button onClick={handleRemoveRow} disabled={isLoading || selectedRows.size === 0} className="flex items-center gap-2 px-4 py-2 bg-[#D2691E] text-white rounded-lg hover:bg-[#A55217] transition-colors disabled:opacity-50 text-sm font-medium shadow-sm">
                            <Trash2 className="w-4 h-4" /> Delete Excel Row ({selectedRows.size})
                        </button>
                    )}

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1 mobile-hide"></div>

                    <button onClick={() => handleClearAllDataTrigger('freshUpload')} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium shadow-sm">
                        <FilePlus2 className="w-4 h-4" /> Fresh Upload
                    </button>

                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx" className="hidden" />
                    <button onClick={handleFileSelectTrigger} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm">
                        <Upload className="w-4 h-4" /> Existing Upload
                    </button>

                    {/* Show Validate Button if in Preview or Validated mode (allow re-validate) */}
                    {(mode === 'preview' || mode === 'validated') && (
                        <button onClick={handleValidate} disabled={isLoading || hsnData.length === 0} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm">
                            <ShieldAlert className="w-4 h-4" /> Check Validation
                        </button>
                    )}

                    {/* Show Save Button only if Validated and Safe */}
                    {canSave && (
                        <button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Save
                        </button>
                    )}

                    <button onClick={handleExport} disabled={isLoading || hsnData.length === 0} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>


            {/* Validation Summary - Top Box (Ledger Master Style) */}
            {validationResult && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 m-4 mb-0">
                    <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Validation Summary
                    </h3>
                    <div className="flex flex-row flex-wrap gap-2 text-sm">
                        <div
                            onClick={() => setFilterType('all')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'all' ? 'ring-1 ring-gray-400 dark:ring-gray-500 shadow-sm' : 'hover:opacity-80'} bg-gray-50 dark:bg-[#1e293b] flex flex-col justify-center items-center text-center border border-gray-100 dark:border-gray-700`}
                        >
                            <div className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Total Rows</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white leading-none">{validationResult.summary.totalRows}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('valid')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'valid' ? 'ring-1 ring-green-400 dark:ring-green-500 shadow-sm' : 'hover:opacity-80'} bg-green-50 dark:bg-green-900/10 flex flex-col justify-center items-center text-center border border-green-100 dark:border-green-900/30`}
                        >
                            <div className="text-green-600 dark:text-green-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Valid Rows</div>
                            <div className="text-lg font-bold text-green-700 dark:text-green-300 leading-none">{validationResult.summary.validRows}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('duplicate')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'duplicate' ? 'ring-1 ring-red-400 dark:ring-red-500 shadow-sm' : 'hover:opacity-80'} bg-red-50 dark:bg-red-900/10 flex flex-col justify-center items-center text-center border border-red-100 dark:border-red-900/30`}
                        >
                            <div className="text-red-600 dark:text-red-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Duplicate</div>
                            <div className="text-lg font-bold text-red-700 dark:text-red-300 leading-none">{validationResult.summary.duplicateCount}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('missing')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'missing' ? 'ring-1 ring-blue-400 dark:ring-blue-500 shadow-sm' : 'hover:opacity-80'} bg-blue-50 dark:bg-blue-900/10 flex flex-col justify-center items-center text-center border border-blue-100 dark:border-blue-900/30`}
                        >
                            <div className="text-blue-600 dark:text-blue-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Missing</div>
                            <div className="text-lg font-bold text-blue-700 dark:text-blue-300 leading-none">{validationResult.summary.missingDataCount}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('mismatch')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'mismatch' ? 'ring-1 ring-yellow-400 dark:ring-yellow-500 shadow-sm' : 'hover:opacity-80'} bg-yellow-50 dark:bg-yellow-900/10 flex flex-col justify-center items-center text-center border border-yellow-100 dark:border-yellow-900/30`}
                        >
                            <div className="text-yellow-600 dark:text-yellow-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Mismatch</div>
                            <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300 leading-none">{validationResult.summary.mismatchCount}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('invalid')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'invalid' ? 'ring-1 ring-purple-400 dark:ring-purple-500 shadow-sm' : 'hover:opacity-80'} bg-purple-50 dark:bg-purple-900/10 flex flex-col justify-center items-center text-center border border-purple-100 dark:border-purple-900/30`}
                        >
                            <div className="text-purple-600 dark:text-purple-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Invalid Content</div>
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300 leading-none">{validationResult.summary.invalidContentCount ?? 0}</div>
                        </div>
                    </div>
                </div>
            )}


            {/* Grid */}
            <div className="flex-1 w-full overflow-hidden ag-theme-quartz p-4" style={{ height: '100%' }}>
                {showFileNameError ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-50 dark:bg-red-900/10 rounded-lg border-2 border-dashed border-red-200 dark:border-red-800">
                        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Incorrect File Name</h3>
                        <p className="text-red-600 dark:text-red-300 max-w-md">
                            Please correct your Excel name as <strong>"HSN Master.xlsx"</strong> to proceed with the import.
                        </p>
                    </div>
                ) : (mode === 'loaded' || mode === 'preview' || mode === 'validated') && (
                    <AgGridReact
                        onGridReady={(params) => gridApiRef.current = params.api}
                        rowData={hsnData}
                        columnDefs={columnDefs}
                        rowClassRules={rowClassRules}
                        rowSelection="multiple"
                        onSelectionChanged={() => {
                            const rows = gridApiRef.current?.getSelectedNodes().map(n => n.rowIndex) || [];
                            setSelectedRows(new Set(rows.filter((r): r is number => r !== null)));
                        }}
                        onCellValueChanged={onCellValueChanged}
                        pagination={true}
                        paginationPageSize={20}
                        suppressRowClickSelection={true}
                        isExternalFilterPresent={isExternalFilterPresent}
                        doesExternalFilterPass={doesExternalFilterPass}
                        overlayNoRowsTemplate={`<div class="ag-overlay-no-rows-center">No records found</div>`}
                        gridOptions={{
                            headerHeight: 40,
                            rowHeight: 35,
                        }}
                    />
                )}
            </div>


            {/* Clear Data Modal Flow */}
            {clearFlowStep > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">

                        {/* Header */}
                        <div className="flex items-center gap-3 p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f172a]/50 rounded-t-xl">
                            <div className={`p-2 rounded-lg ${clearFlowStep === 4 ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                {clearFlowStep === 4 ? <ShieldAlert className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {clearFlowStep === 4 ? 'Security Verification' : 'Confirmation Required'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Step {clearFlowStep} of 4
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6">

                            {/* Step 1 */}
                            {clearFlowStep === 1 && (
                                <div className="space-y-4">
                                    <p className="text-gray-600 dark:text-gray-300 font-medium">
                                        Are you sure you want to clear all the HSN Master data?
                                    </p>

                                    {/* CAPTCHA */}
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Security Verification - Solve this:
                                        </label>
                                        <div className="text-2xl font-mono font-bold text-center mb-3 text-blue-600 dark:text-blue-400">
                                            {captchaQuestion.num1} - {captchaQuestion.num2} = ?
                                        </div>
                                        <input
                                            type="number"
                                            value={captchaInput}
                                            onChange={(e) => {
                                                setCaptchaInput(e.target.value);
                                                setCaptchaError(false);
                                            }}
                                            className={`w-full p-2 border-2 rounded-lg text-center text-lg font-mono ${captchaError
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'border-gray-300 dark:border-gray-600 dark:bg-gray-900'
                                                } dark:text-white`}
                                            placeholder="Enter answer"
                                            autoFocus
                                        />
                                        {captchaError && (
                                            <p className="text-red-600 dark:text-red-400 text-sm mt-2">Incorrect answer. Please try again.</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={handleClearCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            No, Cancel
                                        </button>
                                        <button
                                            onClick={handleClearConfirm}
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                        >
                                            Yes, Proceed
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2 */}
                            {clearFlowStep === 2 && (
                                <div className="space-y-4">
                                    <p className="text-gray-600 dark:text-gray-300 font-medium">
                                        Have you discussed with the client that the data needs to be cleared?
                                    </p>

                                    {/* CAPTCHA */}
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Security Verification - Solve this:
                                        </label>
                                        <div className="text-2xl font-mono font-bold text-center mb-3 text-blue-600 dark:text-blue-400">
                                            {captchaQuestion.num1} - {captchaQuestion.num2} = ?
                                        </div>
                                        <input
                                            type="number"
                                            value={captchaInput}
                                            onChange={(e) => {
                                                setCaptchaInput(e.target.value);
                                                setCaptchaError(false);
                                            }}
                                            className={`w-full p-2 border-2 rounded-lg text-center text-lg font-mono ${captchaError
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'border-gray-300 dark:border-gray-600 dark:bg-gray-900'
                                                } dark:text-white`}
                                            placeholder="Enter answer"
                                            autoFocus
                                        />
                                        {captchaError && (
                                            <p className="text-red-600 dark:text-red-400 text-sm mt-2">Incorrect answer. Please try again.</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={handleClearCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            No, Cancel
                                        </button>
                                        <button
                                            onClick={handleClearConfirm}
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                        >
                                            Yes, Discussed
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3 */}
                            {clearFlowStep === 3 && (
                                <div className="space-y-4">
                                    <p className="text-gray-600 dark:text-gray-300 font-medium">
                                        Have you received an email from your client requesting to clear the data?
                                    </p>

                                    {/* CAPTCHA */}
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Security Verification - Solve this:
                                        </label>
                                        <div className="text-2xl font-mono font-bold text-center mb-3 text-blue-600 dark:text-blue-400">
                                            {captchaQuestion.num1} - {captchaQuestion.num2} = ?
                                        </div>
                                        <input
                                            type="number"
                                            value={captchaInput}
                                            onChange={(e) => {
                                                setCaptchaInput(e.target.value);
                                                setCaptchaError(false);
                                            }}
                                            className={`w-full p-2 border-2 rounded-lg text-center text-lg font-mono ${captchaError
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'border-gray-300 dark:border-gray-600 dark:bg-gray-900'
                                                } dark:text-white`}
                                            placeholder="Enter answer"
                                            autoFocus
                                        />
                                        {captchaError && (
                                            <p className="text-red-600 dark:text-red-400 text-sm mt-2">Incorrect answer. Please try again.</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={handleClearCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            No, Cancel
                                        </button>
                                        <button
                                            onClick={handleClearConfirm}
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                        >
                                            Yes, Received
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Login */}
                            {clearFlowStep === 4 && (
                                <form onSubmit={handleCredentialSubmit} className="space-y-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Username</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all dark:text-white"
                                                value={clearCredentials.username}
                                                onChange={e => setClearCredentials({ ...clearCredentials, username: e.target.value })}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Password</label>
                                            <input
                                                type="password"
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all dark:text-white"
                                                value={clearCredentials.password}
                                                onChange={e => setClearCredentials({ ...clearCredentials, password: e.target.value })}

                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Reason for Clearing</label>
                                            <textarea
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all dark:text-white resize-none h-20"
                                                value={clearCredentials.reason}
                                                onChange={e => setClearCredentials({ ...clearCredentials, reason: e.target.value })}
                                                required
                                                placeholder="Please specify why you are clearing this data..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={handleClearCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isLoading ? 'Verifying...' : 'Authenticate & Clear Data'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Re-Upload Confirmation Modal */}
            {showReUploadModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Do you want to Re-upload Excel?
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Uploading a new file will replace the current data. Previous changes will be lost.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowReUploadModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                                >
                                    No
                                </button>
                                <button
                                    onClick={confirmReUpload}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standard Error Popup Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-md w-full p-6 border border-red-100 dark:border-red-900/30 transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Error
                            </h3>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center whitespace-pre-wrap">
                                {errorModalMessage}
                            </div>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation Error Modal */}
            {showValidationModal && validationModalContent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-red-600">Import Errors</h3>
                            <button onClick={() => setShowValidationModal(false)} className="text-gray-500 hover:text-gray-700">×</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <ul className="space-y-2">
                                {validationModalContent.messages.map((msg, i) => (
                                    <li key={i} className="text-sm text-red-600">• {msg}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Mode Switch Confirmation Modal */}
            {showModeSwitchModal && pendingMode && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {pendingMode.type === 'load' ? 'Leave Excel Upload?' : 'Leave Database View?'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {pendingMode.type === 'load'
                                ? 'You have unsaved Excel data. Switching to Database View will discard your current upload.'
                                : 'Switching to Excel Upload will clear the current database view.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowModeSwitchModal(false);
                                    setPendingMode(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    pendingMode.action();
                                    setShowModeSwitchModal(false);
                                    setPendingMode(null);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HSNMasterEnhanced;
