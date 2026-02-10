import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Database, Trash2, Upload, Download, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
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
    CountryStateDto,
    ValidationStatus
} from '../services/api';

// --- Helper Component: Searchable Dropdown ---
interface SearchableDropdownProps {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    className?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    value,
    options,
    onChange,
    placeholder = "Select...",
    style,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || '');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync internal search term with external value
    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // On blur, if the typed value isn't exactly the external value, we might want to revert or keep it?
                // For now, we keep what the user typed (allowing custom values)
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt =>
            opt.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const handleSelect = (option: string) => {
        onChange(option);
        setSearchTerm(option);
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        onChange(newValue);
        if (!isOpen) setIsOpen(true);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative flex items-center">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={`${className} pr-8 cursor-text`}
                    style={style}
                />
                <button
                    tabIndex={-1}
                    onClick={() => {
                        if (isOpen) {
                            setIsOpen(false);
                        } else {
                            setIsOpen(true);
                            inputRef.current?.focus();
                        }
                    }}
                    className="absolute right-0 top-0 h-full px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center pointer-events-auto"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto text-sm">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <div
                                key={option}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 ${option === value ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''}`}
                                onClick={() => handleSelect(option)}
                            >
                                {option}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-gray-500 dark:text-gray-400 italic">
                            No matches found
                        </div>
                    )}
                    {/* Always allow selecting "Custom Value" if strictly needed? No, input typing handles custom values */}
                </div>
            )}
        </div>
    );
};
// ---------------------------------------------

interface LedgerMasterEnhancedProps {
    ledgerGroupId: number;
    ledgerGroupName: string;
}

const LedgerMasterEnhanced: React.FC<LedgerMasterEnhancedProps> = ({ ledgerGroupId, ledgerGroupName }) => {
    // Set to true to enable debug logging
    const DEBUG_MODE = true; // ENABLED FOR DEBUGGING

    const [ledgerData, setLedgerData] = useState<LedgerMasterDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [validationResult, setValidationResult] = useState<LedgerValidationResultDto | null>(null);
    const [mode, setMode] = useState<'idle' | 'loaded' | 'preview' | 'validated'>('idle');
    const [filterType, setFilterType] = useState<'all' | 'valid' | 'duplicate' | 'missing' | 'mismatch'>('all');
    const [countryStates, setCountryStates] = useState<CountryStateDto[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Country/State data on mount
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
        fetchCountryStates();
    }, []);

    // Get distinct countries
    const distinctCountries = useMemo(() => {
        return Array.from(new Set(countryStates.map(cs => cs.country)));
    }, [countryStates]);

    // Get states for a specific country
    const getStatesForCountry = (countryName: string | undefined | null) => {
        if (!countryName) return [];
        return countryStates
            .filter(cs => cs.country.toLowerCase() === countryName.toLowerCase())
            .map(cs => cs.state);
    };

    const columns = [
        'LedgerName', 'MailingName', 'Address1', 'Address2', 'Address3',
        'Country', 'State', 'City', 'Pincode', 'TelephoneNo', 'Email',
        'MobileNo', 'Website', 'PANNo', 'GSTNo', 'SalesRepresentative',
        'SupplyTypeCode', 'GSTApplicable', 'DeliveredQtyTolerance'
    ];

    // Map column name to DTO field name
    const getFieldName = (columnName: string): keyof LedgerMasterDto => {
        const mapping: Record<string, keyof LedgerMasterDto> = {
            'PANNo': 'panNo',
            'GSTNo': 'gstNo',
            'GSTApplicable': 'gstApplicable',
            'TelephoneNo': 'telephoneNo',
            'MobileNo': 'mobileNo',
            'MailingName': 'mailingName',
            'SalesRepresentative': 'salesRepresentative',
            'SupplyTypeCode': 'supplyTypeCode',
            'DeliveredQtyTolerance': 'deliveredQtyTolerance'
        };

        return mapping[columnName] || (columnName.charAt(0).toLowerCase() + columnName.slice(1)) as keyof LedgerMasterDto;
    };

    // Load data from database
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

    // Handle row selection
    const toggleRowSelection = (index: number) => {
        const newSelection = new Set(selectedRows);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedRows(newSelection);
    };

    // Remove row (soft delete)
    // Remove row (soft delete or local remove)
    const handleRemoveRow = async () => {
        if (selectedRows.size === 0) {
            toast.error('Please select at least one row to remove');
            return;
        }

        if (!window.confirm(`Are you sure you want to remove ${selectedRows.size} ledger(s)?`)) {
            return;
        }

        // If in preview/validated mode, remove locally only
        if (mode === 'preview' || mode === 'validated') {
            const newLedgerData = ledgerData.filter((_, index) => !selectedRows.has(index));
            setLedgerData(newLedgerData);
            setSelectedRows(new Set());

            // If we had validation results, we should probably clear them or invalidate them
            // because indices have shifted. Safest is to clear and ask to re-validate.
            setValidationResult(null);
            setMode('preview'); // Ensure we stay in editable mode

            toast.success(`Removed ${selectedRows.size} row(s). Please re-run validation.`);
            return;
        }

        // If in loaded mode (Database records), perform server-side delete
        setIsLoading(true);
        try {
            const rowsToDelete = Array.from(selectedRows).map(idx => ledgerData[idx]);

            let deletedCount = 0;
            for (const ledger of rowsToDelete) {
                if (ledger.ledgerID) {
                    await softDeleteLedger(ledger.ledgerID);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                toast.success(`Successfully removed ${deletedCount} ledger(s) from database`);
                setSelectedRows(new Set());
                await handleLoadData(); // Reload from DB
            } else {
                toast.error('No database records were selected for deletion');
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to remove ledgers');
        } finally {
            setIsLoading(false);
        }
    };

    // Import from Excel
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate filename matches ledger group name
        const expectedFilename = `${ledgerGroupName}.xlsx`;
        if (file.name !== expectedFilename) {
            toast.error(`Please correct your Excel file name according to the selected Ledger Group. Expected: ${expectedFilename}`, {
                duration: 60000
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Parse Excel file
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Map to LedgerMasterDto
                const ledgers: LedgerMasterDto[] = jsonData.map((row: any) => {
                    let country = row.Country;
                    let state = row.State;

                    // Normalize Country/State against master data (Case-Insensitive Match)
                    if (country) {
                        // Find matching country in master list
                        const masterCountryPair = countryStates.find(cs => cs.country.trim().toLowerCase() === country.toString().trim().toLowerCase());
                        if (masterCountryPair) {
                            country = masterCountryPair.country; // Use official casing

                            // If country matched, try to match state
                            if (state) {
                                const masterStatePair = countryStates.find(cs =>
                                    cs.country === country &&
                                    cs.state.trim().toLowerCase() === state.toString().trim().toLowerCase()
                                );
                                if (masterStatePair) {
                                    state = masterStatePair.state; // Use official casing
                                }
                            }
                        }
                    }

                    return {
                        ledgerGroupID: ledgerGroupId,
                        ledgerName: row.LedgerName,
                        mailingName: row.MailingName,
                        address1: row.Address1,
                        address2: row.Address2,
                        address3: row.Address3,
                        country: country,
                        state: state,
                        city: row.City,
                        pincode: row.Pincode,
                        telephoneNo: row.TelephoneNo,
                        email: row.Email,
                        mobileNo: row.MobileNo,
                        website: row.Website,
                        panNo: row.PANNo,
                        gstNo: row.GSTNo,
                        salesRepresentative: row.SalesRepresentative,
                        supplyTypeCode: row.SupplyTypeCode,
                        gstApplicable: row.GSTApplicable === true || row.GSTApplicable === 'true' || row.GSTApplicable === 1,
                        deliveredQtyTolerance: row.DeliveredQtyTolerance ? parseFloat(row.DeliveredQtyTolerance) : undefined
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

    // Check Validation
    const handleCheckValidation = async () => {
        if (ledgerData.length === 0) {
            toast.error('No data to validate');
            return;
        }

        setIsLoading(true);
        try {
            if (DEBUG_MODE) {
                console.log('[VALIDATION] Starting validation for', ledgerData.length, 'rows');
                console.log('[VALIDATION] Ledger Group ID:', ledgerGroupId);
            }

            const result = await validateLedgers(ledgerData, ledgerGroupId);

            if (DEBUG_MODE) {
                console.log('[VALIDATION] Validation result received:', result);
                console.log('[VALIDATION] Summary:', result.summary);
                console.log('[VALIDATION] Row validations:', result.rows);
                console.log('[VALIDATION] Is Valid:', result.isValid);
            }

            setValidationResult(result);
            // Keep mode as 'preview' to maintain editable grid
            // setMode('validated'); // Removed to keep grid editable

            if (result.isValid) {
                toast.success('All validations passed! Ready to import.');
            } else {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount;
                toast.error(`Validation completed with ${totalIssues} issues`);
                if (DEBUG_MODE) {
                    console.log('[VALIDATION] Issues found:', {
                        duplicates: result.summary.duplicateCount,
                        missing: result.summary.missingDataCount,
                        mismatch: result.summary.mismatchCount
                    });
                }
            }
        } catch (error: any) {
            if (DEBUG_MODE) console.error('[VALIDATION] Error during validation:', error);
            toast.error(error?.response?.data?.error || 'Validation failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Import validated data
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

    // Export to Excel with Validation Colors
    const handleExport = async () => {
        if (ledgerData.length === 0) {
            toast.error('No data to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(ledgerGroupName || 'Sheet1');

        // Define columns
        const exportColumns = [
            'LedgerName', 'MailingName', 'Address1', 'Address2', 'Address3',
            'Country', 'State', 'City', 'Pincode', 'TelephoneNo', 'Email',
            'MobileNo', 'Website', 'PANNo', 'GSTNo', 'SalesRepresentative',
            'SupplyTypeCode', 'GSTApplicable', 'DeliveredQtyTolerance'
        ];

        worksheet.columns = exportColumns.map(col => ({ header: col, key: col, width: 20 }));

        // Make header bold
        worksheet.getRow(1).font = { bold: true };

        // Add data rows and apply styles
        ledgerData.forEach((ledger, index) => {
            const rowValues = {
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
                SalesRepresentative: ledger.salesRepresentative,
                SupplyTypeCode: ledger.supplyTypeCode,
                GSTApplicable: ledger.gstApplicable,
                DeliveredQtyTolerance: ledger.deliveredQtyTolerance
            };

            const row = worksheet.addRow(rowValues);
            const rowIndex = index; // 0-based index for validationResult.rows

            // Apply Validation Styles
            if (validationResult && validationResult.rows[rowIndex]) {
                const rowValidation = validationResult.rows[rowIndex];

                // 1. Row-Level Duplicate (Red)
                if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
                    row.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFEE2E2' } // Light Red (red-100)
                        };
                    });
                }

                // 2. Cell-Specific Errors (Override Row Style)
                if (rowValidation.cellValidations && rowValidation.cellValidations.length > 0) {
                    exportColumns.forEach((colName, colIdx) => {
                        const cellValidation = rowValidation.cellValidations.find(cv => cv.columnName === colName);
                        if (cellValidation) {
                            const cell = row.getCell(colIdx + 1); // 1-based column index

                            if (cellValidation.status === ValidationStatus.MissingData) {
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: 'FFDBEAFE' } // Light Blue (blue-100)
                                };
                            } else if (cellValidation.status === ValidationStatus.Mismatch) {
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: 'FFFEF9C3' } // Light Yellow (yellow-100)
                                };
                            }
                        }
                    });
                }
            }
        });

        // Write buffer and save
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${ledgerGroupName}.xlsx`);
        toast.success('Data exported successfully with validation colors');
    };

    // Cell editing
    const handleCellEdit = (rowIndex: number, field: keyof LedgerMasterDto, value: any) => {
        const newData = [...ledgerData];
        newData[rowIndex] = { ...newData[rowIndex], [field]: value };
        setLedgerData(newData);
    };

    // Special handler for Country change to cascade reset State
    const handleCountryChange = (rowIndex: number, newCountry: string) => {
        const newData = [...ledgerData];
        newData[rowIndex] = {
            ...newData[rowIndex],
            country: newCountry,
            state: '' // Reset state when country changes
        };
        setLedgerData(newData);
    };

    // Get row style based on validation status (using inline styles for guaranteed visibility)
    const getRowStyle = (rowIndex: number): React.CSSProperties => {
        if (!validationResult) {
            if (DEBUG_MODE) console.log(`[COLOR] No validation result for row ${rowIndex}`);
            return {};
        }

        const rowValidation = validationResult.rows[rowIndex];
        if (!rowValidation) {
            if (DEBUG_MODE) console.log(`[COLOR] No row validation found for row ${rowIndex}`);
            return {};
        }

        if (DEBUG_MODE) console.log(`[COLOR] Row ${rowIndex} status:`, rowValidation.rowStatus);

        // Only highlight entire row for duplicates (RED) - VERY VISIBLE
        if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
            if (DEBUG_MODE) console.log(`[COLOR] Row ${rowIndex} is DUPLICATE - applying RED`);
            return {
                backgroundColor: '#fee2e2', // Light red background (red-100)
                borderLeft: '6px solid #f87171', // Red-400 border
                color: '#1a1a1a' // Dark text for contrast
            };
        }

        return {};
    };

    // Get cell style based on validation (using inline styles)
    const getCellStyle = (rowIndex: number, columnName: string): React.CSSProperties => {
        if (!validationResult) return {};

        const rowValidation = validationResult.rows[rowIndex];
        if (!rowValidation) return {};

        const cellValidation = rowValidation.cellValidations.find(cv => cv.columnName === columnName);

        // Priority 1: Cell-Specific Errors
        if (cellValidation) {
            if (DEBUG_MODE) console.log(`[CELL COLOR] Row ${rowIndex}, Column "${columnName}":`, cellValidation.status);


            if (cellValidation.status === ValidationStatus.MissingData) {
                return { backgroundColor: '#dbeafe' }; // blue-100
            } else if (cellValidation.status === ValidationStatus.Mismatch) {
                return { backgroundColor: '#fef9c3' }; // yellow-100
            }
        }

        // Priority 2: Row-Level Duplicate
        if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
            return { backgroundColor: '#fee2e2' }; // red-100 for ALL cells in duplicate row
        }

        return {};
    };

    // Get input field style based on validation (using inline styles)
    const getInputStyle = (rowIndex: number, columnName: string): React.CSSProperties => {
        if (!validationResult) return {};

        const rowValidation = validationResult.rows[rowIndex];
        if (!rowValidation) return {};

        const cellValidation = rowValidation.cellValidations.find(cv => cv.columnName === columnName);

        // Priority 1: Cell-Specific Errors - Ensure visible inputs
        if (cellValidation) {
            if (DEBUG_MODE) console.log(`[INPUT BG] Row ${rowIndex}, Column "${columnName}":`, cellValidation.status);

            if (cellValidation.status === ValidationStatus.MissingData) {
                return {
                    backgroundColor: '#dbeafe', // Light blue background (blue-100)
                    borderColor: '#60a5fa', // Blue-400 border
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    color: '#000000', // Black text for contrast
                    fontWeight: '500'
                };
            } else if (cellValidation.status === ValidationStatus.Mismatch) {
                return {
                    backgroundColor: '#fef9c3', // Light yellow background (yellow-100)
                    borderColor: '#facc15', // Yellow-400 border
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    color: '#000000', // Black text for contrast
                    fontWeight: '500'
                };
            }
        }

        // Priority 2: Row-Level Duplicate - Ensure visible text on red background
        if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
            return {
                color: '#1a1a1a', // Dark text for contrast on red
                fontWeight: '500'
            };
        }

        return {};
    };

    // Helper to get filtered rows while preserving original indices
    const getFilteredRows = () => {
        const rowsWithIndex = ledgerData.map((data, index) => ({ data, index }));

        if (!validationResult || filterType === 'all') return rowsWithIndex;

        return rowsWithIndex.filter(({ index }) => {
            const rowValidation = validationResult.rows[index];
            if (!rowValidation) return false;

            switch (filterType) {
                case 'valid': return rowValidation.rowStatus === ValidationStatus.Valid;
                case 'duplicate': return rowValidation.rowStatus === ValidationStatus.Duplicate;
                case 'missing': return rowValidation.rowStatus === ValidationStatus.MissingData;
                case 'mismatch': return rowValidation.rowStatus === ValidationStatus.Mismatch;
                default: return true;
            }
        });
    };

    const displayRows = getFilteredRows();

    return (
        <div className="space-y-4">
            {/* Action Buttons */}
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
                    onClick={handleRemoveRow}
                    disabled={isLoading || selectedRows.size === 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    Remove Row ({selectedRows.size})
                </button>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Import From Excel
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
                            {validationResult ? 'Re-Run Validation' : 'Check Validation'}
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
                        Import
                    </button>
                )}
            </div>

            {/* Validation Summary */}
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
                    </div>
                </div>
            )}

            {/* Data Grid */}
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
                            </p>
                        )}
                    </div>

                    <div className="overflow-auto" style={{ maxHeight: '600px' }}>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-[#1e293b] sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 text-left">
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedRows(new Set(ledgerData.map((_, idx) => idx)));
                                                } else {
                                                    setSelectedRows(new Set());
                                                }
                                            }}
                                            checked={selectedRows.size === ledgerData.length && ledgerData.length > 0}
                                        />
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                                    {columns.map(col => (
                                        <th key={col} className={`px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap ${(mode === 'preview' || mode === 'validated') ? 'border-r border-gray-300 dark:border-gray-600' : ''}`}>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {displayRows.map(({ data: ledger, index: rowIndex }) => {
                                    // Check if row is colored (Duplicate) to prevent class conflicts
                                    const isRowColored = validationResult?.rows[rowIndex]?.rowStatus === ValidationStatus.Duplicate;
                                    const rowClass = isRowColored
                                        ? "transition-colors font-medium" // No hover bg for colored rows
                                        : "hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors";

                                    return (
                                        <tr key={rowIndex} className={rowClass} style={getRowStyle(rowIndex)}>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.has(rowIndex)}
                                                    onChange={() => toggleRowSelection(rowIndex)}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{rowIndex + 1}</td>
                                            {columns.map(col => {
                                                const field = getFieldName(col);
                                                const value = ledger[field];

                                                if (DEBUG_MODE && rowIndex === 0) {
                                                    console.log(`[DATA] Row 0, Column "${col}", Field "${field}", Value:`, value);
                                                }

                                                return (
                                                    <td key={col} className="px-3 py-2 border-r border-gray-200 dark:border-gray-700" style={getCellStyle(rowIndex, col)}>
                                                        {(mode === 'preview' || mode === 'validated') ? (
                                                            (() => {
                                                                if (col === 'Country') {
                                                                    return (
                                                                        <SearchableDropdown
                                                                            value={value?.toString() || ''}
                                                                            options={distinctCountries}
                                                                            onChange={(newVal) => handleCountryChange(rowIndex, newVal)}
                                                                            placeholder="Select Country"
                                                                            className="w-full min-w-[150px] px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 rounded transition-all"
                                                                            style={getInputStyle(rowIndex, col)}
                                                                        />
                                                                    );
                                                                } else if (col === 'State') {
                                                                    // Get states for the selected country of THIS row
                                                                    const availableStates = getStatesForCountry(ledger.country);
                                                                    return (
                                                                        <SearchableDropdown
                                                                            value={value?.toString() || ''}
                                                                            options={availableStates}
                                                                            onChange={(newVal) => handleCellEdit(rowIndex, field, newVal)}
                                                                            placeholder="Select State"
                                                                            className="w-full min-w-[150px] px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 rounded transition-all"
                                                                            style={getInputStyle(rowIndex, col)}
                                                                        />
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <input
                                                                            type="text"
                                                                            value={value?.toString() || ''}
                                                                            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
                                                                            className="w-full min-w-[150px] px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 rounded transition-all"
                                                                            style={getInputStyle(rowIndex, col)}
                                                                            placeholder="Enter value..."
                                                                        />
                                                                    );
                                                                }
                                                            })()
                                                        ) : (
                                                            <span className="text-gray-700 dark:text-gray-300">{value?.toString() || ''}</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Idle State */}
            {ledgerData.length === 0 && mode === 'idle' && (
                <div className="bg-white dark:bg-[#0f172a] rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <Database className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Data Loaded</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Load data from database or import from Excel file
                    </p>
                </div>
            )}
        </div>
    );
};

export default LedgerMasterEnhanced;
