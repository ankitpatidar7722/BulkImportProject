import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ClearSuccessPopup from './ClearSuccessPopup';
import NoDataPopup from './NoDataPopup';
import { Database, Trash2, Upload, Download, CheckCircle2, AlertCircle, FilePlus2, RefreshCw, XCircle, ShieldAlert, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    getLedgersByGroup,
    softDeleteLedger,
    validateLedgers,
    importLedgers,
    getCountryStates,
    LedgerMasterDto,
    LedgerValidationResultDto,
    LedgerRowValidation,
    CountryStateDto,
    ValidationStatus,
    clearAllLedgerData,
    getLedgerCount,
    SalesRepresentativeDto,
    getSalesRepresentatives,
    DepartmentDto,
    getDepartments,
    ClientDto,
    getClients
} from '../services/api';
import { useTheme } from '../context/ThemeContext';

// AG Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, GridApi, RowClassRules, IRowNode } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

// SearchableDropdown removed (replaced by AG Grid standard editing for now)

// ---------------------------------------------

interface LedgerMasterEnhancedProps {
    ledgerGroupId: number;
    ledgerGroupName: string;
}

const LedgerMasterEnhanced: React.FC<LedgerMasterEnhancedProps> = ({ ledgerGroupId, ledgerGroupName }) => {
    const { isDark } = useTheme();

    const [ledgerData, setLedgerData] = useState<LedgerMasterDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [validationResult, setValidationResult] = useState<LedgerValidationResultDto | null>(null);
    const [mode, setMode] = useState<'idle' | 'loaded' | 'preview' | 'validated'>('idle');
    const [filterType, setFilterType] = useState<'all' | 'valid' | 'duplicate' | 'missing' | 'mismatch' | 'invalid'>('all');
    const [countryStates, setCountryStates] = useState<CountryStateDto[]>([]);
    const [salesRepresentatives, setSalesRepresentatives] = useState<SalesRepresentativeDto[]>([]);
    const [departments, setDepartments] = useState<DepartmentDto[]>([]);
    const [clients, setClients] = useState<ClientDto[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingMode, setPendingMode] = useState<{ type: 'load' | 'upload'; action: () => void } | null>(null);
    const [showModeSwitchModal, setShowModeSwitchModal] = useState(false);

    // Clear Data Flow State
    const [clearFlowStep, setClearFlowStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [clearCredentials, setClearCredentials] = useState({ username: '', password: '', reason: '' });

    // Re-Upload Confirmation State
    const [showReUploadModal, setShowReUploadModal] = useState(false);

    // Standard Error Modal State
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState<string>('');

    const showError = (message: string) => {
        setErrorModalMessage(message);
        setShowErrorModal(true);
    };

    // Success Popup State (Import)
    const [successInfo, setSuccessInfo] = useState<{ rowCount: number; groupName: string } | null>(null);

    // Clear Success Popup State
    const [clearSuccessInfo, setClearSuccessInfo] = useState<{ rowCount: number; groupName: string } | null>(null);

    // No Data Popup State
    const [noDataPopupGroup, setNoDataPopupGroup] = useState<string | null>(null);

    // CAPTCHA State
    const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState(false);

    // Generate CAPTCHA
    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 50) + 20; // 20-70
        const num2 = Math.floor(Math.random() * 30) + 10; // 10-40
        const answer = num1 - num2;
        setCaptchaQuestion({ num1, num2, answer });
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
            setIsLoading(true);
            const count = await getLedgerCount(ledgerGroupId);
            setIsLoading(false);

            if (count === 0) {
                setNoDataPopupGroup(`${ledgerGroupName} Ledger Group`);
                return;
            }
        }
        setClearFlowStep(1);
        generateCaptcha();
    };

    const handleClearConfirm = () => {
        // Validate CAPTCHA
        const userAnswer = parseInt(captchaInput);
        if (isNaN(userAnswer) || userAnswer !== captchaQuestion.answer) {
            setCaptchaError(true);
            toast.error('❌ Incorrect CAPTCHA answer. Please try again.');
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
            let deletedCount = 0;
            try {
                const response = await clearAllLedgerData(ledgerGroupId, clearCredentials.username, clearCredentials.password, clearCredentials.reason);
                deletedCount = response.deletedCount || 0;
            } catch (clearError: any) {
                // If clear fails specifically because no data, that's OK for freshUpload
                // But auth errors should still propagate
                if (clearError?.response?.status === 401 || clearError?.response?.status === 403) {
                    throw clearError;
                }
                // Otherwise treat as 0 deleted (DB may have been empty)
                deletedCount = 0;
            }

            if (deletedCount > 0 && clearActionType === 'clearOnly') {
                setClearSuccessInfo({ rowCount: deletedCount, groupName: `${ledgerGroupName} Ledger Group` });
            } else if (deletedCount === 0 && clearActionType === 'clearOnly') {
                toast.success('No existing data to clear.');
            }
            setLedgerData([]);
            setValidationResult(null);
            setMode('idle');

            if (clearActionType === 'freshUpload' && fileInputRef.current) {
                if (deletedCount > 0) {
                    toast.success(`✅ Cleared ${deletedCount} record(s). Opening upload...`);
                } else {
                    toast.success('No existing data to clear. Proceeding...');
                }
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }

            handleClearCancel();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to clear data. Check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const fetchCountryStates = async () => {
            try {
                const data = await getCountryStates();
                setCountryStates(data);
            } catch (error) {
                console.error('Failed to load country/state data', error);
                showError('Failed to load Country/State master data');
            }
        };

        const fetchSalesRepresentatives = async () => {
            try {
                const data = await getSalesRepresentatives();
                setSalesRepresentatives(data);
            } catch (error) {
                console.error('Failed to load sales representatives', error);
            }
        };

        const fetchDepartments = async () => {
            try {
                const data = await getDepartments();
                console.log('Fetched Departments:', data);
                if (Array.isArray(data)) {
                    setDepartments(data);
                } else {
                    console.error('Departments data is not an array:', data);
                    showError('Failed to load departments: Invalid data format');
                }
            } catch (error) {
                console.error('Failed to load departments', error);
                showError('Failed to load Department master data');
            }
        };

        const fetchClients = async () => {
            try {
                const data = await getClients();
                setClients(data);
            } catch (error) {
                console.error('Failed to load clients', error);
            }
        };

        fetchCountryStates();
        fetchSalesRepresentatives();
        fetchDepartments();
        fetchClients();
    }, []);

    // Reset state when Ledger Group changes
    useEffect(() => {
        setLedgerData([]);
        setMode('idle');
        setValidationResult(null);
        setSelectedRows(new Set());
        setFilterType('all');
        setShowValidationModal(false);
        setValidationModalContent(null);
        setFilenameError(null);
        setClearFlowStep(0);
        setClearCredentials({ username: '', password: '', reason: '' });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [ledgerGroupId, ledgerGroupName]);

    // Helper functions for options
    const distinctCountries = useMemo(() => {
        return Array.from(new Set(countryStates.map(cs => cs.country)));
    }, [countryStates]);

    // Validation Map for O(1) lookup by rowIndex
    const validationMap = useMemo(() => {
        if (!validationResult) return new Map<number, LedgerRowValidation>();
        const map = new Map<number, LedgerRowValidation>();
        validationResult.rows.forEach((row: LedgerRowValidation) => {
            if (typeof row.rowIndex === 'number') {
                map.set(row.rowIndex, row);
            }
        });
        return map;
    }, [validationResult]);





    // --- AG Grid Setup ---
    const gridApiRef = useRef<GridApi | null>(null);


    // Column Definitions for AG Grid
    const columnDefs: ColDef[] = useMemo(() => {
        const isSupplier = ledgerGroupName?.toLowerCase().includes('supplier') ?? false;
        const isEmployee = ledgerGroupName?.toLowerCase().includes('employee') ?? false;
        const isConsignee = ledgerGroupName?.toLowerCase().includes('consignee') ?? false;
        const isVendor = ledgerGroupName?.toLowerCase().includes('vendors') ?? false;
        const isTransporter = ledgerGroupName?.toLowerCase().includes('transporters') ?? false;

        return [
            {
                field: 'checkbox',
                headerName: '',
                checkboxSelection: true,
                headerCheckboxSelection: true,
                headerCheckboxSelectionFilteredOnly: true,
                width: 20,
                pinned: 'left',
                lockPosition: false,
                resizable: false,
                suppressMenu: true
            },
            {
                headerName: '#',
                valueGetter: "node.rowIndex + 1",
                width: 30,
                pinned: 'left',
                lockPosition: false,
                resizable: true,
                suppressMenu: true
            },
            { field: 'ledgerName', headerName: 'LedgerName', minWidth: 100 },
            { field: 'mailingName', headerName: 'MailingName' },
            // Consignee Specific
            {
                field: 'clientName',
                headerName: 'ClientName',
                hide: !isConsignee,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: clients.map(c => c.ledgerName || c.LedgerName || '').filter(Boolean)
                }
            },

            { field: 'address1', headerName: 'Address1' },
            { field: 'address2', headerName: 'Address2' },
            { field: 'address3', headerName: 'Address3' },
            {
                field: 'country',
                headerName: 'Country',
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: () => {
                    return {
                        values: distinctCountries
                    };
                }
            },
            {
                field: 'state',
                headerName: 'State',
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: (params: any) => {
                    const selectedCountry = params.data.country;
                    if (!selectedCountry) return { values: [] };

                    const filteredStates = countryStates
                        .filter(cs => cs.country === selectedCountry)
                        .map(cs => cs.state);

                    return {
                        values: filteredStates.sort()
                    };
                }
            },
            { field: 'city', headerName: 'City' },
            { field: 'pincode', headerName: 'Pincode' },
            { field: 'telephoneNo', headerName: 'TelephoneNo' },
            { field: 'email', headerName: 'Email' },
            { field: 'mobileNo', headerName: 'MobileNo' },
            // Employee Specific Columns
            {
                field: 'dateOfBirth',
                headerName: 'DateOfBirth',
                hide: !isEmployee,
                valueFormatter: (params) => {
                    if (!params.value) return '';
                    // Return formatted date or original string if parsing needed
                    // Assuming backend returns ISO string, or Excel returns string/date
                    // Simple display
                    return params.value;
                }
            },
            { field: 'panNo', headerName: 'PANNo' },
            {
                field: 'departmentName',
                headerName: 'DepartmentName',
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: departments.map(d => d.departmentName || d.DepartmentName || '').filter(Boolean)
                },
                hide: !isEmployee
            },
            {
                field: 'designation',
                headerName: 'Designation',
                hide: !isEmployee
            },
            // End Employee Specific

            { field: 'website', headerName: 'Website', hide: isEmployee },
            { field: 'gstNo', headerName: 'GSTNo', hide: isEmployee },
            {
                field: 'currencyCode',
                headerName: 'CurrencyCode',
                hide: !isSupplier && !isVendor
            },
            {
                field: 'salesRepresentative',
                headerName: 'SalesRepresentative',
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: salesRepresentatives.map(sr => sr.employeeName || sr.EmployeeName || '').filter(Boolean)
                },
                hide: isSupplier || isEmployee || isConsignee || isVendor || isTransporter
            },
            { field: 'supplyTypeCode', headerName: 'SupplyTypeCode', hide: isEmployee || isVendor || isTransporter },
            { field: 'gstApplicable', headerName: 'GSTApplicable', cellEditor: 'agCheckboxCellEditor', hide: isEmployee || isConsignee || isTransporter },
            { field: 'refCode', headerName: 'RefCode', hide: isEmployee || isVendor || isTransporter },
            { field: 'gstRegistrationType', headerName: 'GSTRegistrationType', hide: isEmployee || isConsignee || isVendor || isTransporter },
            { field: 'creditDays', headerName: 'CreditDays', hide: isSupplier || isEmployee || isConsignee || isVendor || isTransporter },
            { field: 'deliveredQtyTolerance', headerName: 'DeliveredQtyTolerance', hide: isEmployee || isConsignee || isVendor || isTransporter },
        ];
    }, [ledgerGroupName, distinctCountries, countryStates, salesRepresentatives, departments, clients]);

    // Helper: find matching CellValidation for a column
    const findLedgerCellValidation = useCallback((rowValidation: LedgerRowValidation | undefined, colField: string | undefined, colHeader: string | undefined) => {
        if (!rowValidation?.cellValidations || rowValidation.cellValidations.length === 0) return null;
        // Match by headerName (exact)
        let cellVal = rowValidation.cellValidations.find((cv: any) => cv.columnName === colHeader);
        // Match by field name (case-insensitive)
        if (!cellVal && colField) {
            cellVal = rowValidation.cellValidations.find((cv: any) =>
                cv.columnName?.toLowerCase() === colField.toLowerCase()
            );
        }
        // Match by headerName (case-insensitive)
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
            sortable: false,
            filter: false,
            resizable: true,
            minWidth: 50,
            tooltipValueGetter: (params: any) => {
                const rowIndex = ledgerData.indexOf(params.data);
                if (rowIndex === -1) return null;
                const rowValidation = validationMap.get(rowIndex);
                if (!rowValidation) return null;
                const cellVal = findLedgerCellValidation(rowValidation, params.colDef.field, params.colDef.headerName);
                if (cellVal) return cellVal.validationMessage;
                if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
                    return rowValidation.errorMessage || 'Duplicate row detected';
                }
                return null;
            },
            cellStyle: (params: any): Record<string, string> | null => {
                const rowIndex = ledgerData.indexOf(params.data);
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

                const cellVal = findLedgerCellValidation(rowValidation, params.colDef.field, params.colDef.headerName);
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
    }, [mode, validationMap, isDark, ledgerData, findLedgerCellValidation]);

    const handleCellEdit = useCallback((rowIndex: number, field: keyof LedgerMasterDto, newValue: any) => {
        setLedgerData(prevData => {
            const newData = [...prevData];
            newData[rowIndex] = { ...newData[rowIndex], [field]: newValue };
            return newData;
        });
    }, []);

    const handleCountryChange = useCallback((rowIndex: number, newCountry: string) => {
        setLedgerData(prevData => {
            const newData = [...prevData];
            newData[rowIndex] = { ...newData[rowIndex], country: newCountry, state: '' }; // Reset state if country changes
            return newData;
        });
    }, []);

    const onCellValueChanged = useCallback((params: any) => {
        const { colDef, newValue, data } = params;
        const rowIndex = ledgerData.indexOf(data);

        // Safety check to ensure we found the row
        if (rowIndex === -1) {
            console.error('Row data not found in state');
            return;
        }

        const field = colDef.field as keyof LedgerMasterDto;

        if (field === 'country') {
            handleCountryChange(rowIndex, newValue);
        } else {
            handleCellEdit(rowIndex, field, newValue);
        }
    }, [handleCountryChange, handleCellEdit, ledgerData]);

    const onSelectionChanged = useCallback((event: any) => {
        const selectedNodes = event.api.getSelectedNodes();
        const selectedIndices = new Set<number>(selectedNodes.map((node: any) => node.rowIndex));
        setSelectedRows(selectedIndices);
    }, []);

    const rowClassRules = useMemo<RowClassRules>(() => ({
        'bg-red-50 dark:bg-red-900/10': (params) => {
            if (validationMap.size === 0) return false;
            const rowIndex = ledgerData.indexOf(params.data);
            if (rowIndex === -1) return false;
            return validationMap.get(rowIndex)?.rowStatus === ValidationStatus.Duplicate;
        },
        'font-medium': (params) => {
            if (validationMap.size === 0) return false;
            const rowIndex = ledgerData.indexOf(params.data);
            if (rowIndex === -1) return false;
            return validationMap.get(rowIndex)?.rowStatus === ValidationStatus.Duplicate;
        }
    }), [validationMap, ledgerData]);

    const onGridReady = (params: any) => {
        gridApiRef.current = params.api;
    };


    // External Filter Logic
    const isExternalFilterPresent = useCallback(() => {
        return filterType !== 'all';
    }, [filterType]);

    const doesExternalFilterPass = useCallback((node: IRowNode) => {
        if (!validationResult || filterType === 'all') return true;

        const rowIndex = ledgerData.indexOf(node.data);
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
    }, [validationResult, validationMap, filterType]);

    // Trigger filter update when filterType changes
    // Trigger filter update when filterType changes or validation/data updates
    // Trigger redraw when validation results or data changes
    useEffect(() => {
        if (gridApiRef.current) {
            gridApiRef.current.redrawRows();
        }
    }, [validationResult, ledgerData, validationMap]);

    // Trigger filter update when filterType changes
    useEffect(() => {
        if (gridApiRef.current) {
            gridApiRef.current.onFilterChanged();
        }
    }, [filterType]);


    const handleLoadData = async () => {
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
            const data = await getLedgersByGroup(ledgerGroupId);
            setLedgerData(data);
            setMode(data.length > 0 ? 'loaded' : 'idle');
            setValidationResult(null); // Clear validation
            setSelectedRows(new Set()); // Clear selection
            if (data.length === 0) {
                setNoDataMessage(`No data found in database against the selected ${ledgerGroupName}`);
            } else {
                toast.success(`Loaded ${data.length} ledger(s)`);
            }
        } catch (error: any) {
            showError(error?.response?.data?.error || 'Failed to load data');
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
                    setLedgerData([]);
                    setMode('idle');
                    setValidationResult(null);
                    setSelectedRows(new Set());
                    if (fileInputRef.current) fileInputRef.current.click();
                }
            });
            setShowModeSwitchModal(true);
            return;
        }

        // Re-Upload Confirmation (Excel Mode)
        if (ledgerData.length > 0 && (mode === 'preview' || mode === 'validated')) {
            setShowReUploadModal(true);
            return;
        }

        // Otherwise just click
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const confirmReUpload = () => {
        setShowReUploadModal(false);
        setLedgerData([]);
        setValidationResult(null);
        setMode('idle');
        setSelectedRows(new Set());
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset input
            fileInputRef.current.click();
        }
    };



    const handleRemoveRow = async () => {
        const selectedNodes = gridApiRef.current?.getSelectedNodes() || [];
        if (selectedNodes.length === 0) {
            showError('Please select at least one row to remove');
            return;
        }

        if (!window.confirm(`Are you sure you want to remove ${selectedNodes.length} ledger(s)?`)) {
            return;
        }

        // Gather indices or IDs to remove
        // Important: Use node.rowIndex if we assume 1:1 mapping with ledgerData (checked via isExternalFilterPresent)
        // With filtering, rowIndex might not match original index?
        // Actually, if we use rowData={ledgerData}, node.rowIndex corresponds to index in ledgerData IF no sorting/filtering is active?
        // NO, sorting changes row index in view.
        // We must identify rows by reference or add an ID.
        // Since ledgerData objects are references, we can find them.

        const selectedData = selectedNodes.map(node => node.data);
        const selectedIndices = new Set(selectedData.map(d => ledgerData.indexOf(d)).filter(i => i !== -1));

        if (mode === 'preview' || mode === 'validated') {
            const newLedgerData = ledgerData.filter((_, index) => !selectedIndices.has(index));
            setLedgerData(newLedgerData);
            setValidationResult(null); // Reset validation as indices shift
            setMode('preview');
            toast.success(`Removed ${selectedIndices.size} row(s). Please re-run validation.`);
            return;
        }

        setIsLoading(true);
        try {
            const rowsToDelete = selectedData;

            let deletedCount = 0;
            for (const ledger of rowsToDelete) {
                if (ledger.ledgerID) {
                    await softDeleteLedger(ledger.ledgerID);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                toast.success(`Successfully removed ${deletedCount} ledger(s) from database`);
                await handleLoadData();
            } else {
                toast.error('No database records were selected for deletion');
            }
        } catch (error: any) {
            showError(error?.response?.data?.error || 'Failed to remove ledgers');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const expectedFilename = `${ledgerGroupName}.xlsx`;
        if (file.name !== expectedFilename) {
            setFilenameError(`Please correct your Excel file name according to the selected Ledger Group. Expected: ${expectedFilename}`);
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

                const ledgers: LedgerMasterDto[] = jsonData.map((row: any) => {
                    let country = row.Country;
                    let state = row.State;

                    if (country) {
                        const masterCountryPair = countryStates.find(cs => cs.country.trim().toLowerCase() === country.toString().trim().toLowerCase());
                        if (masterCountryPair) {
                            country = masterCountryPair.country;

                            if (state) {
                                const masterStatePair = countryStates.find(cs =>
                                    cs.country === country &&
                                    cs.state.trim().toLowerCase() === state.toString().trim().toLowerCase()
                                );
                                if (masterStatePair) {
                                    state = masterStatePair.state;
                                }
                            }
                        }
                    }

                    let gstApplicable = true;
                    if (row.GSTApplicable !== undefined && row.GSTApplicable !== null && row.GSTApplicable !== '') {
                        gstApplicable = row.GSTApplicable === true || row.GSTApplicable === 'true' || row.GSTApplicable === 1;
                    }

                    let supplyTypeCode = 'B2B';
                    if (row.SupplyTypeCode !== undefined && row.SupplyTypeCode !== null && row.SupplyTypeCode !== '') {
                        supplyTypeCode = row.SupplyTypeCode;
                    }

                    // Format DateOfBirth
                    let dateOfBirth = row.DateOfBirth;
                    if (dateOfBirth && typeof dateOfBirth === 'number') {
                        // Excel serial date to JS Date
                        const date = new Date(Math.round((dateOfBirth - 25569) * 86400 * 1000));
                        dateOfBirth = date.toISOString().split('T')[0];
                    }

                    // Determine DepartmentName and Designation with fallback
                    // Sometimes Excel headers might have spaces or case differences
                    const departmentName = row.DepartmentName || row['Department Name'] || row['DEPARTMENT NAME'] || row.departmentname;
                    const designation = row.Designation || row.designation || row.DESIGNATION;

                    // ClientName for Consignee
                    const clientName = row.ClientName || row['Client Name'] || row.clientName;

                    let refCode = row.RefCode || '';

                    let gstRegistrationType = 'Regular';
                    if (row.GSTRegistrationType !== undefined && row.GSTRegistrationType !== null && row.GSTRegistrationType !== '') {
                        gstRegistrationType = row.GSTRegistrationType;
                    }

                    let creditDays = 0;
                    if (row.CreditDays !== undefined && row.CreditDays !== null && row.CreditDays !== '') {
                        creditDays = parseInt(row.CreditDays) || 0;
                    }

                    const legalName = row.MailingName;

                    const addressParts = [row.Address1, row.Address2, row.Address3].filter(p => p && p.toString().trim() !== '');

                    const cityPinParts = [];
                    if (row.City && row.City.toString().trim() !== '') cityPinParts.push(row.City);
                    if (row.Pincode && row.Pincode.toString().trim() !== '') cityPinParts.push(row.Pincode);
                    if (cityPinParts.length > 0) addressParts.push(cityPinParts.join('-'));

                    const stateCountryParts = [];
                    if (state && state.toString().trim() !== '') stateCountryParts.push(state);
                    if (country && country.toString().trim() !== '') stateCountryParts.push(country);
                    if (stateCountryParts.length > 0) addressParts.push(stateCountryParts.join(' - '));

                    const mailingAddress = addressParts.join(', ');

                    // Helper to safely convert to string
                    const toStr = (v: any) => (v !== undefined && v !== null && v !== '') ? String(v) : undefined;

                    return {
                        ledgerGroupID: ledgerGroupId,
                        ledgerName: toStr(row.LedgerName),
                        mailingName: toStr(row.MailingName),
                        legalName: toStr(legalName),
                        mailingAddress: mailingAddress,
                        address1: toStr(row.Address1),
                        address2: toStr(row.Address2),
                        address3: toStr(row.Address3),
                        country: toStr(country),
                        state: toStr(state),
                        city: toStr(row.City),
                        pincode: toStr(row.Pincode),
                        telephoneNo: toStr(row.TelephoneNo),
                        email: toStr(row.Email),
                        mobileNo: toStr(row.MobileNo),
                        website: toStr(row.Website),
                        panNo: toStr(row.PANNo),
                        gstNo: toStr(row.GSTNo),
                        salesRepresentative: toStr(row.SalesRepresentative),
                        supplyTypeCode: String(supplyTypeCode),
                        gstApplicable: gstApplicable,
                        refCode: String(refCode),
                        gstRegistrationType: String(gstRegistrationType),
                        creditDays: creditDays,
                        deliveredQtyTolerance: (row.DeliveredQtyTolerance && !isNaN(parseFloat(row.DeliveredQtyTolerance))) ? parseFloat(row.DeliveredQtyTolerance) : undefined,
                        currencyCode: toStr(row.CurrencyCode),

                        // Employee Fields
                        departmentName: toStr(departmentName),
                        designation: toStr(designation),
                        dateOfBirth: toStr(dateOfBirth),

                        // Consignee Fields
                        clientName: toStr(clientName)
                    };
                }).filter(item => {
                    // Remove empty rows: check if any core field has actual data
                    return !!(
                        item.ledgerName || item.mailingName || item.address1 ||
                        item.city || item.gstNo || item.mobileNo || item.email ||
                        item.panNo || item.clientName || item.departmentName
                    );
                });

                setLedgerData(ledgers);
                setMode('preview');
                toast.success(`Loaded ${ledgers.length} rows from Excel`);
            } catch (error) {
                showError('Failed to parse Excel file');
                console.error(error);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Reusable: clean ledger data for API — extracts invalid numeric/bool values into rawValues
    const cleanLedgerDataForApi = useCallback((data: any[]) => {
        const numericFields = new Set(['deliveredQtyTolerance', 'distance', 'creditDays']);
        const boolFields = new Set(['gstApplicable']);

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
                } else if (boolFields.has(key)) {
                    const strVal = String(value).trim().toLowerCase();
                    if (['true', 'false', '1', '0', 'yes', 'no'].includes(strVal)) {
                        cleaned[key] = strVal === 'true' || strVal === '1' || strVal === 'yes';
                    } else {
                        rawValues[key] = String(value).trim();
                    }
                } else {
                    // Ensure all string fields are sent as strings
                    cleaned[key] = typeof value === 'number' ? String(value) : value;
                }
            });

            if (Object.keys(rawValues).length > 0) {
                cleaned.rawValues = rawValues;
            }
            return cleaned;
        });
    }, []);

    const handleCheckValidation = async () => {
        if (ledgerData.length === 0) {
            showError('No data to validate');
            return;
        }

        setIsLoading(true);
        setValidationResult(null); // Reset UI first

        try {
            const cleanedData = cleanLedgerDataForApi(ledgerData);
            const result = await validateLedgers(cleanedData, ledgerGroupId);
            setValidationResult(result);

            if (result.isValid) {
                toast.success('All validations passed! Ready to import.');
            } else {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount;

                // Aggregate failures by column
                const columnFailures = new Map<string, Set<string>>();

                result.rows.forEach((row: LedgerRowValidation) => {
                    // 1. Handle Duplicates (Row Level)
                    if (row.rowStatus === ValidationStatus.Duplicate) {
                        // Attribute duplicate to LedgerName as primary indicator
                        const col = 'LedgerName';
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
                            else if (cell.status === ValidationStatus.InvalidContent) reason = "Single quote (') and double quote (\") are not allowed.";

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
            }
        } catch (error: any) {
            showError(error?.response?.data?.error || 'Validation failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (ledgerData.length === 0) {
            showError('No data to import');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Full Re-Validation (with same cleaning)
            const cleanedForValidation = cleanLedgerDataForApi(ledgerData);
            const result = await validateLedgers(cleanedForValidation, ledgerGroupId);
            setValidationResult(result);

            if (!result.isValid) {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount;

                // Aggregate failures by column (Copy of Check Validation Logic)
                const columnFailures = new Map<string, Set<string>>();

                result.rows.forEach((row: LedgerRowValidation) => {
                    // 1. Handle Duplicates (Row Level)
                    if (row.rowStatus === ValidationStatus.Duplicate) {
                        const col = 'LedgerName';
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
                            else if (cell.status === ValidationStatus.InvalidContent) reason = "Single quote (') and double quote (\") are not allowed.";

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
                return; // ABORT SAVE
            }

            // 3. Perform Import (with cleaned data)
            const cleanedForImport = cleanLedgerDataForApi(ledgerData);
            const importRes = await importLedgers(cleanedForImport, ledgerGroupId);

            if (importRes.success) {
                // Show success popup
                setSuccessInfo({ rowCount: importRes.importedRows ?? ledgerData.length, groupName: ledgerGroupName });

                // If some rows failed, also show failed rows list after success popup
                if (importRes.errorRows > 0 && importRes.errorMessages && importRes.errorMessages.length > 0) {
                    setValidationModalContent({
                        title: `${importRes.errorRows} Row(s) Failed During Import`,
                        messages: importRes.errorMessages
                    });
                    // Show validation modal after user closes success popup (handled in success popup OK click)
                }
            } else {
                if (importRes.errorMessages && importRes.errorMessages.length > 0) {
                    setValidationModalContent({
                        title: 'Import Failed',
                        messages: importRes.errorMessages
                    });
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
        if (ledgerData.length === 0) {
            showError('No data to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(ledgerGroupName || 'Sheet1');

        const isSupplier = ledgerGroupName?.toLowerCase().includes('supplier');
        const isEmployee = ledgerGroupName?.toLowerCase().includes('employee');
        const isConsignee = ledgerGroupName?.toLowerCase().includes('consignee');
        const isVendor = ledgerGroupName?.toLowerCase().includes('vendors');
        const isTransporter = ledgerGroupName?.toLowerCase().includes('transporters');

        const exportColumns = [
            'LedgerName', 'MailingName'
        ];

        if (isConsignee) {
            exportColumns.push('ClientName');
        }

        exportColumns.push('Address1', 'Address2', 'Address3', 'Country', 'State', 'City', 'Pincode', 'TelephoneNo', 'Email', 'MobileNo');

        if (isEmployee) {
            exportColumns.push('DateOfBirth');
            exportColumns.push('PANNo');
            exportColumns.push('DepartmentName');
            exportColumns.push('Designation');
        } else {
            // Supplier, Customer, Consignee
            exportColumns.push('Website');
            exportColumns.push('PANNo');
            exportColumns.push('GSTNo');
        }

        if (isSupplier || isVendor) {
            exportColumns.push('CurrencyCode');
        } else if (!isEmployee && !isConsignee && !isTransporter) {
            exportColumns.push('SalesRepresentative');
        }

        if (!isEmployee) {
            if (!isVendor && !isTransporter) {
                exportColumns.push('SupplyTypeCode');
            }

            if (!isConsignee && !isTransporter) {
                exportColumns.push('GSTApplicable');
                if (!isVendor) {
                    exportColumns.push('GSTRegistrationType');
                }
            }
            if (!isVendor && !isTransporter) {
                exportColumns.push('RefCode');
            }
        }

        if (!isSupplier && !isEmployee && !isConsignee && !isVendor && !isTransporter) {
            exportColumns.push('CreditDays');
        }

        if (!isEmployee && !isConsignee && !isVendor && !isTransporter) {
            exportColumns.push('DeliveredQtyTolerance');
        }

        worksheet.columns = exportColumns.map(col => ({ header: col, key: col, width: 20 }));
        worksheet.getRow(1).font = { bold: true };

        ledgerData.forEach((ledger) => {
            const rowValues: any = {
                LedgerName: ledger.ledgerName,
                MailingName: ledger.mailingName,
                Address1: ledger.address1,
                Address2: ledger.address2,
                Address3: ledger.address3,
                Country: ledger.country,
                State: ledger.state,
                City: ledger.city,
                Pincode: ledger.pincode,
                TelephoneNo: ledger.telephoneNo,
                Email: ledger.email,
                MobileNo: ledger.mobileNo,
                PANNo: ledger.panNo
            };

            if (isConsignee) {
                rowValues.ClientName = ledger.clientName;
            }

            if (isEmployee) {
                rowValues.DateOfBirth = ledger.dateOfBirth;
                rowValues.DepartmentName = ledger.departmentName;
                rowValues.Designation = ledger.designation;
            } else {
                rowValues.Website = ledger.website;
                rowValues.GSTNo = ledger.gstNo;
                rowValues.PANNo = ledger.panNo; // Ensure PAN is mapped
                if (!isVendor && !isTransporter) {
                    rowValues.RefCode = ledger.refCode;
                }

                if (!isConsignee && !isTransporter) {
                    rowValues.GSTApplicable = ledger.gstApplicable;
                    if (!isVendor) {
                        rowValues.GSTRegistrationType = ledger.gstRegistrationType;
                        rowValues.DeliveredQtyTolerance = ledger.deliveredQtyTolerance;
                    }
                }

                // SupplyTypeCode logic
                if (!isEmployee && !isVendor && !isTransporter) {
                    rowValues.SupplyTypeCode = ledger.supplyTypeCode;
                }
            }

            if (isSupplier || isVendor) {
                rowValues.CurrencyCode = ledger.currencyCode;
            } else if (!isEmployee && !isConsignee && !isTransporter) {
                rowValues.SalesRepresentative = ledger.salesRepresentative;
                rowValues.CreditDays = ledger.creditDays;
            }

            worksheet.addRow(rowValues);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${ledgerGroupName}.xlsx`);
        toast.success('Data exported successfully');
    };

    // Display rows now handled by AG Grid Filtering

    // Display rows now handled by AG Grid Filtering
    // const displayRows = getFilteredRows(); moved to doesExternalFilterPass logic



    return (
        <div className="space-y-4">

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
                                {successInfo.rowCount === 1 ? 'row' : 'rows'} into <span className="font-semibold text-gray-800 dark:text-white">{successInfo.groupName} Ledger Group</span>
                            </p>
                            <button
                                onClick={() => {
                                    setSuccessInfo(null);
                                    setLedgerData([]);
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
                        setLedgerData([]);
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

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={handleLoadData}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <Database className="w-4 h-4" />
                    Load Data
                </button>

                <button
                    onClick={() => handleClearAllDataTrigger('clearOnly')}
                    disabled={isLoading || selectedRows.size > 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <XCircle className="w-4 h-4" />
                    Clear All Data
                </button>

                {mode === 'loaded' ? (
                    <button
                        onClick={handleRemoveRow}
                        disabled={isLoading || selectedRows.size === 0}
                        className="px-4 py-2 bg-[#D2691E] text-white rounded-lg hover:bg-[#A55217] disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Soft Delete ({selectedRows.size})
                    </button>
                ) : (mode === 'preview' || mode === 'validated') && (
                    <button
                        onClick={handleRemoveRow}
                        disabled={isLoading || selectedRows.size === 0}
                        className="px-4 py-2 bg-[#D2691E] text-white rounded-lg hover:bg-[#A55217] disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Excel Row ({selectedRows.size})
                    </button>
                )}

                <button
                    onClick={() => handleClearAllDataTrigger('freshUpload')}
                    disabled={isLoading}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <FilePlus2 className="w-4 h-4" />
                    Fresh Upload
                </button>



                <button
                    onClick={handleFileSelectTrigger}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Existing Upload
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {(mode === 'loaded' || mode === 'preview' || mode === 'validated') && (
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                )}

                {(mode === 'preview' || mode === 'validated') && (
                    <>
                        <button
                            onClick={handleCheckValidation}
                            disabled={isLoading}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Check Validation
                        </button>
                    </>
                )}

                {validationResult?.isValid && (
                    <button
                        onClick={handleImport}
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 flex items-center gap-2 transition-colors animate-pulse"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Save Data
                    </button>
                )}
            </div>

            {validationResult && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
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

                    {/* Detailed Invalid Content Errors */}
                    {filterType === 'invalid' && (validationResult.summary.invalidContentCount ?? 0) > 0 && (
                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg max-h-48 overflow-y-auto">
                            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">Invalid Content Details:</h4>
                            <div className="space-y-1">
                                {validationResult.rows
                                    .filter((row: LedgerRowValidation) => row.rowStatus === ValidationStatus.InvalidContent)
                                    .flatMap((row: LedgerRowValidation) =>
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
                                    .filter((row: LedgerRowValidation) => row.rowStatus === ValidationStatus.InvalidContent)
                                    .reduce((count: number, row: LedgerRowValidation) =>
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

            {/* Grid Section - Show if data exists OR if explicitly loaded (even if empty) */}
            {(ledgerData.length > 0 || mode === 'loaded' || mode === 'validated') && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e293b]">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {mode === 'loaded' ? 'Database Records' : 'Excel Preview'} ({ledgerData.length} rows)
                        </h3>
                        {(mode === 'preview' || mode === 'validated') && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                📝 {validationResult ? 'Edit cells and re-run validation as needed' : 'Click any cell to edit the data directly before validation'}
                                {(validationResult?.summary?.invalidContentCount ?? 0) > 0 &&
                                    <span className="ml-2 text-purple-600 dark:text-purple-400 font-bold">
                                        ⚠️ Special characters found! Please remove single/double quotes.
                                    </span>
                                }
                            </p>
                        )}
                    </div>

                    <div
                        className={isDark ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
                        style={{ height: 600, width: '100%' }}
                    >
                        <style>{`
                            /* Shared Base Styles */
                            .ag-theme-quartz, .ag-theme-quartz-dark {
                                --ag-grid-size: 8px;
                                --ag-list-item-height: 40px;
                                --ag-row-height: 48px;
                                --ag-header-height: 52px;
                                --ag-font-size: 14px;
                                --ag-font-family: 'Inter', system-ui, sans-serif;
                                
                                /* Border Structure */
                                --ag-borders: solid 1px;
                                --ag-row-border-style: solid;
                                --ag-row-border-width: 1px;
                                
                                /* Resize Handles & Separators */
                                --ag-header-column-separator-display: block;
                                --ag-header-column-separator-height: 50%;
                                --ag-header-column-separator-width: 1px;
                                --ag-header-column-separator-color: var(--ag-border-color);
                                
                                --ag-header-column-resize-handle-display: block;
                                --ag-header-column-resize-handle-height: 100%;
                                --ag-header-column-resize-handle-width: 2px;
                                --ag-header-column-resize-handle-color: var(--ag-border-color);
                            }

                            /* Light Theme Specifics */
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

                            /* Dark Theme Specifics */
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

                            /* Universal Improvements */
                            .ag-header-cell {
                                border-right: 1px solid var(--ag-border-color);
                            }
                            
                            .ag-header-cell-text {
                                font-weight: 600;
                            }
                            
                            /* Sticky visuals for pinned columns */
                            .ag-pinned-left-header, .ag-pinned-left-cols-container {
                                box-shadow: 4px 0 8px -4px rgba(0,0,0,0.2);
                                border-right: 1px solid var(--ag-border-color);
                                z-index: 10 !important;
                            }

                            /* Center No Rows Message */
                            .ag-overlay-no-rows-center {
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100%;
                                font-size: 1.125rem;
                                color: #64748b;
                                font-weight: 500;
                            }
                            .ag-theme-quartz-dark .ag-overlay-no-rows-center {
                                color: #94a3b8;
                            }
                        `}</style>
                        <AgGridReact
                            rowData={ledgerData}
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
                            paginationPageSize={20}
                            paginationPageSizeSelector={[20, 50, 100]}
                            enableCellTextSelection={true}
                            ensureDomOrder={true}
                            tooltipShowDelay={300}
                            tooltipInteraction={true}
                            overlayNoRowsTemplate={`<div class="ag-overlay-no-rows-center">No records found</div>`}
                        />
                    </div>
                </div>
            )}

            {ledgerData.length === 0 && mode === 'idle' && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <Database className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Data Loaded</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Load data from database or import from Excel file
                    </p>
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
                            {clearFlowStep === 1 && `Are you sure you want to clear all the ${ledgerGroupName} data?`}
                            {clearFlowStep === 2 && "Discussed with the client that the data needs to be cleared?"}
                            {clearFlowStep === 3 && "Have you received an email from your client asking to clear the data?"}
                        </p>

                        {/* CAPTCHA */}
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

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleClearCancel}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
                            >
                                No, Cancel
                            </button>
                            <button
                                onClick={handleClearConfirm}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                            >
                                Yes, Proceed
                            </button>
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
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    value={clearCredentials.username}
                                    onChange={e => setClearCredentials({ ...clearCredentials, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <input
                                    type="password"

                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    value={clearCredentials.password}
                                    onChange={e => setClearCredentials({ ...clearCredentials, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Deletion</label>
                                <textarea
                                    required
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white h-24"
                                    placeholder="Please explicitly state why data is being cleared..."
                                    value={clearCredentials.reason}
                                    onChange={e => setClearCredentials({ ...clearCredentials, reason: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={handleClearCancel}
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

            {/* Filename Error Popup */}
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

            {/* No Data Found Modal */}
            {noDataMessage && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 text-center animate-in fade-in zoom-in duration-200">
                        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Data Found</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                            {noDataMessage}
                        </p>
                        <button
                            onClick={() => setNoDataMessage(null)}
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                        >
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
        </div>
    );
};

export default LedgerMasterEnhanced;
