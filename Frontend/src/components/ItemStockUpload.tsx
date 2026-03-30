import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Database, Upload, Download, Trash2, AlertCircle, CheckCircle2, RotateCcw, Lock, ShieldAlert, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, GridApi, RowClassRules, IRowNode } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { useTheme } from '../context/ThemeContext';
import { useLoader } from '../context/LoaderContext';
import {
    enrichItemStock, importItemStock, validateItemStock, loadStockData,
    resetItemStock, resetFloorStock,
    getStockWarehouses, getStockBins,
    ItemStockEnrichedRow, ItemStockImportResult, ItemStockValidationResult,
    ItemStockRowValidation, ItemStockCellValidation, WarehouseDto
} from '../services/api';

ModuleRegistry.registerModules([AllCommunityModule]);

interface ItemStockUploadProps {
    itemGroupId: number;
    itemGroupName: string;
    onHasDataChange?: (hasData: boolean) => void;
}

const ItemStockUpload: React.FC<ItemStockUploadProps> = ({ itemGroupId, itemGroupName, onHasDataChange }) => {
    const { isDark } = useTheme();
    const { showLoader, hideLoader } = useLoader();

    // ─── State ───────────────────────────────────────────────────────────────
    const [gridData, setGridData] = useState<ItemStockEnrichedRow[]>([]);
    const [mode, setMode] = useState<'idle' | 'loaded' | 'preview' | 'validated'>('idle');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isLoading) showLoader();
        else hideLoader();
    }, [isLoading]);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [gridApi, setGridApi] = useState<GridApi | null>(null);

    // Warehouses
    const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
    const [binsCache, setBinsCache] = useState<Record<string, WarehouseDto[]>>({});

    // Validation
    const [validationResult, setValidationResult] = useState<ItemStockValidationResult | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'valid' | 'duplicate' | 'missing' | 'mismatch' | 'invalid'>('all');

    // Modals
    const [filenameError, setFilenameError] = useState<string | null>(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationModalContent, setValidationModalContent] = useState<{ title: string; messages: string[] } | null>(null);
    const [successInfo, setSuccessInfo] = useState<{ rowCount: number; groupName: string } | null>(null);
    const [importProgress, setImportProgress] = useState<{ active: boolean; step: string; pct: number; total: number } | null>(null);

    // Reset Confirmation Flow State (3 CAPTCHA steps + 1 security verification)
    const [resetFlowStep, setResetFlowStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [resetFlowType, setResetFlowType] = useState<'item' | 'floor'>('item');
    const [resetCredentials, setResetCredentials] = useState({ username: '', password: '', reason: '' });
    const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState(false);

    // State-switch confirmation
    const [switchConfirm, setSwitchConfirm] = useState<{ action: 'upload' | 'load' | 'reset-item' | 'reset-floor'; message: string } | null>(null);
    const pendingFileRef = useRef<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Notify parent when data exists/clears ──────────────────────────────
    useEffect(() => {
        onHasDataChange?.(gridData.length > 0);
    }, [gridData.length, onHasDataChange]);

    // ─── Fetch warehouses on mount ───────────────────────────────────────────
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const data = await getStockWarehouses();
                setWarehouses(data);
            } catch (err) {
                console.error('Failed to load warehouses', err);
            }
        };
        fetchWarehouses();
    }, []);

    const warehouseNames = useMemo(() => {
        const names = [...new Set(warehouses.map(w => w.warehouseName))];
        return names.sort();
    }, [warehouses]);

    const getBinsForWarehouse = useCallback(async (whName: string): Promise<string[]> => {
        if (binsCache[whName]) {
            return binsCache[whName].map(b => b.binName || '').filter(Boolean);
        }
        try {
            const bins = await getStockBins(whName);
            setBinsCache(prev => ({ ...prev, [whName]: bins }));
            return bins.map(b => b.binName || '').filter(Boolean);
        } catch {
            return [];
        }
    }, [binsCache]);

    // ─── Validation Map (rowIndex → rowValidation) ───────────────────────────
    const validationMap = useMemo(() => {
        const map = new Map<number, ItemStockRowValidation>();
        if (validationResult) {
            validationResult.rows.forEach((row) => {
                map.set(row.rowIndex, row);
            });
        }
        return map;
    }, [validationResult]);

    // ─── Force grid refresh when validation result changes ────────────────────
    useEffect(() => {
        if (gridApi) {
            // Force re-render all cells so cellStyle picks up new validation data
            gridApi.refreshCells({ force: true });
            gridApi.redrawRows();
        }
    }, [validationResult, gridApi]);

    // ─── Find cell validation helper ─────────────────────────────────────────
    const findCellValidation = useCallback((rowValidation: ItemStockRowValidation | undefined, field: string | undefined, headerName: string | undefined): ItemStockCellValidation | null => {
        if (!rowValidation?.cellValidations) return null;
        for (const cv of rowValidation.cellValidations) {
            const colName = cv.columnName?.toLowerCase() ?? '';
            if ((field && colName === field.toLowerCase()) || (headerName && colName === headerName.toLowerCase())) {
                return cv;
            }
        }
        return null;
    }, []);

    // ─── State label helper ──────────────────────────────────────────────────
    const getModeLabel = () => {
        switch (mode) {
            case 'preview': return 'Upload Excel';
            case 'validated': return 'Upload Excel (Validated)';
            case 'loaded': return 'Load Stock';
            default: return '';
        }
    };

    // ─── Excel Filename Validation & Upload ──────────────────────────────────
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate filename: {itemGroupName}Stock.xlsx
        const expectedFilename = `${itemGroupName}Stock.xlsx`;
        if (file.name !== expectedFilename) {
            setFilenameError(`Please correct your Excel file name according to the selected Item Group. Expected: ${expectedFilename}`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // If data exists, ask confirmation before switching
        if (mode !== 'idle' && gridData.length > 0) {
            pendingFileRef.current = file;
            setSwitchConfirm({
                action: 'upload',
                message: `You are currently in "${getModeLabel()}" mode with ${gridData.length} row(s). Switching to Upload Excel will clear the current data. Do you want to continue?`
            });
            return;
        }

        await processFileUpload(file);
    };

    const processFileUpload = async (file: File) => {
        setValidationResult(null);
        setFilterType('all');
        setGridData([]);
        setSelectedRows(new Set());
        setIsLoading(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                setValidationModalContent({ title: 'Empty Excel', messages: ['Excel file is empty. No rows found.'] });
                setShowValidationModal(true);
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            // Check required columns
            const keys = Object.keys(jsonData[0]);
            const hasItemCode = keys.some(k => k.toLowerCase() === 'itemcode');
            if (!hasItemCode) {
                setValidationModalContent({ title: 'Missing Column', messages: ['Excel must contain an ItemCode column.'] });
                setShowValidationModal(true);
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            const hasQty = keys.some(k => k.toLowerCase() === 'receiptquantity' || k.toLowerCase() === 'quantity');
            if (!hasQty) {
                setValidationModalContent({ title: 'Missing Column', messages: ['Excel must contain a ReceiptQuantity (or Quantity) column.'] });
                setShowValidationModal(true);
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            // Map Excel rows
            const rows = jsonData.map((row: any) => ({
                itemCode: String(row.ItemCode || row.itemCode || row.ITEMCODE || '').trim() || undefined,
                receiptQuantity: Number(row.ReceiptQuantity || row.receiptQuantity || row.Quantity || row.quantity || 0),
                landedRate: Number(row.LandedRate || row.landedRate || row.Rate || row.rate || 0),
                stockUnit: String(row.StockUnit || row.stockUnit || row.STOCKUNIT || '').trim() || undefined,
                warehouseName: String(row.WarehouseName || row.warehouseName || row.WAREHOUSENAME || '').trim() || undefined,
                binName: String(row.BinName || row.binName || row.BINNAME || '').trim() || undefined,
            }));

            // Enrich via backend (validate ItemCodes, fill ItemID/BatchNo/StockUnit)
            const enrichResult = await enrichItemStock(rows, itemGroupId);
            setGridData(enrichResult.rows);
            setMode('preview');

            // Pre-load bins for all unique warehouses in the data
            const uniqueWarehouses = [...new Set(enrichResult.rows
                .map(r => r.warehouseName)
                .filter(Boolean)
            )] as string[];

            for (const whName of uniqueWarehouses) {
                if (!binsCache[whName]) {
                    try {
                        const bins = await getStockBins(whName);
                        setBinsCache(prev => ({ ...prev, [whName]: bins }));
                    } catch {
                        // Ignore errors
                    }
                }
            }

        } catch (error: any) {
            setValidationModalContent({
                title: 'Upload Error',
                messages: [error?.response?.data?.message || error?.message || 'Failed to process Excel file.']
            });
            setShowValidationModal(true);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ─── Check Validation ────────────────────────────────────────────────────
    const handleCheckValidation = async () => {
        if (gridData.length === 0) {
            setValidationModalContent({ title: 'No Data', messages: ['There is no data to validate.'] });
            setShowValidationModal(true);
            return;
        }

        setValidationResult(null);
        setFilterType('all');
        setIsLoading(true);

        try {
            const result = await validateItemStock(gridData, itemGroupId);
            setValidationResult(result);
            setMode('validated');

            if (result.isValid) {
                setValidationModalContent({
                    title: 'Validation Passed',
                    messages: ['All records passed validation successfully. You can now save the data.']
                });
                setShowValidationModal(true);
            } else {
                // Build column-wise failure messages
                const columnFailures = new Map<string, Set<string>>();
                result.rows.forEach((row: ItemStockRowValidation) => {
                    if (row.cellValidations && row.cellValidations.length > 0) {
                        row.cellValidations.forEach((cell: ItemStockCellValidation) => {
                            const col = cell.columnName || 'Unknown';
                            if (!columnFailures.has(col)) columnFailures.set(col, new Set());

                            let reason = cell.validationMessage;
                            if (cell.status === 'Duplicate') reason = 'Duplicate data found';
                            else if (cell.status === 'MissingData') reason = 'Missing data';
                            else if (cell.status === 'Mismatch') reason = 'Mismatch with Master';
                            else if (cell.status === 'InvalidContent') reason = 'Invalid format';

                            columnFailures.get(col)!.add(reason);
                        });
                    }
                });

                const totalIssues = (result.summary.duplicateCount || 0)
                    + (result.summary.missingDataCount || 0)
                    + (result.summary.mismatchCount || 0)
                    + (result.summary.invalidContentCount || 0);

                const messages: string[] = [];
                columnFailures.forEach((reasons, col) => {
                    messages.push(`${col}: ${Array.from(reasons).join(', ')}`);
                });

                setValidationModalContent({
                    title: `Validation Failed: ${totalIssues} Issue${totalIssues !== 1 ? 's' : ''} Found`,
                    messages: messages.length > 0 ? messages : ['Validation failed. Please check the grid for errors.']
                });
                setShowValidationModal(true);
            }
        } catch (error: any) {
            setValidationModalContent({
                title: 'Validation Error',
                messages: [error?.response?.data?.message || error?.message || 'Validation failed.']
            });
            setShowValidationModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Save Data (Import) ──────────────────────────────────────────────────
    const handleImport = async () => {
        if (gridData.length === 0) {
            setValidationModalContent({ title: 'No Data', messages: ['No data to import.'] });
            setShowValidationModal(true);
            return;
        }

        setIsLoading(true);
        setValidationModalContent(null);

        try {
            // Re-validate (duplicate gate)
            const reValidation = await validateItemStock(gridData, itemGroupId);
            setValidationResult(reValidation);

            const duplicateRows = reValidation.rows.filter((r: ItemStockRowValidation) =>
                r.cellValidations?.some((cv: ItemStockCellValidation) => cv.status === 'Duplicate'));
            if (duplicateRows.length > 0) {
                setImportProgress(null);
                const messages = duplicateRows.map((r: ItemStockRowValidation) => `Row ${r.rowIndex + 1}: ${r.errorMessage || 'Duplicate row (same ItemID, BatchNo, WarehouseName, BinName)'}`);
                setValidationModalContent({
                    title: `Import Blocked: ${duplicateRows.length} Duplicate Row(s) Found`,
                    messages
                });
                setShowValidationModal(true);
                setIsLoading(false);
                return;
            }

            // Check if there are any other validation issues
            if (!reValidation.isValid) {
                setImportProgress(null);
                setValidationModalContent({
                    title: 'Import Blocked: Validation Errors',
                    messages: ['Please fix all validation errors before saving.']
                });
                setShowValidationModal(true);
                setIsLoading(false);
                return;
            }

            // Show progress overlay
            const total = gridData.length;
            setImportProgress({ active: true, step: `Importing Stock (${itemGroupName})...`, pct: 10, total });

            const progressTimer = setInterval(() => {
                setImportProgress(prev => {
                    if (!prev) return prev;
                    const next = Math.min(prev.pct + 15, 90);
                    return { ...prev, pct: next };
                });
            }, 800);

            // Build import rows
            const importRows = gridData.map((r, idx) => ({
                rowIndex: idx + 1,
                itemCode: r.itemCode,
                receiptQuantity: r.receiptQuantity,
                landedRate: r.landedRate,
                stockUnit: r.stockUnit,
                batchNo: r.batchNo,
                warehouseName: r.warehouseName,
                binName: r.binName,
            }));

            let importRes: ItemStockImportResult | null = null;
            try {
                importRes = await importItemStock(importRows, itemGroupId);
            } catch (axiosErr: any) {
                importRes = axiosErr?.response?.data ?? null;
                if (!importRes) {
                    clearInterval(progressTimer);
                    setImportProgress(null);
                    setValidationModalContent({
                        title: 'Import Failed',
                        messages: [axiosErr?.message || 'Import request failed.']
                    });
                    setShowValidationModal(true);
                    setIsLoading(false);
                    return;
                }
            } finally {
                clearInterval(progressTimer);
                setImportProgress({ active: true, step: 'Finalising...', pct: 100, total });
                await new Promise(r => setTimeout(r, 400));
                setImportProgress(null);
            }

            const imported = importRes?.importedRows ?? 0;
            const isSuccess = importRes?.success ?? false;
            const errRows = importRes?.failedRows ?? 0;
            const errMsgs = importRes?.errorMessages ?? [];

            if (isSuccess || imported > 0) {
                setSuccessInfo({ rowCount: imported || gridData.length, groupName: itemGroupName });
                if (errRows > 0 && errMsgs.length > 0) {
                    setValidationModalContent({
                        title: `${errRows} Row(s) Skipped During Import`,
                        messages: errMsgs
                    });
                }
            } else {
                if (errMsgs.length > 0) {
                    setValidationModalContent({ title: 'Import Failed', messages: errMsgs });
                    setShowValidationModal(true);
                } else {
                    const msg = importRes?.message ?? 'Import failed - no rows were inserted.';
                    setValidationModalContent({ title: 'Import Failed', messages: [msg] });
                    setShowValidationModal(true);
                }
            }
        } catch (error: any) {
            setImportProgress(null);
            setValidationModalContent({
                title: 'Import Error',
                messages: [error?.message || 'An unexpected error occurred during import.']
            });
            setShowValidationModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Delete Excel Row ────────────────────────────────────────────────────
    const handleRemoveSelectedRows = () => {
        if (selectedRows.size === 0) {
            setValidationModalContent({ title: 'No Selection', messages: ['Please select at least one row to remove.'] });
            setShowValidationModal(true);
            return;
        }

        if (!window.confirm(`Are you sure you want to remove ${selectedRows.size} row(s)?`)) {
            return;
        }

        const newData = gridData.filter((_, index) => !selectedRows.has(index));
        setGridData(newData);
        setSelectedRows(new Set());
        setValidationResult(null);
        setMode('preview');
    };

    // ─── Load Stock from Database ───────────────────────────────────────────
    const handleLoadStock = async () => {
        // If data exists, ask confirmation before switching
        if (mode !== 'idle' && gridData.length > 0) {
            setSwitchConfirm({
                action: 'load',
                message: `You are currently in "${getModeLabel()}" mode with ${gridData.length} row(s). Switching to Load Stock will clear the current data. Do you want to continue?`
            });
            return;
        }

        await processLoadStock();
    };

    const processLoadStock = async () => {
        setIsLoading(true);
        setValidationResult(null);
        setFilterType('all');
        setSelectedRows(new Set());

        try {
            const data = await loadStockData(itemGroupId);
            setGridData(data);
            setMode('loaded');

            if (data.length === 0) {
                setValidationModalContent({ title: 'No Data', messages: ['No stock records found for this Item Group.'] });
                setShowValidationModal(true);
            } else {
                // Pre-load bins for all unique warehouses in the data
                const uniqueWarehouses = [...new Set(data
                    .map(r => r.warehouseName)
                    .filter(Boolean)
                )] as string[];

                for (const whName of uniqueWarehouses) {
                    if (!binsCache[whName]) {
                        try {
                            const bins = await getStockBins(whName);
                            setBinsCache(prev => ({ ...prev, [whName]: bins }));
                        } catch {
                            // Ignore errors
                        }
                    }
                }
            }
        } catch (error: any) {
            setValidationModalContent({
                title: 'Load Error',
                messages: [error?.response?.data?.message || error?.message || 'Failed to load stock data.']
            });
            setShowValidationModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── CAPTCHA Helper ─────────────────────────────────────────────────────
    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 50) + 20;
        const num2 = Math.floor(Math.random() * 30) + 10;
        setCaptchaQuestion({ num1, num2, answer: num1 - num2 });
        setCaptchaInput('');
        setCaptchaError(false);
    };

    // ─── Reset Flow: Trigger (opens Step 1) ─────────────────────────────────
    const handleResetTrigger = (type: 'item' | 'floor') => {
        const label = type === 'item' ? 'Reset Item Stock' : 'Reset Floor Stock';

        // If data exists in grid, ask confirmation before proceeding
        if (mode !== 'idle' && gridData.length > 0) {
            setSwitchConfirm({
                action: type === 'item' ? 'reset-item' : 'reset-floor',
                message: `You are currently in "${getModeLabel()}" mode with ${gridData.length} row(s). Proceeding with ${label} will clear the current data. Do you want to continue?`
            });
            return;
        }

        setResetFlowType(type);
        setResetFlowStep(1);
        generateCaptcha();
    };

    // ─── Reset Flow: Confirm CAPTCHA (Steps 1→2→3→4) ────────────────────────
    const handleResetConfirm = (step: 1 | 2 | 3) => {
        const userAnswer = parseInt(captchaInput);
        if (isNaN(userAnswer) || userAnswer !== captchaQuestion.answer) {
            setCaptchaError(true);
            return;
        }
        setResetFlowStep((step + 1) as any);
        generateCaptcha();
    };

    // ─── Reset Flow: Cancel ──────────────────────────────────────────────────
    const handleResetCancel = () => {
        setResetFlowStep(0);
        setResetCredentials({ username: '', password: '', reason: '' });
        setCaptchaInput('');
        setCaptchaError(false);
    };

    // ─── State-Switch Confirmation Handler ────────────────────────────────────
    const handleSwitchConfirm = async () => {
        if (!switchConfirm) return;
        const action = switchConfirm.action;
        setSwitchConfirm(null);

        // Clear current state
        setGridData([]);
        setMode('idle');
        setValidationResult(null);
        setFilterType('all');
        setSelectedRows(new Set());
        setSuccessInfo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Execute the pending action
        if (action === 'upload' && pendingFileRef.current) {
            const file = pendingFileRef.current;
            pendingFileRef.current = null;
            await processFileUpload(file);
        } else if (action === 'load') {
            await processLoadStock();
        } else if (action === 'reset-item') {
            setResetFlowType('item');
            setResetFlowStep(1);
            generateCaptcha();
        } else if (action === 'reset-floor') {
            setResetFlowType('floor');
            setResetFlowStep(1);
            generateCaptcha();
        }
    };

    const handleSwitchCancel = () => {
        setSwitchConfirm(null);
        pendingFileRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Reset Flow: Final Submit (Step 4 credentials) ──────────────────────
    const handleResetCredentialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { username, password, reason } = resetCredentials;
            const result = resetFlowType === 'item'
                ? await resetItemStock(itemGroupId, username, password, reason)
                : await resetFloorStock(itemGroupId, username, password, reason);

            const label = resetFlowType === 'item' ? 'Item Stock' : 'Floor Stock';

            if (result.success) {
                setValidationModalContent({
                    title: `${label} Reset Successful`,
                    messages: [result.message || `${label} has been reset successfully.`]
                });
                setShowValidationModal(true);

                // Clear grid if data was loaded
                if (mode === 'loaded') {
                    setGridData([]);
                    setMode('idle');
                    setValidationResult(null);
                    setFilterType('all');
                }

                handleResetCancel();
            } else {
                // Invalid credentials or other failure — keep reset modal open
                setValidationModalContent({
                    title: 'Authorization Failed',
                    messages: [result.message || `Failed to reset ${label.toLowerCase()}.`]
                });
                setShowValidationModal(true);
            }
        } catch (error: any) {
            setValidationModalContent({
                title: 'Reset Error',
                messages: [error?.response?.data?.message || error?.message || 'Failed to reset stock.']
            });
            setShowValidationModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Export to Excel ─────────────────────────────────────────────────────
    const handleExport = () => {
        if (gridData.length === 0) return;

        const exportData = gridData.map(r => ({
            ItemCode: r.itemCode || '',
            ItemID: r.itemID || '',
            ReceiptQuantity: r.receiptQuantity || 0,
            LandedRate: r.landedRate || 0,
            BatchNo: r.batchNo || '',
            StockUnit: r.stockUnit || '',
            WarehouseName: r.warehouseName || '',
            BinName: r.binName || '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock');
        XLSX.writeFile(wb, `${itemGroupName}Stock.xlsx`);
    };

    // ─── Grid Callbacks ──────────────────────────────────────────────────────
    const onGridReady = useCallback((params: any) => {
        setGridApi(params.api);
    }, []);

    const onSelectionChanged = useCallback(() => {
        if (!gridApi) return;
        const selectedNodes = gridApi.getSelectedNodes();
        const indices = new Set(selectedNodes.map((node: IRowNode) => gridData.indexOf(node.data)).filter((i: number) => i !== -1));
        setSelectedRows(indices);
    }, [gridApi, gridData]);

    const onCellValueChanged = useCallback(async (params: any) => {
        const { colDef, data, newValue } = params;

        // Update the gridData state with the new value
        setGridData(prevData => {
            const newData = [...prevData];
            const rowIndex = newData.indexOf(data);
            if (rowIndex !== -1) {
                newData[rowIndex] = { ...data };
            }
            return newData;
        });

        // Clear validation when data changes
        setValidationResult(null);
        setMode('preview');

        // Special handling for warehouse changes
        if (colDef.field === 'warehouseName') {
            data.binName = '';
            if (newValue) {
                await getBinsForWarehouse(newValue);
            }
            params.api.refreshCells({ rowNodes: [params.node], columns: ['binName'], force: true });
        }
    }, [getBinsForWarehouse]);

    // ─── External Filter (for validation card clicks) ────────────────────────
    const isExternalFilterPresent = useCallback(() => {
        return filterType !== 'all' && validationResult !== null;
    }, [filterType, validationResult]);

    const doesExternalFilterPass = useCallback((node: IRowNode) => {
        const rowIndex = gridData.indexOf(node.data);
        if (rowIndex === -1) return false;

        const validation = validationMap.get(rowIndex);

        switch (filterType) {
            case 'valid':
                return !validation || validation.rowStatus === 'Valid';
            case 'duplicate':
                return validation?.cellValidations?.some((cv: ItemStockCellValidation) => cv.status === 'Duplicate') ?? false;
            case 'missing':
                return validation?.cellValidations?.some((cv: ItemStockCellValidation) => cv.status === 'MissingData') ?? false;
            case 'mismatch':
                return validation?.cellValidations?.some((cv: ItemStockCellValidation) => cv.status === 'Mismatch') ?? false;
            case 'invalid':
                return validation?.cellValidations?.some((cv: ItemStockCellValidation) => cv.status === 'InvalidContent') ?? false;
            default:
                return true;
        }
    }, [filterType, validationMap, gridData]);

    // Notify grid when filter changes
    useEffect(() => {
        if (gridApi) {
            gridApi.onFilterChanged();
        }
    }, [filterType, gridApi, validationResult]);

    // ─── Column Definitions ──────────────────────────────────────────────────
    const columnDefs: ColDef[] = useMemo(() => [
        {
            headerName: '',
            headerCheckboxSelection: true,
            headerCheckboxSelectionFilteredOnly: true,
            checkboxSelection: true,
            width: 50,
            pinned: 'left' as const,
            sortable: false,
            filter: false
        },
        {
            headerName: '#', valueGetter: 'node.rowIndex + 1', width: 60,
            pinned: 'left' as const, sortable: false, filter: false
        },
        { field: 'itemCode', headerName: 'ItemCode', width: 140, editable: false },
        {
            field: 'itemID', headerName: 'ItemID', width: 90, editable: false,
            cellStyle: { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
        },
        { field: 'receiptQuantity', headerName: 'ReceiptQuantity', width: 140, editable: true, type: 'numericColumn' },
        { field: 'landedRate', headerName: 'LandedRate', width: 120, editable: true, type: 'numericColumn' },
        {
            field: 'batchNo', headerName: 'BatchNo', width: 220, editable: false,
            cellStyle: { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
        },
        {
            field: 'stockUnit', headerName: 'StockUnit', width: 110, editable: false,
            cellStyle: { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
        },
        {
            field: 'warehouseName', headerName: 'WarehouseName', width: 170, editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: { values: ['', ...warehouseNames] }
        },
        {
            field: 'binName', headerName: 'BinName', width: 150, editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: (params: any) => {
                const whName = params.data?.warehouseName;
                const bins = whName && binsCache[whName]
                    ? binsCache[whName].map(b => b.binName || '').filter(Boolean)
                    : [];
                return { values: ['', ...bins] };
            }
        }
    ], [warehouseNames, binsCache, isDark]);

    // ─── Columns with Validation Styling ─────────────────────────────────────
    const columnsWithStyle = useMemo(() => {
        return columnDefs.map(col => {
            if (!col.field) return col;

            return {
                ...col,
                tooltipValueGetter: (params: any) => {
                    const rowIndex = gridData.indexOf(params.data);
                    const rowValidation = validationMap.get(rowIndex);
                    if (!rowValidation) return null;

                    const cellVal = findCellValidation(rowValidation, params.colDef.field, params.colDef.headerName);
                    if (cellVal) return cellVal.validationMessage;

                    if (rowValidation.rowStatus === 'Duplicate') {
                        return rowValidation.errorMessage || 'Duplicate row detected';
                    }
                    return null;
                },
                cellStyle: (params: any): Record<string, string> | null => {
                    // Preserve read-only gray styling
                    const origStyle = typeof col.cellStyle === 'function' ? col.cellStyle(params) : col.cellStyle;

                    const rowIndex = gridData.indexOf(params.data);
                    if (rowIndex === -1) return origStyle as Record<string, string> | null;

                    const colors = {
                        duplicate: isDark ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2',
                        missing: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe',
                        mismatch: isDark ? 'rgba(202, 138, 4, 0.2)' : '#fef9c3',
                        invalid: isDark ? 'rgba(147, 51, 234, 0.2)' : '#f3e8ff'
                    };

                    const rowValidation = validationMap.get(rowIndex);

                    // Cell-specific coloring (takes priority over row-level duplicate)
                    const cellVal = findCellValidation(rowValidation, params.colDef.field, params.colDef.headerName);
                    if (cellVal && cellVal.status !== 'Duplicate') {
                        if (cellVal.status === 'MissingData') {
                            return { backgroundColor: colors.missing };
                        }
                        if (cellVal.status === 'Mismatch') {
                            return { backgroundColor: colors.mismatch };
                        }
                        if (cellVal.status === 'InvalidContent') {
                            return {
                                backgroundColor: colors.invalid,
                                borderBottom: '2px solid #9333ea',
                                borderRight: '2px solid #9333ea'
                            };
                        }
                    }

                    // Duplicate row: cells without other issues get red background
                    const hasDuplicate = rowValidation?.cellValidations?.some((cv: ItemStockCellValidation) => cv.status === 'Duplicate');
                    if (hasDuplicate) {
                        return { backgroundColor: colors.duplicate };
                    }

                    return origStyle as Record<string, string> | null;
                }
            };
        });
    }, [columnDefs, validationMap, isDark, gridData, findCellValidation]);

    // ─── Row Class Rules ─────────────────────────────────────────────────────
    const rowClassRules: RowClassRules = useMemo(() => ({
        'bg-red-50 dark:bg-red-900/20': (params: any) => {
            const rowIndex = gridData.indexOf(params.data);
            if (rowIndex === -1) return false;
            const validation = validationMap.get(rowIndex);
            return validation?.cellValidations?.some((cv: ItemStockCellValidation) => cv.status === 'Duplicate') ?? false;
        }
    }), [gridData, validationMap]);

    const defaultColDef = useMemo(() => ({
        resizable: true,
        sortable: true,
        filter: false,
    }), []);

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">

            {/* ✅ Success Popup Modal */}
            {successInfo && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <svg className="w-9 h-9 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Import Successful!</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-base">
                            <span className="text-3xl font-bold text-green-600 dark:text-green-400 block mb-1">
                                {successInfo.rowCount.toLocaleString()}
                            </span>
                            rows imported into <strong>{successInfo.groupName}</strong>
                        </p>
                        <button
                            onClick={() => {
                                setSuccessInfo(null);
                                setGridData([]);
                                setValidationResult(null);
                                setMode('idle');
                                setFilterType('all');
                                setSelectedRows(new Set());
                                if (fileInputRef.current) fileInputRef.current.value = '';
                                if (validationModalContent && validationModalContent.title.includes('Skipped During Import')) {
                                    setShowValidationModal(true);
                                }
                            }}
                            className="mt-2 w-full px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl font-semibold text-lg transition-colors"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Stock Upload - {itemGroupName}
                </h2>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
                {/* Load Stock */}
                <button
                    onClick={handleLoadStock}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                    <Database className="w-5 h-5" />
                    Load Stock
                </button>

                {/* Reset Item Stock */}
                <button
                    onClick={() => handleResetTrigger('item')}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                    <RotateCcw className="w-5 h-5" />
                    Reset Item Stock
                </button>

                {/* Reset Floor Stock */}
                <button
                    onClick={() => handleResetTrigger('floor')}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                    <RotateCcw className="w-5 h-5" />
                    Reset Floor Stock
                </button>

                {/* Upload Excel */}
                <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium cursor-pointer disabled:opacity-50">
                    <Upload className="w-5 h-5" />
                    <span>{isLoading ? 'Processing...' : 'Upload Excel'}</span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={isLoading}
                        className="hidden"
                    />
                </label>

                {/* Delete Excel Row */}
                {(mode === 'preview' || mode === 'validated') && (
                    <button
                        onClick={handleRemoveSelectedRows}
                        disabled={isLoading || selectedRows.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#D2691E] hover:bg-[#A55217] text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        <Trash2 className="w-5 h-5" />
                        Delete Excel Row ({selectedRows.size})
                    </button>
                )}

                {/* Export */}
                {(mode === 'loaded' || mode === 'preview' || mode === 'validated') && gridData.length > 0 && (
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        <Download className="w-5 h-5" />
                        Export
                    </button>
                )}

                {/* Check Validation */}
                {(mode === 'preview' || mode === 'validated') && (
                    <button
                        onClick={handleCheckValidation}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        <AlertCircle className="w-5 h-5" />
                        Check Validation
                    </button>
                )}

                {/* Save Data (only when validation passes) */}
                {validationResult?.isValid && (
                    <button
                        onClick={handleImport}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 animate-pulse"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        Save Data
                    </button>
                )}
            </div>

            {/* Validation Summary */}
            {validationResult && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Validation Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div
                            onClick={() => setFilterType('all')}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${filterType === 'all' ? 'ring-2 ring-blue-500' : ''} bg-gray-100 dark:bg-gray-700`}
                        >
                            <div className="text-sm text-gray-600 dark:text-gray-400">TOTAL ROWS</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{validationResult.summary.totalRows}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('valid')}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${filterType === 'valid' ? 'ring-2 ring-green-500' : ''} bg-green-50 dark:bg-green-900/20`}
                        >
                            <div className="text-sm text-green-700 dark:text-green-400">VALID ROWS</div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{validationResult.summary.validRows}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('duplicate')}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${filterType === 'duplicate' ? 'ring-2 ring-red-500' : ''} bg-red-50 dark:bg-red-900/20`}
                        >
                            <div className="text-sm text-red-700 dark:text-red-400">DUPLICATE</div>
                            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{validationResult.summary.duplicateCount}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('missing')}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${filterType === 'missing' ? 'ring-2 ring-blue-500' : ''} bg-blue-50 dark:bg-blue-900/20`}
                        >
                            <div className="text-sm text-blue-700 dark:text-blue-400">MISSING</div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{validationResult.summary.missingDataCount}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('mismatch')}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${filterType === 'mismatch' ? 'ring-2 ring-yellow-500' : ''} bg-yellow-50 dark:bg-yellow-900/20`}
                        >
                            <div className="text-sm text-yellow-700 dark:text-yellow-400">MISMATCH</div>
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{validationResult.summary.mismatchCount}</div>
                        </div>
                        <div
                            onClick={() => setFilterType('invalid')}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${filterType === 'invalid' ? 'ring-2 ring-purple-500' : ''} bg-purple-50 dark:bg-purple-900/20`}
                        >
                            <div className="text-sm text-purple-700 dark:text-purple-400">INVALID CONTENT</div>
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{validationResult.summary.invalidContentCount}</div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                        Edit cells directly in the grid below, or click on validation summary to filter rows.
                        {validationResult.summary.duplicateCount > 0 &&
                            <span className="ml-2 text-red-600 dark:text-red-400 font-bold">
                                {validationResult.summary.duplicateCount} duplicate(s) found! Remove or edit them.
                            </span>
                        }
                        {validationResult.summary.missingDataCount > 0 &&
                            <span className="ml-2 text-blue-600 dark:text-blue-400 font-bold">
                                {validationResult.summary.missingDataCount} row(s) have missing data! Fill in required fields.
                            </span>
                        }
                        {validationResult.summary.mismatchCount > 0 &&
                            <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-bold">
                                {validationResult.summary.mismatchCount} row(s) have mismatched data! Check WarehouseName and BinName.
                            </span>
                        }
                        {validationResult.summary.invalidContentCount > 0 &&
                            <span className="ml-2 text-purple-600 dark:text-purple-400 font-bold">
                                {validationResult.summary.invalidContentCount} row(s) have invalid content! Hover over purple cells for details.
                            </span>
                        }
                    </p>

                    {/* Detailed Invalid Content Errors */}
                    {filterType === 'invalid' && validationResult.summary.invalidContentCount > 0 && (
                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg max-h-48 overflow-y-auto">
                            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">Invalid Content Details:</h4>
                            <div className="space-y-1">
                                {validationResult.rows
                                    .filter((row: ItemStockRowValidation) => row.cellValidations?.some(cv => cv.status === 'InvalidContent'))
                                    .flatMap((row: ItemStockRowValidation) =>
                                        row.cellValidations
                                            .filter((cv: ItemStockCellValidation) => cv.status === 'InvalidContent')
                                            .map((cv: ItemStockCellValidation, idx: number) => (
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
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* AG Grid */}
            {gridData.length > 0 && (
                <div
                    className={isDark ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
                    style={{ height: 600, width: '100%' }}
                >
                    <style>{`
                        .ag-theme-quartz, .ag-theme-quartz-dark {
                            --ag-grid-size: 8px;
                            --ag-list-item-height: 40px;
                            --ag-row-height: 48px;
                            --ag-header-height: 52px;
                            --ag-font-size: 14px;
                            --ag-font-family: 'Inter', system-ui, sans-serif;
                            --ag-borders: solid 1px;
                            --ag-row-border-style: solid;
                            --ag-row-border-width: 1px;
                            --ag-header-column-separator-display: block;
                            --ag-header-column-separator-height: 50%;
                            --ag-header-column-separator-width: 1px;
                            --ag-header-column-separator-color: var(--ag-border-color);
                            --ag-header-column-resize-handle-display: block;
                            --ag-header-column-resize-handle-height: 100%;
                            --ag-header-column-resize-handle-width: 2px;
                            --ag-header-column-resize-handle-color: var(--ag-border-color);
                        }
                        .ag-theme-quartz {
                            --ag-background-color: #ffffff;
                            --ag-foreground-color: #0f172a;
                            --ag-header-background-color: #f8fafc;
                            --ag-header-foreground-color: #475569;
                            --ag-border-color: #e2e8f0;
                            --ag-secondary-border-color: #e2e8f0;
                            --ag-row-hover-color: #f8fafc;
                            --ag-selected-row-background-color: rgba(37, 99, 235, 0.1);
                            --ag-checkbox-checked-color: #2563eb;
                        }
                        .ag-theme-quartz-dark {
                            --ag-background-color: #0f172a !important;
                            --ag-foreground-color: #f1f5f9 !important;
                            --ag-header-background-color: #1e293b !important;
                            --ag-header-foreground-color: #cbd5e1 !important;
                            --ag-border-color: #334155 !important;
                            --ag-secondary-border-color: #334155 !important;
                            --ag-row-hover-color: #1e293b !important;
                            --ag-selected-row-background-color: rgba(59, 130, 246, 0.2) !important;
                            --ag-checkbox-checked-color: #3b82f6 !important;
                            color-scheme: dark;
                        }
                        .ag-theme-quartz-dark .ag-root-wrapper {
                            background-color: #0f172a !important;
                        }
                        .ag-theme-quartz-dark .ag-body-viewport,
                        .ag-theme-quartz-dark .ag-body-horizontal-scroll-viewport,
                        .ag-theme-quartz-dark .ag-center-cols-viewport {
                            background-color: #0f172a !important;
                        }
                        .ag-theme-quartz-dark .ag-row {
                            background-color: #0f172a !important;
                            color: #f1f5f9 !important;
                        }
                        .ag-theme-quartz-dark .ag-row-odd {
                            background-color: #0f172a !important;
                        }
                        .ag-theme-quartz-dark .ag-row-even {
                            background-color: #0f172a !important;
                        }
                        .ag-theme-quartz-dark .ag-cell {
                            color: #f1f5f9 !important;
                        }
                        .ag-theme-quartz-dark .ag-header {
                            background-color: #1e293b !important;
                        }
                        .ag-theme-quartz-dark .ag-header-cell {
                            background-color: #1e293b !important;
                            color: #cbd5e1 !important;
                        }
                        .ag-header-cell {
                            border-right: 1px solid var(--ag-border-color);
                        }
                        .ag-header-cell-text {
                            font-weight: 600;
                        }
                        .ag-pinned-left-header, .ag-pinned-left-cols-container {
                            box-shadow: 4px 0 8px -4px rgba(0,0,0,0.2);
                            border-right: 1px solid var(--ag-border-color);
                            z-index: 10 !important;
                        }
                    `}</style>
                    <AgGridReact
                        rowData={gridData}
                        columnDefs={columnsWithStyle}
                        defaultColDef={defaultColDef}
                        onGridReady={onGridReady}
                        getRowId={(params) => `stock-${gridData.indexOf(params.data)}`}
                        rowSelection="multiple"
                        onSelectionChanged={onSelectionChanged}
                        onCellValueChanged={onCellValueChanged}
                        rowClassRules={rowClassRules}
                        isExternalFilterPresent={isExternalFilterPresent}
                        doesExternalFilterPass={doesExternalFilterPass}
                        pagination={true}
                        paginationPageSize={1000}
                        paginationPageSizeSelector={[1000, 2000, 5000]}
                        tooltipShowDelay={300}
                        tooltipInteraction={true}
                        enableCellTextSelection={true}
                        overlayNoRowsTemplate='<span class="text-gray-500 dark:text-gray-400 text-lg">No records found</span>'
                    />
                </div>
            )}

            {/* Filename Error Modal */}
            {filenameError && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-8 h-8" />
                            <h3 className="text-lg font-bold">Invalid File Name</h3>
                        </div>
                        <p className="mb-6 text-gray-700 dark:text-gray-300 text-lg">
                            {filenameError}
                        </p>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setFilenameError(null)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                                Ok
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <button
                                onClick={() => setShowValidationModal(false)}
                                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg min-w-[120px]"
                            >
                                Ok
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Progress Overlay */}
            {importProgress?.active && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-14 h-14 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 text-center">
                                {importProgress.step}
                            </h3>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-3 bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-500"
                                    style={{ width: `${importProgress.pct}%` }}
                                />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {importProgress.pct}% &bull; {importProgress.total.toLocaleString()} rows
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── State-Switch Confirmation Modal ────────────────────────────── */}
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

            {/* ─── Reset Confirmation Step 1/3: WARNING ─────────────────────────── */}
            {resetFlowStep === 1 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border-4 border-red-500">
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">WARNING - Data Deletion (1/3)</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            Are you sure you want to clear all the <strong>{itemGroupName}</strong> {resetFlowType === 'item' ? 'Item Stock' : 'Floor Stock'} data?
                        </p>

                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Security Verification - Solve this:
                            </label>
                            <div className="text-2xl font-mono font-bold text-center mb-3 text-blue-600 dark:text-blue-400">
                                {captchaQuestion.num1} - {captchaQuestion.num2} = ?
                            </div>
                            <input
                                type="number"
                                value={captchaInput}
                                onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
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

                        <div className="flex justify-end gap-3">
                            <button onClick={handleResetCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">
                                Cancel
                            </button>
                            <button onClick={() => handleResetConfirm(1)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                                Yes, Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Reset Confirmation Step 2/3: CONFIRMATION ────────────────────── */}
            {resetFlowStep === 2 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border-4 border-orange-500">
                        <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">CONFIRMATION (2/3)</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            Discussed with the client that the data needs to be cleared?
                        </p>

                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Security Verification - Solve this:
                            </label>
                            <div className="text-2xl font-mono font-bold text-center mb-3 text-blue-600 dark:text-blue-400">
                                {captchaQuestion.num1} - {captchaQuestion.num2} = ?
                            </div>
                            <input
                                type="number"
                                value={captchaInput}
                                onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
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

                        <div className="flex justify-end gap-3">
                            <button onClick={handleResetCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">
                                No, Cancel
                            </button>
                            <button onClick={() => handleResetConfirm(2)} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium">
                                Yes, Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Reset Confirmation Step 3/3: FINAL CONFIRMATION ──────────────── */}
            {resetFlowStep === 3 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border-4 border-red-700">
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-500 mb-4">FINAL CONFIRMATION (3/3)</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            Have you received an email from your client asking to clear the data?
                        </p>

                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Security Verification - Solve this:
                            </label>
                            <div className="text-2xl font-mono font-bold text-center mb-3 text-blue-600 dark:text-blue-400">
                                {captchaQuestion.num1} - {captchaQuestion.num2} = ?
                            </div>
                            <input
                                type="number"
                                value={captchaInput}
                                onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
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

                        <div className="flex justify-end gap-3">
                            <button onClick={handleResetCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">
                                No, Cancel
                            </button>
                            <button onClick={() => handleResetConfirm(3)} className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium">
                                Yes, Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Reset Step 4: Security Verification ──────────────────────────── */}
            {resetFlowStep === 4 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <form onSubmit={handleResetCredentialSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6 text-gray-900 dark:text-white">
                            <Lock className="w-6 h-6" />
                            <h3 className="text-xl font-bold">Security Verification</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    value={resetCredentials.username}
                                    onChange={e => setResetCredentials({ ...resetCredentials, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password <span className="text-gray-400 text-xs">(Optional)</span></label>
                                <input
                                    type="password"
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    value={resetCredentials.password}
                                    onChange={e => setResetCredentials({ ...resetCredentials, password: e.target.value })}
                                    placeholder="Leave blank if no password is set"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Deletion</label>
                                <textarea
                                    required
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white h-24"
                                    placeholder="Please explicitly state why data is being cleared..."
                                    value={resetCredentials.reason}
                                    onChange={e => setResetCredentials({ ...resetCredentials, reason: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={handleResetCancel}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
                            >
                                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                Authorize & Clear Data
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ItemStockUpload;
