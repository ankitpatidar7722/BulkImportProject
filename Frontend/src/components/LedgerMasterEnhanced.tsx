import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
    SalesRepresentativeDto,
    getSalesRepresentatives
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clear Data Flow State
    const [clearFlowStep, setClearFlowStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [clearCredentials, setClearCredentials] = useState({ username: '', password: '', reason: '' });
    const [filenameError, setFilenameError] = useState<string | null>(null);

    const handleClearAllDataTrigger = () => {
        setClearFlowStep(1);
    };

    const handleClearConfirm = () => {
        if (clearFlowStep < 3) {
            setClearFlowStep((prev) => (prev + 1) as any);
        } else {
            setClearFlowStep(4); // Show Credential Popup
        }
    };

    const handleClearCancel = () => {
        setClearFlowStep(0);
        setClearCredentials({ username: '', password: '', reason: '' });
    };

    const handleCredentialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            await clearAllLedgerData(ledgerGroupId, clearCredentials.username, clearCredentials.password, clearCredentials.reason);
            toast.success('All data cleared successfully');
            setLedgerData([]);
            setValidationResult(null);
            setMode('idle');
            setMode('idle');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                // Automatically trigger file selection after fresh load
                fileInputRef.current.click();
            }
            handleClearCancel();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to clear data. Check credentials.');
            // Only close if successful? No, keep open on error to retry
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
                toast.error('Failed to load Country/State master data');
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

        fetchCountryStates();
        fetchSalesRepresentatives();
    }, []);

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
        return [
            {
                field: 'checkbox',
                headerName: '',
                checkboxSelection: true,
                headerCheckboxSelection: true,
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
            { field: 'website', headerName: 'Website' },
            { field: 'panNo', headerName: 'PANNo' },
            { field: 'gstNo', headerName: 'GSTNo' },
            {
                field: 'currencyCode',
                headerName: 'CurrencyCode',
                hide: !ledgerGroupName.toLowerCase().includes('supplier')
            },
            {
                field: 'salesRepresentative',
                headerName: 'SalesRepresentative',
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: salesRepresentatives.map(sr => sr.employeeName || sr.EmployeeName || '').filter(Boolean)
                },
                hide: ledgerGroupName.toLowerCase().includes('supplier')
            },
            { field: 'supplyTypeCode', headerName: 'SupplyTypeCode' },
            { field: 'gstApplicable', headerName: 'GSTApplicable', cellEditor: 'agCheckboxCellEditor' },
            { field: 'refCode', headerName: 'RefCode' },
            { field: 'gstRegistrationType', headerName: 'GSTRegistrationType' },
            {
                field: 'creditDays',
                headerName: 'CreditDays',
                hide: ledgerGroupName.toLowerCase().includes('supplier')
            },
            { field: 'deliveredQtyTolerance', headerName: 'DeliveredQtyTolerance' }
        ];
    }, [distinctCountries, countryStates, salesRepresentatives, ledgerGroupName]);

    const defaultColDef = useMemo(() => {
        return {
            editable: () => mode === 'preview' || mode === 'validated',
            sortable: false, // Disable sorting to keep index alignment with validationResult
            filter: false, // Disable filtering for now
            resizable: true,
            minWidth: 50,
            cellStyle: (params: any) => {
                // Use data index for stable lookup (node.rowIndex changes with filter/sort)
                const rowIndex = ledgerData.indexOf(params.data);
                if (rowIndex === -1) return null;

                // Color mapping for validation status
                const colors = {
                    duplicate: isDark ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2',     // Red
                    missing: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe',       // Blue
                    mismatch: isDark ? 'rgba(202, 138, 4, 0.2)' : '#fef9c3',      // Yellow
                    invalid: isDark ? 'rgba(147, 51, 234, 0.2)' : '#f3e8ff'       // Purple
                };

                // Get row validation from map
                const rowValidation = validationMap.get(rowIndex);

                // row style for duplicate from validation
                if (rowValidation?.rowStatus === ValidationStatus.Duplicate) {
                    return { backgroundColor: colors.duplicate };
                }
                if (rowValidation?.rowStatus === ValidationStatus.InvalidContent) {
                    return { backgroundColor: colors.invalid };
                }

                // cell specific style
                const colHeader = params.colDef.headerName; // This must match the validation column name (PascalCase)
                if (rowValidation?.cellValidations) {
                    const cellVal = rowValidation.cellValidations.find((cv: any) => cv.columnName === colHeader);
                    if (cellVal) {
                        if (cellVal.status === ValidationStatus.MissingData) return { backgroundColor: colors.missing };
                        if (cellVal.status === ValidationStatus.Mismatch) return { backgroundColor: colors.mismatch };
                        if (cellVal.status === ValidationStatus.InvalidContent) return { backgroundColor: colors.invalid };
                    }
                }
                return null;
            }
        };
    }, [mode, validationMap, isDark, ledgerData]);

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
        const { node, colDef, newValue } = params;
        const rowIndex = node.rowIndex;
        const field = colDef.field as keyof LedgerMasterDto;

        if (field === 'country') {
            handleCountryChange(rowIndex, newValue);
        } else {
            handleCellEdit(rowIndex, field, newValue);
        }
    }, [handleCountryChange, handleCellEdit]);

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
            case 'missing': return rowValidation.rowStatus === ValidationStatus.MissingData;
            case 'mismatch': return rowValidation.rowStatus === ValidationStatus.Mismatch;
            case 'invalid': return rowValidation.rowStatus === ValidationStatus.InvalidContent;
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
        setIsLoading(true);
        try {
            const data = await getLedgersByGroup(ledgerGroupId);
            setLedgerData(data);
            setMode('loaded');
            toast.success(`Loaded ${data.length} ledger(s)`);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };



    const handleRemoveRow = async () => {
        const selectedNodes = gridApiRef.current?.getSelectedNodes() || [];
        if (selectedNodes.length === 0) {
            toast.error('Please select at least one row to remove');
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
            toast.error(error?.response?.data?.error || 'Failed to remove ledgers');
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

                    return {
                        ledgerGroupID: ledgerGroupId,
                        ledgerName: row.LedgerName ? String(row.LedgerName) : undefined,
                        mailingName: row.MailingName ? String(row.MailingName) : undefined,
                        legalName: legalName ? String(legalName) : undefined,
                        mailingAddress: mailingAddress,
                        address1: row.Address1 ? String(row.Address1) : undefined,
                        address2: row.Address2 ? String(row.Address2) : undefined,
                        address3: row.Address3 ? String(row.Address3) : undefined,
                        country: country,
                        state: state,
                        city: row.City ? String(row.City) : undefined,
                        pincode: row.Pincode ? String(row.Pincode) : undefined,
                        telephoneNo: row.TelephoneNo ? String(row.TelephoneNo) : undefined,
                        email: row.Email ? String(row.Email) : undefined,
                        mobileNo: row.MobileNo ? String(row.MobileNo) : undefined,
                        website: row.Website ? String(row.Website) : undefined,
                        panNo: row.PANNo ? String(row.PANNo) : undefined,
                        gstNo: row.GSTNo ? String(row.GSTNo) : undefined,
                        salesRepresentative: row.SalesRepresentative ? String(row.SalesRepresentative) : undefined,
                        supplyTypeCode: String(supplyTypeCode),
                        gstApplicable: gstApplicable,
                        refCode: String(refCode),
                        gstRegistrationType: String(gstRegistrationType),
                        creditDays: creditDays,
                        deliveredQtyTolerance: (row.DeliveredQtyTolerance && !isNaN(parseFloat(row.DeliveredQtyTolerance))) ? parseFloat(row.DeliveredQtyTolerance) : undefined,
                        currencyCode: row.CurrencyCode ? String(row.CurrencyCode) : undefined
                    };
                });

                setLedgerData(ledgers);
                setMode('preview');
                toast.success(`Loaded ${ledgers.length} rows from Excel`);
            } catch (error) {
                toast.error('Failed to parse Excel file');
                console.error(error);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleCheckValidation = async () => {
        if (ledgerData.length === 0) {
            toast.error('No data to validate');
            return;
        }

        setIsLoading(true);
        try {
            const result = await validateLedgers(ledgerData, ledgerGroupId);
            setValidationResult(result);

            if (result.isValid) {
                toast.success('All validations passed! Ready to import.');
            } else {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount;
                toast.error(`Validation completed with ${totalIssues} issues`);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Validation failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (!validationResult?.isValid) {
            toast.error('Please fix all validation errors before importing');
            return;
        }

        if (!window.confirm(`Import ${ledgerData.length} ledger(s)?`)) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await importLedgers(ledgerData, ledgerGroupId);
            toast.success(result.message);
            setLedgerData([]);
            setValidationResult(null);
            setMode('idle');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Import failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        if (ledgerData.length === 0) {
            toast.error('No data to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(ledgerGroupName || 'Sheet1');

        const isSupplier = ledgerGroupName?.toLowerCase().includes('supplier');

        const exportColumns = [
            'LedgerName', 'MailingName', 'Address1', 'Address2', 'Address3',
            'Country', 'State', 'City', 'Pincode', 'TelephoneNo', 'Email',
            'MobileNo', 'Website', 'PANNo', 'GSTNo'
        ];

        if (isSupplier) {
            exportColumns.push('CurrencyCode');
        } else {
            exportColumns.push('SalesRepresentative');
        }

        exportColumns.push('SupplyTypeCode');
        exportColumns.push('GSTApplicable');
        exportColumns.push('RefCode');
        exportColumns.push('GSTRegistrationType');

        if (!isSupplier) {
            exportColumns.push('CreditDays');
        }

        exportColumns.push('DeliveredQtyTolerance');

        worksheet.columns = exportColumns.map(col => ({ header: col, key: col, width: 20 }));
        worksheet.getRow(1).font = { bold: true };

        ledgerData.forEach((ledger, index) => {
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
                Website: ledger.website,
                PANNo: ledger.panNo,
                GSTNo: ledger.gstNo,
                SupplyTypeCode: ledger.supplyTypeCode,
                GSTApplicable: ledger.gstApplicable,
                RefCode: ledger.refCode,
                GSTRegistrationType: ledger.gstRegistrationType,
                DeliveredQtyTolerance: ledger.deliveredQtyTolerance
            };

            if (isSupplier) {
                rowValues.CurrencyCode = ledger.currencyCode;
            } else {
                rowValues.SalesRepresentative = ledger.salesRepresentative;
                rowValues.CreditDays = ledger.creditDays;
            }

            const row = worksheet.addRow(rowValues);
            const rowIndex = index;

            if (validationMap.size > 0 && validationMap.has(rowIndex)) {
                const rowValidation = validationMap.get(rowIndex)!;

                if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
                    row.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFEE2E2' }
                        };
                    });
                }

                if (rowValidation.cellValidations && rowValidation.cellValidations.length > 0) {
                    exportColumns.forEach((colName, colIdx) => {
                        const cellValidation = rowValidation.cellValidations.find(cv => cv.columnName === colName);
                        if (cellValidation) {
                            const cell = row.getCell(colIdx + 1);

                            if (cellValidation.status === ValidationStatus.MissingData) {
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: 'FFDBEAFE' }
                                };
                            } else if (cellValidation.status === ValidationStatus.Mismatch) {
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: 'FFFEF9C3' }
                                };
                            }
                        }
                    });
                }
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${ledgerGroupName}.xlsx`);
        toast.success('Data exported successfully with validation colors');
    };

    // Display rows now handled by AG Grid Filtering

    // Display rows now handled by AG Grid Filtering
    // const displayRows = getFilteredRows(); moved to doesExternalFilterPass logic



    return (
        <div className="space-y-4">
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
                    onClick={handleClearAllDataTrigger}
                    disabled={isLoading || ledgerData.length === 0}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <XCircle className="w-4 h-4" />
                    Clear All Data
                </button>

                <button
                    onClick={handleRemoveRow}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    Remove Row ({selectedRows.size})
                </button>

                <button
                    onClick={handleClearAllDataTrigger}
                    disabled={isLoading}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <FilePlus2 className="w-4 h-4" />
                    Fresh Upload
                </button>



                <button
                    onClick={() => fileInputRef.current?.click()}
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
                </div>
            )}

            {ledgerData.length > 0 && (
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
                                
                                /* Ensure control backgrounds are dark */
                                color-scheme: dark;
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
        </div>
    );
};

export default LedgerMasterEnhanced;
