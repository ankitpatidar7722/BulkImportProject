import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ClearSuccessPopup from './ClearSuccessPopup';
import NoDataPopup from './NoDataPopup';
import { Database, Trash2, Upload, Download, CheckCircle2, AlertCircle, FilePlus2, RefreshCw, XCircle, ShieldAlert, Lock } from 'lucide-react';
import { useMessageModal } from './MessageModal';
import DropdownCellRenderer from './DropdownCellRenderer';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    getAllTools,
    softDeleteTool,
    validateTools,
    importTools,
    getToolHSNGroups,
    getToolUnits,
    clearAllToolData,
    getToolCount,
    ToolMasterDto,
    ToolValidationResultDto,
    ToolRowValidation,
    ValidationStatus,
    HSNGroupDto,
    UnitDto,
} from '../services/api';
import { useTheme } from '../context/ThemeContext';

// AG Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, GridApi, RowClassRules, IRowNode } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([AllCommunityModule]);

interface ToolMasterEnhancedProps {
    toolGroupId: number;
    toolGroupName: string;
}

const ToolMasterEnhanced: React.FC<ToolMasterEnhancedProps> = ({ toolGroupId, toolGroupName }) => {
    const { isDark } = useTheme();
    const { showMessage, ModalRenderer } = useMessageModal();

    const [toolData, setToolData] = useState<ToolMasterDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [validationResult, setValidationResult] = useState<ToolValidationResultDto | null>(null);
    const [mode, setMode] = useState<'idle' | 'loaded' | 'preview' | 'validated'>('idle');
    const [filterType, setFilterType] = useState<'all' | 'valid' | 'duplicate' | 'missing' | 'mismatch' | 'invalid'>('all');
    const [hsnGroups, setHsnGroups] = useState<HSNGroupDto[]>([]);
    const [units, setUnits] = useState<UnitDto[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingMode, setPendingMode] = useState<{ type: 'load' | 'upload'; action: () => void } | null>(null);
    const [showModeSwitchModal, setShowModeSwitchModal] = useState(false);

    // Clear Data Flow State
    const [clearFlowStep, setClearFlowStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [clearCredentials, setClearCredentials] = useState({ username: '', password: '', reason: '' });

    // Re-Upload Confirmation State
    const [showReUploadModal, setShowReUploadModal] = useState(false);

    const showError = (message: string) => {
        showMessage('error', 'Error', message);
    };

    // Success Popup State (Import)
    const [successInfo, setSuccessInfo] = useState<{ rowCount: number; groupName: string } | null>(null);

    // Clear Success Popup State
    const [clearSuccessInfo, setClearSuccessInfo] = useState<{ rowCount: number; groupName: string } | null>(null);

    // No Data Popup State (clearOnly when DB has 0 records)
    const [noDataPopupGroup, setNoDataPopupGroup] = useState<string | null>(null);

    // CAPTCHA State
    const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState(false);

    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 50) + 20;
        const num2 = Math.floor(Math.random() * 30) + 10;
        setCaptchaQuestion({ num1, num2, answer: num1 - num2 });
        setCaptchaInput('');
        setCaptchaError(false);
    };

    // Validation Modal State
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationModalContent, setValidationModalContent] = useState<{ title: string; messages: string[] } | null>(null);
    const [filenameError, setFilenameError] = useState<string | null>(null);
    const [clearActionType, setClearActionType] = useState<'clearOnly' | 'freshUpload'>('freshUpload');
    const [noDataMessage, setNoDataMessage] = useState<string | null>(null);

    const handleClearAllDataTrigger = async (type: 'clearOnly' | 'freshUpload') => {
        setClearActionType(type);

        if (type === 'clearOnly') {
            // ✅ Conditional: check DB record count first
            setIsLoading(true);
            const count = await getToolCount(toolGroupId);
            setIsLoading(false);

            if (count === 0) {
                // No data → show no-data popup, skip all confirmations
                setNoDataPopupGroup(`${toolGroupName} Tool Group`);
                return;
            }
            // Data exists → start full confirmation flow
        }
        // Fresh Upload: always start confirmation flow immediately (no DB check)
        setClearFlowStep(1);
        generateCaptcha();
    };

    const handleClearConfirm = () => {
        const userAnswer = parseInt(captchaInput);
        if (isNaN(userAnswer) || userAnswer !== captchaQuestion.answer) {
            setCaptchaError(true);
            showMessage('error', 'Incorrect Answer', 'The CAPTCHA answer you entered is incorrect. Please try again.');
            return;
        }
        if (clearFlowStep < 3) {
            setClearFlowStep((prev) => (prev + 1) as any);
            generateCaptcha();
        } else {
            setClearFlowStep(4);
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
            let deletedCount = 0;
            try {
                const response = await clearAllToolData(clearCredentials.username, clearCredentials.password, clearCredentials.reason, toolGroupId);
                deletedCount = response.deletedCount || 0;
            } catch (clearError: any) {
                if (clearError?.response?.status === 401 || clearError?.response?.status === 403) {
                    throw clearError;
                }
                deletedCount = 0;
            }

            if (deletedCount > 0 && clearActionType === 'clearOnly') {
                setClearSuccessInfo({ rowCount: deletedCount, groupName: `${toolGroupName} Tool Group` });
            } else if (deletedCount === 0 && clearActionType === 'clearOnly') {
                showMessage('info', 'No Data Found', `No existing data was found in the database for the ${toolGroupName} Tool Group. Nothing was cleared.`);
            }
            setToolData([]);
            setValidationResult(null);
            setMode('idle');

            if (clearActionType === 'freshUpload' && fileInputRef.current) {
                setIsLoading(false);
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            } else {
                setIsLoading(false);
            }

            handleClearCancel();
        } catch (error: any) {
            showMessage('error', 'Clear Data Failed', error.response?.data?.message || 'Unable to clear data. Please verify your credentials and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [hsnData, unitData] = await Promise.all([
                    getToolHSNGroups(),
                    getToolUnits()
                ]);
                setHsnGroups(hsnData);
                setUnits(unitData);
            } catch (error) {
                console.error('Failed to load lookup data', error);
            }
        };
        fetchLookups();
    }, []);

    // Reset state when Tool Group changes
    useEffect(() => {
        setToolData([]);
        setMode('idle');
        setValidationResult(null);
        setSelectedRows(new Set());
        setFilterType('all');
        setShowValidationModal(false);
        setValidationModalContent(null);
        setFilenameError(null);
        setClearFlowStep(0);
        setClearCredentials({ username: '', password: '', reason: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [toolGroupId, toolGroupName]);

    // Validation Map for O(1) lookup
    const validationMap = useMemo(() => {
        if (!validationResult) return new Map<number, ToolRowValidation>();
        const map = new Map<number, ToolRowValidation>();
        validationResult.rows.forEach((row: ToolRowValidation) => {
            if (typeof row.rowIndex === 'number') map.set(row.rowIndex, row);
        });
        return map;
    }, [validationResult]);

    // AG Grid Setup
    const gridApiRef = useRef<GridApi | null>(null);

    const columnDefs: ColDef[] = useMemo(() => {
        return [
            {
                field: 'checkbox', headerName: '', checkboxSelection: true,
                headerCheckboxSelection: true, headerCheckboxSelectionFilteredOnly: true,
                width: 20, pinned: 'left', lockPosition: false, resizable: false, suppressMenu: true
            },
            {
                headerName: '#', valueGetter: "node.rowIndex + 1",
                width: 30, pinned: 'left', lockPosition: false, resizable: true, suppressMenu: true
            },
            { field: 'sizeL', headerName: 'SizeL', minWidth: 80 },
            { field: 'sizeW', headerName: 'SizeW', minWidth: 80 },
            { field: 'sizeH', headerName: 'SizeH', minWidth: 80 },
            { field: 'upsAround', headerName: 'UpsAround', minWidth: 100 },
            { field: 'upsAcross', headerName: 'UpsAcross', minWidth: 100 },
            { field: 'totalUps', headerName: 'TotalUps', minWidth: 90 },
            {
                field: 'purchaseUnit', headerName: 'PurchaseUnit', minWidth: 120,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: { values: units.map(u => u.unitSymbol) },
                cellRenderer: DropdownCellRenderer
            },
            { field: 'purchaseRate', headerName: 'PurchaseRate', minWidth: 110 },
            { field: 'manufacturerItemCode', headerName: 'ManufecturerItemCode', minWidth: 170 },
            { field: 'purchaseOrderQuantity', headerName: 'PurchaseOrderQuantity', minWidth: 170 },
            { field: 'shelfLife', headerName: 'ShelfLife', minWidth: 90 },
            {
                field: 'stockUnit', headerName: 'StockUnit', minWidth: 100,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: { values: units.map(u => u.unitSymbol) },
                cellRenderer: DropdownCellRenderer
            },
            { field: 'minimumStockQty', headerName: 'MinimumStockQty', minWidth: 140 },
            {
                field: 'isStandardItem', headerName: 'IsStandardItem', minWidth: 120,
                valueGetter: (params: any) => {
                    const val = params.data?.isStandardItem;
                    if (val === true || val === 'TRUE') return 'TRUE';
                    if (val === false || val === 'FALSE') return 'FALSE';
                    return val;
                },
                cellStyle: (params: any): Record<string, string> | null => {
                    const val = params.data?.isStandardItem;
                    if (val !== true && val !== false && val !== 'TRUE' && val !== 'FALSE') {
                        return { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.2)' : '#f3e8ff', color: isDark ? '#e9d5ff' : '#581c87' };
                    }
                    return null;
                },
                tooltipValueGetter: (params: any) => {
                    const val = params.data?.isStandardItem;
                    if (val !== true && val !== false && val !== 'TRUE' && val !== 'FALSE') {
                        return `Invalid boolean value. Only 'true' or 'false' (case-insensitive) are accepted.`;
                    }
                    return null;
                }
            },
            {
                field: 'isRegularItem', headerName: 'IsRegularItem', minWidth: 120,
                valueGetter: (params: any) => {
                    const val = params.data?.isRegularItem;
                    if (val === true || val === 'TRUE') return 'TRUE';
                    if (val === false || val === 'FALSE') return 'FALSE';
                    return val;
                },
                cellStyle: (params: any): Record<string, string> | null => {
                    const val = params.data?.isRegularItem;
                    if (val !== true && val !== false && val !== 'TRUE' && val !== 'FALSE') {
                        return { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.2)' : '#f3e8ff', color: isDark ? '#e9d5ff' : '#581c87' };
                    }
                    return null;
                },
                tooltipValueGetter: (params: any) => {
                    const val = params.data?.isRegularItem;
                    if (val !== true && val !== false && val !== 'TRUE' && val !== 'FALSE') {
                        return `Invalid boolean value. Only 'true' or 'false' (case-insensitive) are accepted.`;
                    }
                    return null;
                }
            },
            {
                field: 'productHSNName', headerName: 'ProductHSNName', minWidth: 160,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: { values: hsnGroups.map(h => h.displayName) },
                cellRenderer: DropdownCellRenderer
            },
        ];
    }, [units, hsnGroups]);

    // Helper: find matching CellValidation for a column
    const findToolCellValidation = useCallback((rowValidation: ToolRowValidation | undefined, colField: string | undefined, colHeader: string | undefined) => {
        if (!rowValidation?.cellValidations || rowValidation.cellValidations.length === 0) return null;
        let cellVal = rowValidation.cellValidations.find((cv: any) => cv.columnName === colHeader);
        if (!cellVal && colField) {
            cellVal = rowValidation.cellValidations.find((cv: any) =>
                cv.columnName?.toLowerCase() === colField.toLowerCase()
            );
        }
        if (!cellVal && colHeader) {
            cellVal = rowValidation.cellValidations.find((cv: any) =>
                cv.columnName?.toLowerCase() === colHeader.toLowerCase()
            );
        }
        return cellVal || null;
    }, []);

    const defaultColDef = useMemo(() => {
        return {
            editable: () => mode === 'preview' || mode === 'validated',
            sortable: true, filter: true, resizable: true, minWidth: 50,
            tooltipValueGetter: (params: any) => {
                const rowIndex = toolData.indexOf(params.data);
                if (rowIndex === -1) return null;
                const rowValidation = validationMap.get(rowIndex);
                if (!rowValidation) return null;
                const cellVal = findToolCellValidation(rowValidation, params.colDef.field, params.colDef.headerName);
                if (cellVal) return cellVal.validationMessage;
                if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
                    return rowValidation.errorMessage || 'Duplicate row detected';
                }
                return null;
            },
            cellStyle: (params: any): Record<string, string> | null => {
                const rowIndex = toolData.indexOf(params.data);
                if (rowIndex === -1) return null;

                const colors = {
                    duplicate: isDark ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2',
                    missing: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe',
                    mismatch: isDark ? 'rgba(202, 138, 4, 0.2)' : '#fef9c3',
                    invalid: isDark ? 'rgba(147, 51, 234, 0.2)' : '#f3e8ff'
                };

                const rowValidation = validationMap.get(rowIndex);

                if (rowValidation?.rowStatus === ValidationStatus.Duplicate) {
                    return { backgroundColor: colors.duplicate };
                }

                const cellVal = findToolCellValidation(rowValidation, params.colDef.field, params.colDef.headerName);
                if (cellVal) {
                    if (cellVal.status === ValidationStatus.MissingData) return { backgroundColor: colors.missing };
                    if (cellVal.status === ValidationStatus.Mismatch) return { backgroundColor: colors.mismatch };
                    if (cellVal.status === ValidationStatus.InvalidContent) {
                        return {
                            backgroundColor: colors.invalid,
                            borderBottom: '2px solid #9333ea',
                            borderRight: '2px solid #9333ea'
                        };
                    }
                }
                return null;
            }
        };
    }, [mode, validationMap, isDark, toolData, findToolCellValidation]);

    const onCellValueChanged = useCallback((params: any) => {
        const { colDef, newValue, data } = params;
        const rowIndex = toolData.indexOf(data);
        if (rowIndex === -1) return;
        setToolData(prevData => {
            const newData = [...prevData];
            newData[rowIndex] = { ...newData[rowIndex], [colDef.field as keyof ToolMasterDto]: newValue };
            return newData;
        });
    }, [toolData]);

    const onSelectionChanged = useCallback((event: any) => {
        const selectedNodes = event.api.getSelectedNodes();
        setSelectedRows(new Set<number>(selectedNodes.map((node: any) => node.rowIndex)));
    }, []);

    const rowClassRules = useMemo<RowClassRules>(() => ({
        'bg-red-50 dark:bg-red-900/10': (params) => {
            if (validationMap.size === 0) return false;
            const rowIndex = toolData.indexOf(params.data);
            if (rowIndex === -1) return false;
            return validationMap.get(rowIndex)?.rowStatus === ValidationStatus.Duplicate;
        },
        'font-medium': (params) => {
            if (validationMap.size === 0) return false;
            const rowIndex = toolData.indexOf(params.data);
            if (rowIndex === -1) return false;
            return validationMap.get(rowIndex)?.rowStatus === ValidationStatus.Duplicate;
        }
    }), [validationMap, toolData]);

    const onGridReady = (params: any) => { gridApiRef.current = params.api; };

    const isExternalFilterPresent = useCallback(() => filterType !== 'all', [filterType]);

    const doesExternalFilterPass = useCallback((node: IRowNode) => {
        if (!validationResult || filterType === 'all') return true;
        const rowIndex = toolData.indexOf(node.data);
        if (rowIndex === -1) return true;
        const rowValidation = validationMap.get(rowIndex);
        if (!rowValidation) return false;
        switch (filterType) {
            case 'valid': return rowValidation.rowStatus === ValidationStatus.Valid;
            case 'duplicate': return rowValidation.rowStatus === ValidationStatus.Duplicate;
            // Check cellValidations so duplicate rows with missing/mismatch/invalid also appear in those sections
            case 'missing': return rowValidation.cellValidations?.some((cv: any) => cv.status === ValidationStatus.MissingData) ?? false;
            case 'mismatch': return rowValidation.cellValidations?.some((cv: any) => cv.status === ValidationStatus.Mismatch) ?? false;
            case 'invalid': return rowValidation.cellValidations?.some((cv: any) => cv.status === ValidationStatus.InvalidContent) ?? false;
            default: return true;
        }
    }, [validationResult, validationMap, filterType, toolData]);

    useEffect(() => {
        if (gridApiRef.current) gridApiRef.current.redrawRows();
    }, [validationResult, toolData, validationMap]);

    useEffect(() => {
        if (gridApiRef.current) gridApiRef.current.onFilterChanged();
    }, [filterType]);

    // Load Data
    const handleLoadData = async () => {
        if (mode === 'preview' || mode === 'validated') {
            setPendingMode({ type: 'load', action: () => performLoadData() });
            setShowModeSwitchModal(true);
            return;
        }
        performLoadData();
    };

    const performLoadData = async () => {
        setIsLoading(true);
        try {
            const data = await getAllTools(toolGroupId);
            setToolData(data);
            setMode(data.length > 0 ? 'loaded' : 'idle');
            setValidationResult(null);
            setSelectedRows(new Set());
            if (data.length === 0) {
                setNoDataMessage(`No data found in database against the selected ${toolGroupName}`);
            } else {
                showMessage('success', 'Data Loaded', `Successfully loaded ${data.length} tool record(s) for the ${toolGroupName} group.`);
            }
        } catch (error: any) {
            showError(error?.response?.data?.error || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelectTrigger = () => {
        if (mode === 'loaded') {
            setPendingMode({
                type: 'upload',
                action: () => {
                    setToolData([]);
                    setMode('idle');
                    setValidationResult(null);
                    setSelectedRows(new Set());
                    if (fileInputRef.current) fileInputRef.current.click();
                }
            });
            setShowModeSwitchModal(true);
            return;
        }

        if (toolData.length > 0 && (mode === 'preview' || mode === 'validated')) {
            setShowReUploadModal(true);
            return;
        }

        if (fileInputRef.current) fileInputRef.current.click();
    };

    const confirmReUpload = () => {
        setShowReUploadModal(false);
        setToolData([]);
        setValidationResult(null);
        setMode('idle');
        setSelectedRows(new Set());
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleRemoveRow = async () => {
        const selectedNodes = gridApiRef.current?.getSelectedNodes() || [];
        if (selectedNodes.length === 0) {
            showError('Please select at least one row to remove');
            return;
        }

        if (!window.confirm(`Are you sure you want to remove ${selectedNodes.length} tool(s)?`)) return;

        const selectedData = selectedNodes.map(node => node.data);
        const selectedIndices = new Set(selectedData.map(d => toolData.indexOf(d)).filter(i => i !== -1));

        if (mode === 'preview' || mode === 'validated') {
            const newToolData = toolData.filter((_, index) => !selectedIndices.has(index));
            setToolData(newToolData);
            setValidationResult(null);
            setMode('preview');
            showMessage('info', 'Rows Removed', `${selectedIndices.size} row(s) have been removed from the preview. Please re-run validation before importing.`);
            return;
        }

        setIsLoading(true);
        try {
            let deletedCount = 0;
            for (const tool of selectedData) {
                if (tool.toolID) {
                    await softDeleteTool(tool.toolID);
                    deletedCount++;
                }
            }
            if (deletedCount > 0) {
                showMessage('success', 'Records Deleted', `${deletedCount} tool record(s) have been successfully removed from the database.`);
                await handleLoadData();
            } else {
                showMessage('warning', 'Nothing Deleted', 'No database records were found for deletion. Please select rows that exist in the database.');
            }
        } catch (error: any) {
            showError(error?.response?.data?.error || 'Failed to remove tools');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const expectedFilename = `${toolGroupName}.xlsx`;
        if (file.name !== expectedFilename) {
            setFilenameError(`Please correct your Excel file name according to the selected Tool Group. Expected: ${expectedFilename}`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const toStr = (v: any) => (v !== undefined && v !== null && v !== '') ? String(v) : undefined;

                const tools: ToolMasterDto[] = jsonData.map((row: any) => {
                    let upsAround = row.UpsAround;
                    let upsAcross = row.UpsAcross;
                    let totalUps = row.TotalUps;

                    // Auto-calc TotalUps
                    if (!totalUps && upsAround && upsAcross) {
                        const ua = parseInt(upsAround);
                        const uc = parseInt(upsAcross);
                        if (!isNaN(ua) && !isNaN(uc)) totalUps = ua * uc;
                    }

                    // ShelfLife default 365
                    let shelfLife = row.ShelfLife;
                    if (shelfLife === undefined || shelfLife === null || shelfLife === '') shelfLife = 365;

                    // Strict boolean validation: normalize to uppercase TRUE/FALSE
                    let isStandardItem: any = 'TRUE';
                    if (row.IsStandardItem !== undefined && row.IsStandardItem !== null && row.IsStandardItem !== '') {
                        const val = String(row.IsStandardItem).trim().toLowerCase();
                        if (val === 'true') {
                            isStandardItem = 'TRUE';
                        } else if (val === 'false') {
                            isStandardItem = 'FALSE';
                        } else {
                            isStandardItem = row.IsStandardItem; // Invalid value, keep for validation
                        }
                    }

                    let isRegularItem: any = 'TRUE';
                    if (row.IsRegularItem !== undefined && row.IsRegularItem !== null && row.IsRegularItem !== '') {
                        const val = String(row.IsRegularItem).trim().toLowerCase();
                        if (val === 'true') {
                            isRegularItem = 'TRUE';
                        } else if (val === 'false') {
                            isRegularItem = 'FALSE';
                        } else {
                            isRegularItem = row.IsRegularItem; // Invalid value, keep for validation
                        }
                    }

                    return {
                        toolGroupID: toolGroupId,
                        toolType: toolGroupName, // Auto-insert ToolType = ToolGroupName
                        sizeL: row.SizeL !== undefined && row.SizeL !== '' && !isNaN(parseFloat(row.SizeL)) ? parseFloat(row.SizeL) : undefined,
                        sizeW: row.SizeW !== undefined && row.SizeW !== '' && !isNaN(parseFloat(row.SizeW)) ? parseFloat(row.SizeW) : undefined,
                        sizeH: row.SizeH !== undefined && row.SizeH !== '' && !isNaN(parseFloat(row.SizeH)) ? parseFloat(row.SizeH) : undefined,
                        upsAround: upsAround !== undefined && upsAround !== '' && !isNaN(parseInt(upsAround)) ? parseInt(upsAround) : undefined,
                        upsAcross: upsAcross !== undefined && upsAcross !== '' && !isNaN(parseInt(upsAcross)) ? parseInt(upsAcross) : undefined,
                        totalUps: totalUps !== undefined && totalUps !== '' && !isNaN(parseInt(totalUps)) ? parseInt(totalUps) : undefined,
                        purchaseUnit: toStr(row.PurchaseUnit),
                        purchaseRate: row.PurchaseRate !== undefined && row.PurchaseRate !== '' && !isNaN(parseFloat(row.PurchaseRate)) ? parseFloat(row.PurchaseRate) : undefined,
                        manufacturerItemCode: toStr(row.ManufecturerItemCode),
                        purchaseOrderQuantity: row.PurchaseOrderQuantity !== undefined && row.PurchaseOrderQuantity !== '' && !isNaN(parseFloat(row.PurchaseOrderQuantity)) ? parseFloat(row.PurchaseOrderQuantity) : undefined,
                        shelfLife: shelfLife !== undefined && shelfLife !== '' && !isNaN(parseInt(shelfLife)) ? parseInt(shelfLife) : 365,
                        stockUnit: toStr(row.StockUnit),
                        minimumStockQty: row.MinimumStockQty !== undefined && row.MinimumStockQty !== '' && !isNaN(parseFloat(row.MinimumStockQty)) ? parseFloat(row.MinimumStockQty) : undefined,
                        isStandardItem,
                        isRegularItem,
                        productHSNName: toStr(row.ProductHSNName),
                    };
                }).filter((item: ToolMasterDto) => {
                    return !!(
                        item.sizeL || item.sizeW || item.sizeH || item.purchaseUnit ||
                        item.purchaseRate || item.manufacturerItemCode || item.stockUnit ||
                        item.productHSNName || item.upsAround || item.upsAcross
                    );
                });

                setToolData(tools);
                setMode('preview');
                showMessage('success', 'File Loaded', `Successfully loaded ${tools.length} row(s) from the Excel file. Please click "Check Validation" before importing.`);
            } catch (error) {
                showError('Failed to parse Excel file');
                console.error(error);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Clean tool data for API — extracts invalid numeric/bool values into rawValues
    const cleanToolDataForApi = useCallback((data: any[]) => {
        const numericFields = new Set(['sizeL', 'sizeW', 'sizeH', 'purchaseRate', 'purchaseOrderQuantity', 'minimumStockQty']);
        const intFields = new Set(['upsAround', 'upsAcross', 'totalUps', 'shelfLife']);
        const boolFields = new Set(['isStandardItem', 'isRegularItem']);

        return data.map(item => {
            const cleaned: any = {};
            const rawValues: Record<string, string> = {};

            Object.keys(item).forEach(key => {
                const value = item[key];
                if (value === undefined || value === null || value === '') return;

                if (numericFields.has(key)) {
                    const strVal = String(value).trim();
                    if (strVal === '') return;
                    if (!isNaN(Number(strVal))) {
                        cleaned[key] = Number(strVal);
                    } else {
                        rawValues[key] = strVal;
                    }
                } else if (intFields.has(key)) {
                    const strVal = String(value).trim();
                    if (strVal === '') return;
                    if (!isNaN(Number(strVal)) && Number.isInteger(Number(strVal))) {
                        cleaned[key] = parseInt(strVal);
                    } else {
                        rawValues[key] = strVal;
                    }
                } else if (boolFields.has(key)) {
                    const strVal = String(value).trim();
                    // Only accept uppercase TRUE or FALSE (already normalized from Excel)
                    if (strVal === 'TRUE') {
                        cleaned[key] = true;
                    } else if (strVal === 'FALSE') {
                        cleaned[key] = false;
                    } else {
                        // Invalid boolean value - send to rawValues for purple highlighting
                        rawValues[key] = strVal;
                    }
                } else {
                    cleaned[key] = typeof value === 'number' ? String(value) : value;
                }
            });

            if (Object.keys(rawValues).length > 0) cleaned.rawValues = rawValues;
            return cleaned;
        });
    }, []);

    const handleCheckValidation = async () => {
        if (toolData.length === 0) { showError('No data to validate'); return; }

        setIsLoading(true);
        setValidationResult(null);

        try {
            const cleanedData = cleanToolDataForApi(toolData);
            const result = await validateTools(cleanedData, toolGroupId);
            setValidationResult(result);
            setMode('validated');

            if (result.isValid) {
                showMessage('success', 'Validation Passed', 'All records passed validation successfully. The data is ready to be imported.');
            } else {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount;

                const columnFailures = new Map<string, Set<string>>();

                result.rows.forEach((row: ToolRowValidation) => {
                    if (row.rowStatus === ValidationStatus.Duplicate) {
                        const col = 'SizeL/SizeW';
                        if (!columnFailures.has(col)) columnFailures.set(col, new Set());
                        columnFailures.get(col)!.add('Duplicate data found');
                    }
                    if (row.cellValidations && row.cellValidations.length > 0) {
                        row.cellValidations.forEach((cell: any) => {
                            const col = cell.columnName || 'Unknown';
                            if (!columnFailures.has(col)) columnFailures.set(col, new Set());
                            let reason = cell.validationMessage;
                            if (cell.status === ValidationStatus.MissingData) reason = 'Missing data';
                            else if (cell.status === ValidationStatus.Mismatch) reason = 'Mismatch with Master';
                            else if (cell.status === ValidationStatus.InvalidContent) reason = "Single quote (') and double quote (\") are not allowed.";
                            columnFailures.get(col)!.add(reason);
                        });
                    }
                });

                const messages: string[] = [];
                columnFailures.forEach((reasons, col) => {
                    messages.push(`${col} – ${Array.from(reasons).join(', ')}`);
                });

                setValidationModalContent({
                    title: `Validation Failed: ${totalIssues} Issue${totalIssues !== 1 ? 's' : ''} Found`,
                    messages: messages.length > 0 ? messages : ['Please review the grid for specific issues.']
                });
                setShowValidationModal(true);
            }
        } catch (error: any) {
            showError(error?.response?.data?.error || 'Validation failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (toolData.length === 0) { showError('No data to import'); return; }

        setIsLoading(true);
        // Clear old validation errors to prevent showing stale messages after successful import
        setValidationModalContent(null);

        try {
            const cleanedForValidation = cleanToolDataForApi(toolData);
            const result = await validateTools(cleanedForValidation, toolGroupId);
            setValidationResult(result);

            if (!result.isValid) {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount;
                const columnFailures = new Map<string, Set<string>>();
                result.rows.forEach((row: ToolRowValidation) => {
                    if (row.rowStatus === ValidationStatus.Duplicate) {
                        const col = 'SizeL/SizeW';
                        if (!columnFailures.has(col)) columnFailures.set(col, new Set());
                        columnFailures.get(col)!.add('Duplicate data found');
                    }
                    if (row.cellValidations && row.cellValidations.length > 0) {
                        row.cellValidations.forEach((cell: any) => {
                            const col = cell.columnName || 'Unknown';
                            if (!columnFailures.has(col)) columnFailures.set(col, new Set());
                            let reason = cell.validationMessage;
                            if (cell.status === ValidationStatus.MissingData) reason = 'Missing data';
                            else if (cell.status === ValidationStatus.Mismatch) reason = 'Mismatch with Master';
                            else if (cell.status === ValidationStatus.InvalidContent) reason = "Single quote (') and double quote (\") are not allowed.";
                            columnFailures.get(col)!.add(reason);
                        });
                    }
                });
                const messages: string[] = [];
                columnFailures.forEach((reasons, col) => messages.push(`${col} – ${Array.from(reasons).join(', ')}`));
                setValidationModalContent({
                    title: `Validation Failed: ${totalIssues} Issue${totalIssues !== 1 ? 's' : ''} Found`,
                    messages: messages.length > 0 ? messages : ['Please review the grid for specific issues.']
                });
                setShowValidationModal(true);
                showError('Validation failed. Please correct highlighted errors before saving.');
                return;
            }

            const cleanedForImport = cleanToolDataForApi(toolData);
            const importRes = await importTools(cleanedForImport, toolGroupId);

            if (importRes.success) {
                setSuccessInfo({ rowCount: importRes.importedRows ?? toolData.length, groupName: toolGroupName });

                // If some rows failed, also show failed rows list after success popup
                if (importRes.errorRows > 0 && importRes.errorMessages && importRes.errorMessages.length > 0) {
                    setValidationModalContent({
                        title: `${importRes.errorRows} Row(s) Failed During Import`,
                        messages: importRes.errorMessages
                    });
                }
            } else {
                if (importRes.errorMessages && importRes.errorMessages.length > 0) {
                    setValidationModalContent({ title: 'Import Failed', messages: importRes.errorMessages });
                    setShowValidationModal(true);
                } else {
                    showError(importRes.message || 'Import failed');
                }
            }
        } catch (error: any) {
            showError(error?.response?.data?.error || 'Import failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        if (toolData.length === 0) { showError('No data to export'); return; }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(toolGroupName || 'Sheet1');

        const exportColumns = [
            'SizeL', 'SizeW', 'SizeH', 'UpsAround', 'UpsAcross', 'TotalUps',
            'PurchaseUnit', 'PurchaseRate', 'ManufecturerItemCode', 'PurchaseOrderQuantity',
            'ShelfLife', 'StockUnit', 'MinimumStockQty', 'IsStandardItem', 'IsRegularItem', 'ProductHSNName'
        ];

        worksheet.columns = exportColumns.map(col => ({ header: col, key: col, width: 20 }));
        worksheet.getRow(1).font = { bold: true };

        toolData.forEach((tool) => {
            worksheet.addRow({
                SizeL: tool.sizeL,
                SizeW: tool.sizeW,
                SizeH: tool.sizeH,
                UpsAround: tool.upsAround,
                UpsAcross: tool.upsAcross,
                TotalUps: tool.totalUps,
                PurchaseUnit: tool.purchaseUnit,
                PurchaseRate: tool.purchaseRate,
                ManufecturerItemCode: tool.manufacturerItemCode,
                PurchaseOrderQuantity: tool.purchaseOrderQuantity,
                ShelfLife: tool.shelfLife,
                StockUnit: tool.stockUnit,
                MinimumStockQty: tool.minimumStockQty,
                IsStandardItem: tool.isStandardItem,
                IsRegularItem: tool.isRegularItem,
                ProductHSNName: tool.productHSNName,
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${toolGroupName}.xlsx`);
        showMessage('success', 'Export Complete', 'The data has been exported to an Excel file and downloaded successfully.');
    };

    return (
        <div className="space-y-4">
            {/* Success Popup Modal */}
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
                                {successInfo.rowCount === 1 ? 'row' : 'rows'} into <span className="font-semibold text-gray-800 dark:text-white">{successInfo.groupName} Tool Group</span>
                            </p>
                            <button
                                onClick={() => {
                                    setSuccessInfo(null);
                                    setToolData([]);
                                    setValidationResult(null);
                                    setMode('idle');
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                    // Show failed rows list if any rows failed during import
                                    if (validationModalContent && validationModalContent.title.includes('Failed During Import')) {
                                        setShowValidationModal(true);
                                    }
                                }}
                                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 active:scale-95 shadow-md shadow-green-200 dark:shadow-green-900/30"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🗑️ Clear All Data Success Popup */}
            {clearSuccessInfo && (
                <ClearSuccessPopup
                    rowCount={clearSuccessInfo.rowCount}
                    groupName={clearSuccessInfo.groupName}
                    onClose={() => {
                        setClearSuccessInfo(null);
                        setToolData([]);
                        setValidationResult(null);
                        setMode('idle');
                        setFilterType('all');
                        setSelectedRows(new Set());
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                />
            )}

            {/* ⚠️ No Data Found Popup (clearOnly when DB has 0 records) */}
            {noDataPopupGroup && (
                <NoDataPopup
                    groupName={noDataPopupGroup}
                    onClose={() => setNoDataPopupGroup(null)}
                />
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                <button onClick={handleLoadData} disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                    <Database className="w-4 h-4" /> Load Data
                </button>

                <button onClick={() => handleClearAllDataTrigger('clearOnly')}
                    disabled={isLoading || selectedRows.size > 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                    <XCircle className="w-4 h-4" /> Clear All Data
                </button>

                {mode === 'loaded' ? (
                    <button onClick={handleRemoveRow} disabled={isLoading || selectedRows.size === 0}
                        className="px-4 py-2 bg-[#D2691E] text-white rounded-lg hover:bg-[#A55217] disabled:opacity-50 flex items-center gap-2 transition-colors">
                        <Trash2 className="w-4 h-4" /> Soft Delete ({selectedRows.size})
                    </button>
                ) : (mode === 'preview' || mode === 'validated') && (
                    <button onClick={handleRemoveRow} disabled={isLoading || selectedRows.size === 0}
                        className="px-4 py-2 bg-[#D2691E] text-white rounded-lg hover:bg-[#A55217] disabled:opacity-50 flex items-center gap-2 transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete Excel Row ({selectedRows.size})
                    </button>
                )}

                <button onClick={() => handleClearAllDataTrigger('freshUpload')} disabled={isLoading}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                    <FilePlus2 className="w-4 h-4" /> Fresh Upload
                </button>

                <button onClick={handleFileSelectTrigger} disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                    <Upload className="w-4 h-4" /> Existing Upload
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileSelect} className="hidden" />

                {(mode === 'loaded' || mode === 'preview' || mode === 'validated') && (
                    <button onClick={handleExport} disabled={isLoading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" /> Export
                    </button>
                )}

                {(mode === 'preview' || mode === 'validated') && (
                    <button onClick={handleCheckValidation} disabled={isLoading}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                        <CheckCircle2 className="w-4 h-4" /> Check Validation
                    </button>
                )}

                {validationResult?.isValid && (
                    <button onClick={handleImport} disabled={isLoading}
                        className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 flex items-center gap-2 transition-colors animate-pulse">
                        <CheckCircle2 className="w-4 h-4" /> Save Data
                    </button>
                )}
            </div>

            {/* Validation Summary */}
            {validationResult && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" /> Validation Summary
                    </h3>
                    <div className="flex flex-row flex-wrap gap-2 text-sm">
                        <div onClick={() => setFilterType('all')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'all' ? 'ring-1 ring-gray-400 dark:ring-gray-500 shadow-sm' : 'hover:opacity-80'} bg-gray-50 dark:bg-[#1e293b] flex flex-col justify-center items-center text-center border border-gray-100 dark:border-gray-700`}>
                            <div className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Total Rows</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white leading-none">{validationResult.summary.totalRows}</div>
                        </div>
                        <div onClick={() => setFilterType('valid')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'valid' ? 'ring-1 ring-green-400 dark:ring-green-500 shadow-sm' : 'hover:opacity-80'} bg-green-50 dark:bg-green-900/10 flex flex-col justify-center items-center text-center border border-green-100 dark:border-green-900/30`}>
                            <div className="text-green-600 dark:text-green-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Valid Rows</div>
                            <div className="text-lg font-bold text-green-700 dark:text-green-300 leading-none">{validationResult.summary.validRows}</div>
                        </div>
                        <div onClick={() => setFilterType('duplicate')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'duplicate' ? 'ring-1 ring-red-400 dark:ring-red-500 shadow-sm' : 'hover:opacity-80'} bg-red-50 dark:bg-red-900/10 flex flex-col justify-center items-center text-center border border-red-100 dark:border-red-900/30`}>
                            <div className="text-red-600 dark:text-red-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Duplicate</div>
                            <div className="text-lg font-bold text-red-700 dark:text-red-300 leading-none">{validationResult.summary.duplicateCount}</div>
                        </div>
                        <div onClick={() => setFilterType('missing')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'missing' ? 'ring-1 ring-blue-400 dark:ring-blue-500 shadow-sm' : 'hover:opacity-80'} bg-blue-50 dark:bg-blue-900/10 flex flex-col justify-center items-center text-center border border-blue-100 dark:border-blue-900/30`}>
                            <div className="text-blue-600 dark:text-blue-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Missing</div>
                            <div className="text-lg font-bold text-blue-700 dark:text-blue-300 leading-none">{validationResult.summary.missingDataCount}</div>
                        </div>
                        <div onClick={() => setFilterType('mismatch')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'mismatch' ? 'ring-1 ring-yellow-400 dark:ring-yellow-500 shadow-sm' : 'hover:opacity-80'} bg-yellow-50 dark:bg-yellow-900/10 flex flex-col justify-center items-center text-center border border-yellow-100 dark:border-yellow-900/30`}>
                            <div className="text-yellow-600 dark:text-yellow-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Mismatch</div>
                            <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300 leading-none">{validationResult.summary.mismatchCount}</div>
                        </div>
                        <div onClick={() => setFilterType('invalid')}
                            className={`w-32 p-2 rounded-lg cursor-pointer transition-all ${filterType === 'invalid' ? 'ring-1 ring-purple-400 dark:ring-purple-500 shadow-sm' : 'hover:opacity-80'} bg-purple-50 dark:bg-purple-900/10 flex flex-col justify-center items-center text-center border border-purple-100 dark:border-purple-900/30`}>
                            <div className="text-purple-600 dark:text-purple-400 text-[10px] uppercase font-semibold tracking-wider mb-1">Invalid Content</div>
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300 leading-none">{validationResult.summary.invalidContentCount ?? 0}</div>
                        </div>
                    </div>

                    {/* Detailed Invalid Content Errors */}
                    {filterType === 'invalid' && (validationResult.summary.invalidContentCount ?? 0) > 0 && (
                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg max-h-48 overflow-y-auto">
                            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">Invalid Content Details:</h4>
                            <div className="space-y-1">
                                {validationResult.rows
                                    .filter((row: ToolRowValidation) => row.rowStatus === ValidationStatus.InvalidContent)
                                    .flatMap((row: ToolRowValidation) =>
                                        row.cellValidations
                                            .filter((cv: any) => cv.status === ValidationStatus.InvalidContent)
                                            .map((cv: any, idx: number) => (
                                                <div key={`${row.rowIndex}-${idx}`} className="text-sm text-purple-700 dark:text-purple-300 flex items-start gap-2">
                                                    <span className="font-mono text-xs bg-purple-100 dark:bg-purple-800 px-1.5 py-0.5 rounded min-w-[60px] text-center">
                                                        Row {row.rowIndex + 1}
                                                    </span>
                                                    <span>{cv.validationMessage}</span>
                                                </div>
                                            ))
                                    )
                                    .slice(0, 50)
                                }
                                {validationResult.rows
                                    .filter((row: ToolRowValidation) => row.rowStatus === ValidationStatus.InvalidContent)
                                    .reduce((count: number, row: ToolRowValidation) =>
                                        count + row.cellValidations.filter((cv: any) => cv.status === ValidationStatus.InvalidContent).length, 0
                                    ) > 50 && (
                                        <div className="text-xs text-purple-500 dark:text-purple-400 italic mt-1">
                                            ...and more. Hover over purple cells in the grid for individual error details.
                                        </div>
                                    )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Grid Section */}
            {(toolData.length > 0 || mode === 'loaded' || mode === 'validated') && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e293b]">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {mode === 'loaded' ? 'Database Records' : 'Excel Preview'} ({toolData.length} rows)
                        </h3>
                        {(mode === 'preview' || mode === 'validated') && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {validationResult ? 'Edit cells and re-run validation as needed' : 'Click any cell to edit the data directly before validation'}
                            </p>
                        )}
                    </div>

                    <div className={isDark ? "ag-theme-quartz-dark" : "ag-theme-quartz"} style={{ height: 600, width: '100%' }}>
                        <style>{`
                            .ag-theme-quartz, .ag-theme-quartz-dark {
                                --ag-grid-size: 8px; --ag-list-item-height: 40px; --ag-row-height: 48px;
                                --ag-header-height: 52px; --ag-font-size: 14px; --ag-font-family: 'Inter', system-ui, sans-serif;
                                --ag-borders: solid 1px; --ag-row-border-style: solid; --ag-row-border-width: 1px;
                                --ag-header-column-separator-display: block; --ag-header-column-separator-height: 50%;
                                --ag-header-column-separator-width: 1px; --ag-header-column-separator-color: var(--ag-border-color);
                                --ag-header-column-resize-handle-display: block; --ag-header-column-resize-handle-height: 100%;
                                --ag-header-column-resize-handle-width: 2px; --ag-header-column-resize-handle-color: var(--ag-border-color);
                            }
                            .ag-theme-quartz {
                                --ag-background-color: #ffffff; --ag-foreground-color: #0f172a;
                                --ag-header-background-color: #f8fafc; --ag-header-foreground-color: #475569;
                                --ag-border-color: #e2e8f0; --ag-secondary-border-color: #e2e8f0;
                                --ag-row-hover-color: #f8fafc; --ag-selected-row-background-color: rgba(37, 99, 235, 0.1);
                                --ag-checkbox-checked-color: #2563eb;
                            }
                            .ag-theme-quartz-dark {
                                --ag-background-color: #0f172a !important; --ag-foreground-color: #f1f5f9 !important;
                                --ag-header-background-color: #1e293b !important; --ag-header-foreground-color: #cbd5e1 !important;
                                --ag-border-color: #334155 !important; --ag-secondary-border-color: #334155 !important;
                                --ag-row-hover-color: #1e293b !important; --ag-selected-row-background-color: rgba(59, 130, 246, 0.2) !important;
                                --ag-checkbox-checked-color: #3b82f6 !important; color-scheme: dark;
                            }
                            .ag-theme-quartz-dark .ag-root-wrapper { background-color: #0f172a !important; }
                            .ag-theme-quartz-dark .ag-body-viewport, .ag-theme-quartz-dark .ag-body-horizontal-scroll-viewport,
                            .ag-theme-quartz-dark .ag-center-cols-viewport { background-color: #0f172a !important; }
                            .ag-theme-quartz-dark .ag-row { background-color: #0f172a !important; color: #f1f5f9 !important; }
                            .ag-theme-quartz-dark .ag-row-odd, .ag-theme-quartz-dark .ag-row-even { background-color: #0f172a !important; }
                            .ag-theme-quartz-dark .ag-cell { color: #f1f5f9 !important; }
                            .ag-theme-quartz-dark .ag-header { background-color: #1e293b !important; }
                            .ag-theme-quartz-dark .ag-header-cell { background-color: #1e293b !important; color: #cbd5e1 !important; }
                            .ag-header-cell { border-right: 1px solid var(--ag-border-color); }
                            .ag-header-cell-text { font-weight: 600; }
                            .ag-pinned-left-header, .ag-pinned-left-cols-container {
                                box-shadow: 4px 0 8px -4px rgba(0,0,0,0.2); border-right: 1px solid var(--ag-border-color); z-index: 10 !important;
                            }
                            .ag-overlay-no-rows-center { display: flex; justify-content: center; align-items: center; height: 100%;
                                font-size: 1.125rem; color: #64748b; font-weight: 500; }
                            .ag-theme-quartz-dark .ag-overlay-no-rows-center { color: #94a3b8; }
                        `}</style>
                        <AgGridReact
                            rowData={toolData}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            onGridReady={onGridReady}
                            rowSelection="multiple"
                            onSelectionChanged={onSelectionChanged}
                            onCellValueChanged={onCellValueChanged}
                            rowClassRules={rowClassRules}
                            isExternalFilterPresent={isExternalFilterPresent}
                            doesExternalFilterPass={doesExternalFilterPass}
                            pagination={true}
                            paginationPageSize={1000}
                            paginationPageSizeSelector={[1000, 2000, 5000]}
                            enableCellTextSelection={true}
                            ensureDomOrder={true}
                            tooltipShowDelay={300}
                            tooltipInteraction={true}
                            overlayNoRowsTemplate={`<div class="ag-overlay-no-rows-center">No records found</div>`}
                        />
                    </div>
                </div>
            )}

            {toolData.length === 0 && mode === 'idle' && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <Database className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Data Loaded</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Load data from database or import from Excel file</p>
                </div>
            )}

            {/* Clear Data Flow Modals */}
            {clearFlowStep > 0 && clearFlowStep < 4 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                            <ShieldAlert className="w-8 h-8" />
                            <h3 className="text-lg font-bold">Confirmation Required ({clearFlowStep}/3)</h3>
                        </div>
                        <p className="mb-6 text-gray-700 dark:text-gray-300 text-lg">
                            {clearFlowStep === 1 && `Are you sure you want to clear all the ${toolGroupName} data?`}
                            {clearFlowStep === 2 && "Discussed with the client that the data needs to be cleared?"}
                            {clearFlowStep === 3 && "Have you received an email from your client asking to clear the data?"}
                        </p>
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Security Verification - Solve this:</label>
                            <div className="text-2xl font-mono font-bold text-center mb-3 text-blue-600 dark:text-blue-400">
                                {captchaQuestion.num1} - {captchaQuestion.num2} = ?
                            </div>
                            <input type="number" value={captchaInput}
                                onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
                                className={`w-full p-2 border-2 rounded-lg text-center text-lg font-mono ${captchaError
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-900'} dark:text-white`}
                                placeholder="Enter answer" autoFocus />
                            {captchaError && <p className="text-red-600 dark:text-red-400 text-sm mt-2">Incorrect answer. Please try again.</p>}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={handleClearCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">No, Cancel</button>
                            <button onClick={handleClearConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Yes, Proceed</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Credential Popup */}
            {clearFlowStep === 4 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <form onSubmit={handleCredentialSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6 text-gray-900 dark:text-white">
                            <Lock className="w-6 h-6" />
                            <h3 className="text-xl font-bold">Security Verification</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                <input type="text" required className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    value={clearCredentials.username} onChange={e => setClearCredentials({ ...clearCredentials, username: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <input type="password" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    value={clearCredentials.password} onChange={e => setClearCredentials({ ...clearCredentials, password: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Deletion</label>
                                <textarea required className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white h-24"
                                    placeholder="Please explicitly state why data is being cleared..."
                                    value={clearCredentials.reason} onChange={e => setClearCredentials({ ...clearCredentials, reason: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={handleClearCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                            <button type="submit" disabled={isLoading}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2">
                                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                Authorize & Clear Data
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filename Error Popup */}
            {filenameError && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-8 h-8" /> <h3 className="text-lg font-bold">Invalid File Name</h3>
                        </div>
                        <p className="mb-6 text-gray-700 dark:text-gray-300 text-lg">{filenameError}</p>
                        <div className="flex justify-end">
                            <button onClick={() => setFilenameError(null)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Ok</button>
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
                            <button onClick={() => { setShowModeSwitchModal(false); setPendingMode(null); }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                            <button onClick={() => { pendingMode.action(); setShowModeSwitchModal(false); setPendingMode(null); }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* No Data Found Modal */}
            {noDataMessage && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 text-center animate-in fade-in zoom-in duration-200">
                        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Data Found</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">{noDataMessage}</p>
                        <button onClick={() => setNoDataMessage(null)}
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0">
                            OK
                        </button>
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
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Do you want to Re-upload Excel?</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Uploading a new file will replace the current data. Previous changes will be lost.</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setShowReUploadModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium">No</button>
                                <button onClick={confirmReUpload}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">Yes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standardized Message Modal */}
            {ModalRenderer}

            {/* Validation Result Modal */}
            {showValidationModal && validationModalContent && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400 shrink-0">
                            <AlertCircle className="w-8 h-8" />
                            <h3 className="text-xl font-bold">{validationModalContent.title}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto mb-6 pr-2">
                            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 text-lg">
                                {validationModalContent.messages.map((msg, idx) => (
                                    <li key={idx} className="whitespace-pre-wrap leading-relaxed">{msg}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex justify-center shrink-0">
                            <button onClick={() => setShowValidationModal(false)}
                                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg min-w-[120px]">Ok</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolMasterEnhanced;
