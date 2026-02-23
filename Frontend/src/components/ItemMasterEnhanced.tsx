import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ClearSuccessPopup from './ClearSuccessPopup';
import NoDataPopup from './NoDataPopup';
import { Database, Trash2, Upload, Download, CheckCircle2, AlertCircle, FilePlus2, RefreshCw, ShieldAlert, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    getAllItems,
    validateItems,
    importItems,
    ItemMasterDto,
    ItemValidationResultDto,
    ItemRowValidation,
    ValidationStatus,
    clearAllItemData,
    getItemCount,
    HSNGroupDto,
    UnitDto,
    ItemSubGroupDto,
    getItemHSNGroups,
    getItemUnits,
    getItemSubGroups,
    softDeleteItem
} from '../services/api';
import { useTheme } from '../context/ThemeContext';

// AG Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, GridApi, RowClassRules, IRowNode } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface ItemMasterEnhancedProps {
    itemGroupId: number;
    itemGroupName: string;
}

const ItemMasterEnhanced: React.FC<ItemMasterEnhancedProps> = ({ itemGroupId, itemGroupName }) => {
    const { isDark } = useTheme();

    const [itemData, setItemData] = useState<ItemMasterDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [validationResult, setValidationResult] = useState<ItemValidationResultDto | null>(null);
    const [mode, setMode] = useState<'idle' | 'loaded' | 'preview' | 'validated'>('idle');
    const [filterType, setFilterType] = useState<'all' | 'valid' | 'duplicate' | 'missing' | 'mismatch' | 'invalid'>('all');
    const [hsnGroups, setHSNGroups] = useState<HSNGroupDto[]>([]);
    const [units, setUnits] = useState<UnitDto[]>([]);
    const [itemSubGroups, setItemSubGroups] = useState<ItemSubGroupDto[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingMode, setPendingMode] = useState<{ type: 'load' | 'upload'; action: () => void } | null>(null);
    const [showModeSwitchModal, setShowModeSwitchModal] = useState(false);

    // Clear Data Flow State
    const [clearFlowStep, setClearFlowStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [clearCredentials, setClearCredentials] = useState({ username: '', password: '', reason: '' });

    // CAPTCHA State
    const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState(false);

    // Validation Modal State
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationModalContent, setValidationModalContent] = useState<{ title: string; messages: string[] } | null>(null);
    const [filenameError, setFilenameError] = useState<string | null>(null);
    const [clearActionType, setClearActionType] = useState<'clearOnly' | 'freshUpload'>('freshUpload');

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

    // Generate CAPTCHA
    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 50) + 20; // 20-70
        const num2 = Math.floor(Math.random() * 30) + 10; // 10-40
        const answer = num1 - num2;
        setCaptchaQuestion({ num1, num2, answer });
        setCaptchaInput('');
        setCaptchaError(false);
    };

    // AG Grid State
    const [gridApi, setGridApi] = useState<GridApi | null>(null);

    useEffect(() => {
        loadDropdownData();
    }, []);

    // Force redraw when validation result changes to ensure highlights are cleared/updated
    useEffect(() => {
        if (gridApi) {
            gridApi.redrawRows();
        }
    }, [validationResult, gridApi]);

    const loadDropdownData = async () => {
        try {
            const [hsnData, unitData, subGroupData] = await Promise.all([
                getItemHSNGroups(),
                getItemUnits(),
                getItemSubGroups(itemGroupId)
            ]);
            setHSNGroups(hsnData);
            setUnits(unitData);
            setItemSubGroups(subGroupData);
        } catch (error) {
            console.error('[LoadDropdowns] Error:', error);
        }
    };

    const handleLoadData = async () => {
        if (itemGroupId <= 0) {
            showError('Please select an Item Group first');
            return;
        }

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
            const data = await getAllItems(itemGroupId);
            if (data.length === 0) {
                setItemData([]);
                setMode('idle');
                showError(`No data found in database against the selected ${itemGroupName}`);
            } else {
                setItemData(data);
                setMode('loaded');
                setValidationResult(null);
                setSelectedRows(new Set()); // Clear selection
                toast.success(`Loaded ${data.length} item(s) from database`);
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
                    setItemData([]);
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
        if (itemData.length > 0 && (mode === 'preview' || mode === 'validated')) {
            setShowReUploadModal(true);
            return;
        }

        // Otherwise just click
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const confirmReUpload = () => {
        setShowReUploadModal(false);
        setItemData([]);
        setValidationResult(null);
        setMode('idle');
        setSelectedRows(new Set());
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset input
            fileInputRef.current.click();
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isExistingUpload: boolean) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate filename
        const expectedFilename = `${itemGroupName}.xlsx`;
        if (file.name !== expectedFilename) {
            setFilenameError(`Please correct your Excel file name according to the selected Item Group. Expected: ${expectedFilename}`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            // Helper function to safely convert values to string or undefined
            const toStringOrUndefined = (value: any): string | undefined => {
                if (value === null || value === undefined || value === '') return undefined;
                return String(value);
            };

            const mappedData: ItemMasterDto[] = jsonData.map((row: any, index: number) => {
                const item: ItemMasterDto = {
                    tempId: `temp-${Date.now()}-${index}`,
                    itemName: toStringOrUndefined(row.ItemName || row.itemName),
                    itemGroupID: itemGroupId,
                    hsnGroup: toStringOrUndefined(row.HSNGroup || row.hsnGroup),
                    stockUnit: toStringOrUndefined(row.StockUnit || row.stockUnit),
                    purchaseUnit: toStringOrUndefined(row.PurchaseUnit || row.purchaseUnit),
                    estimationUnit: toStringOrUndefined(row.EstimationUnit || row.estimationUnit),
                    unitPerPacking: row.UnitPerPacking || row.unitPerPacking,
                    wtPerPacking: row.WtPerPacking || row.wtPerPacking,
                    conversionFactor: row.ConversionFactor || row.conversionFactor,
                    stockType: toStringOrUndefined(row.StockType || row.stockType),
                    stockCategory: toStringOrUndefined(row.StockCategory || row.stockCategory),
                    sizeW: row.SizeW || row.sizeW,
                    sizeL: row.SizeL || row.sizeL,
                    purchaseRate: row.PurchaseRate || row.purchaseRate,
                    stockRefCode: toStringOrUndefined(row.StockRefCode || row.stockRefCode),
                    itemDescription: toStringOrUndefined(row.ItemDescription || row.itemDescription),

                    // Paper/REEL/INK-specific fields
                    quality: toStringOrUndefined(row.Quality || row.quality),
                    bf: toStringOrUndefined(row.BF || row.bf),
                    gsm: row.GSM || row.gsm,
                    manufecturer: toStringOrUndefined(row.Manufecturer || row.manufecturer),
                    finish: toStringOrUndefined(row.Finish || row.finish),
                    manufecturerItemCode: toStringOrUndefined(row.ManufecturerItemCode || row.manufecturerItemCode),
                    shelfLife: row.ShelfLife || row.shelfLife || 365,
                    estimationRate: row.EstimationRate || row.estimationRate,
                    minimumStockQty: row.MinimumStockQty || row.minimumStockQty,
                    isStandardItem: row.IsStandardItem !== undefined ? row.IsStandardItem : true,
                    isRegularItem: row.IsRegularItem !== undefined ? row.IsRegularItem : true,
                    packingType: toStringOrUndefined(row.PackingType || row.packingType),
                    certificationType: toStringOrUndefined(row.CertificationType || row.certificationType) || 'NONE',
                    productHSNName: toStringOrUndefined(row.ProductHSNName || row.productHSNName),

                    // INK & ADDITIVES-specific fields
                    itemSubGroupName: toStringOrUndefined(row.ItemSubGroupName || row.itemSubGroupName),
                    itemType: toStringOrUndefined(row.ItemType || row.itemType),
                    inkColour: toStringOrUndefined(row.InkColour || row.inkColour),
                    pantoneCode: toStringOrUndefined(row.PantoneCode || row.pantoneCode),
                    purchaseOrderQuantity: row.PurchaseOrderQuantity || row.purchaseOrderQuantity,

                    // LAMINATION FILM-specific fields
                    thickness: row.Thickness || row.thickness,
                    density: row.Density || row.density,

                    // ROLL-specific fields
                    releaseGSM: row.ReleaseGSM || row.releaseGSM,
                    adhesiveGSM: row.AdhesiveGSM || row.adhesiveGSM,
                    totalGSM: row.TotalGSM || row.totalGSM
                };

                // Auto-calculations for PAPER group
                if (itemGroupName === 'PAPER') {
                    // Caliper calculation
                    if (item.gsm) {
                        item.caliper = parseFloat((item.gsm / 1000).toFixed(3));
                    }

                    // ItemSize calculation
                    if (item.sizeW && item.sizeL) {
                        item.itemSize = `${item.sizeW} X ${item.sizeL}`;
                    }

                    // WtPerPacking calculation
                    if (item.sizeW && item.sizeL && item.gsm && item.unitPerPacking) {
                        const val = (item.sizeW * item.sizeL * item.gsm * item.unitPerPacking) / 1000000000;
                        item.wtPerPacking = parseFloat(val.toFixed(4));
                    }

                    // ItemName auto-generation if missing
                    if (!item.itemName) {
                        const parts = [];
                        if (item.quality) parts.push(item.quality);
                        if (item.gsm) parts.push(`${item.gsm} GSM`);
                        if (item.manufecturer) parts.push(item.manufecturer);
                        if (item.finish) parts.push(item.finish);
                        if (item.itemSize) parts.push(`${item.itemSize} MM`);
                        item.itemName = parts.join(' ');
                    }
                }

                // Auto-calculations for REEL group
                if (itemGroupName === 'REEL') {
                    // Caliper calculation
                    if (item.gsm) {
                        item.caliper = parseFloat((item.gsm / 1000).toFixed(3));
                    }

                    // ItemName auto-generation if missing
                    if (!item.itemName) {
                        const parts = [];
                        if (item.bf) parts.push(item.bf);
                        if (item.quality) parts.push(item.quality);
                        if (item.gsm) parts.push(`${item.gsm} GSM`);
                        if (item.manufecturer) parts.push(item.manufecturer);
                        if (item.finish) parts.push(item.finish);
                        if (item.sizeW) parts.push(item.sizeW.toString());
                        if (item.caliper) parts.push(item.caliper.toString());
                        item.itemName = parts.join(' ');
                    }
                }

                // Auto-calculations and defaults for INK & ADDITIVES group
                if (itemGroupName === 'INK & ADDITIVES') {
                    // Apply defaults
                    if (!item.itemType) item.itemType = 'INK';
                    if (!item.shelfLife) item.shelfLife = 365;
                    if (!item.stockType) item.stockType = 'JOB CONSUMABLES';
                    if (item.isStandardItem === undefined) item.isStandardItem = true;
                    if (item.isRegularItem === undefined) item.isRegularItem = true;
                    if (!item.purchaseOrderQuantity) item.purchaseOrderQuantity = 0;

                    // ItemName auto-generation if missing (ItemType + InkColour + PantoneCode)
                    if (!item.itemName) {
                        const parts = [];
                        if (item.itemType) parts.push(item.itemType);
                        if (item.inkColour) parts.push(item.inkColour);
                        if (item.pantoneCode) parts.push(item.pantoneCode);
                        item.itemName = parts.join(', ');
                    }
                }

                // Auto-calculations and defaults for VARNISHES & COATINGS group
                if (itemGroupName === 'VARNISHES & COATINGS') {
                    // Apply defaults
                    if (!item.itemType) item.itemType = 'Varnish';
                    if (!item.shelfLife) item.shelfLife = 365;
                    if (!item.minimumStockQty && item.minimumStockQty !== 0) item.minimumStockQty = 0;
                    if (!item.stockType) item.stockType = 'JOB CONSUMABLES';
                    if (item.isStandardItem === undefined) item.isStandardItem = true;
                    if (item.isRegularItem === undefined) item.isRegularItem = true;
                    if (!item.purchaseOrderQuantity && item.purchaseOrderQuantity !== 0) item.purchaseOrderQuantity = 0;

                    // ItemName auto-generation if missing (ItemType + Quality)
                    if (!item.itemName) {
                        const parts = [];
                        if (item.itemType) parts.push(item.itemType);
                        if (item.quality) parts.push(item.quality);
                        item.itemName = parts.join(', ');
                    }
                }

                // Auto-calculations and defaults for LAMINATION FILM group
                if (itemGroupName === 'LAMINATION FILM') {
                    // Apply defaults
                    if (!item.sizeW && item.sizeW !== 0) item.sizeW = 0;
                    if (!item.thickness && item.thickness !== 0) item.thickness = 0;
                    if (!item.density && item.density !== 0) item.density = 0;
                    if (!item.shelfLife) item.shelfLife = 365;
                    if (!item.minimumStockQty && item.minimumStockQty !== 0) item.minimumStockQty = 0;
                    if (!item.stockType) item.stockType = 'JOB CONSUMABLES';
                    if (item.isStandardItem === undefined) item.isStandardItem = true;
                    if (item.isRegularItem === undefined) item.isRegularItem = true;
                    if (!item.purchaseOrderQuantity && item.purchaseOrderQuantity !== 0) item.purchaseOrderQuantity = 0;

                    // ItemName auto-generation if missing (Quality + SizeW MM + Thickness MICRON + Manufacturer)
                    if (!item.itemName) {
                        const parts = [];
                        if (item.quality) parts.push(item.quality);
                        if (item.sizeW) parts.push(`${item.sizeW} MM`);
                        if (item.thickness) parts.push(`${item.thickness} MICRON`);
                        if (item.manufecturer) parts.push(item.manufecturer);
                        item.itemName = parts.join(', ');
                    }
                }

                // Auto-calculations and defaults for FOIL group
                if (itemGroupName === 'FOIL') {
                    // Apply defaults
                    if (!item.sizeW && item.sizeW !== 0) item.sizeW = 0;
                    if (!item.thickness && item.thickness !== 0) item.thickness = 0;
                    if (!item.density && item.density !== 0) item.density = 0;
                    if (!item.shelfLife) item.shelfLife = 365;
                    if (!item.minimumStockQty && item.minimumStockQty !== 0) item.minimumStockQty = 0;
                    if (!item.stockType) item.stockType = 'JOB CONSUMABLES';
                    if (item.isStandardItem === undefined) item.isStandardItem = true;
                    if (item.isRegularItem === undefined) item.isRegularItem = true;
                    if (!item.purchaseOrderQuantity && item.purchaseOrderQuantity !== 0) item.purchaseOrderQuantity = 0;

                    // ItemName auto-generation if missing (ManufacturerItemCode + Quality + SizeW)
                    if (!item.itemName) {
                        const parts = [];
                        if (item.manufecturerItemCode) parts.push(item.manufecturerItemCode);
                        if (item.quality) parts.push(item.quality);
                        if (item.sizeW) parts.push(`${item.sizeW} mm`);
                        item.itemName = parts.join(', ');
                    }
                }

                // Auto-calculations and defaults for ROLL group
                if (itemGroupName === 'ROLL') {
                    // Apply defaults
                    if (!item.itemType) item.itemType = 'Paper';
                    if (!item.sizeW && item.sizeW !== 0) item.sizeW = 0;
                    if (!item.thickness && item.thickness !== 0) item.thickness = 0;
                    if (!item.density && item.density !== 0) item.density = 0;
                    if (!item.shelfLife) item.shelfLife = 365;
                    if (!item.minimumStockQty && item.minimumStockQty !== 0) item.minimumStockQty = 0;
                    if (item.isStandardItem === undefined) item.isStandardItem = true;
                    if (item.isRegularItem === undefined) item.isRegularItem = true;

                    // TotalGSM auto-calculation (GSM + ReleaseGSM + AdhesiveGSM)
                    item.totalGSM = (item.gsm || 0) + (item.releaseGSM || 0) + (item.adhesiveGSM || 0);

                    // ItemName auto-generation if missing (Quality, GSM GSM, ReleaseGSM GSM, AdhesiveGSM GSM, Manufacturer, SizeW MM)
                    if (!item.itemName) {
                        const parts = [];
                        if (item.quality) parts.push(item.quality);
                        if (item.gsm) parts.push(`${item.gsm} GSM`);
                        if (item.releaseGSM) parts.push(`${item.releaseGSM} GSM`);
                        if (item.adhesiveGSM) parts.push(`${item.adhesiveGSM} GSM`);
                        if (item.manufecturer) parts.push(item.manufecturer);
                        if (item.sizeW) parts.push(`${item.sizeW} MM`);
                        item.itemName = parts.join(', ');
                    }
                }

                // Auto-calculations and defaults for OTHER MATERIAL group
                if (itemGroupName === 'OTHER MATERIAL') {
                    // Apply defaults
                    if (!item.shelfLife) item.shelfLife = 365;
                    if (!item.minimumStockQty && item.minimumStockQty !== 0) item.minimumStockQty = 0;
                    if (!item.stockType) item.stockType = 'JOB CONSUMABLES';
                    if (item.isStandardItem === undefined) item.isStandardItem = true;
                    if (item.isRegularItem === undefined) item.isRegularItem = true;
                    if (!item.purchaseOrderQuantity && item.purchaseOrderQuantity !== 0) item.purchaseOrderQuantity = 0;

                    // ItemName auto-generation if missing (Quality)
                    if (!item.itemName) {
                        item.itemName = item.quality || '';
                    }
                }

                return item;
            }).filter(item => {
                // Remove empty rows: check if any core Excel-sourced field has a real value
                // These are fields that come directly from Excel (not defaults like shelfLife=365)
                const hasData = !!(
                    item.quality || item.gsm || item.manufecturer || item.finish ||
                    item.manufecturerItemCode || item.sizeW || item.sizeL ||
                    item.purchaseUnit || item.purchaseRate || item.stockUnit ||
                    item.estimationUnit || item.estimationRate || item.productHSNName ||
                    item.hsnGroup || item.itemSubGroupName || item.inkColour ||
                    item.pantoneCode || item.bf || item.thickness || item.density ||
                    item.releaseGSM || item.adhesiveGSM
                );
                return hasData;
            });

            if (isExistingUpload && itemData.length > 0) {
                setItemData([...itemData, ...mappedData]);
                toast.success(`Added ${mappedData.length} new item(s)`);
            } else {
                setItemData(mappedData);
                toast.success(`Loaded ${mappedData.length} item(s) for preview`);
            }

            setMode('preview');
            setValidationResult(null);
        } catch (error) {
            toast.error('Failed to parse Excel file');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Reusable: clean item data for API — extracts invalid numeric/bool values into rawValues
    const cleanItemDataForApi = useCallback((data: any[]) => {
        const numericFields = new Set([
            'gsm', 'sizeW', 'sizeL', 'purchaseRate', 'caliper', 'estimationRate',
            'minimumStockQty', 'unitPerPacking', 'wtPerPacking', 'conversionFactor',
            'shelfLife', 'purchaseOrderQuantity', 'thickness', 'density',
            'releaseGSM', 'adhesiveGSM', 'totalGSM'
        ]);
        const boolFields = new Set(['isStandardItem', 'isRegularItem']);

        return data.map(item => {
            const { hsnCode, ...rest } = item;
            const cleaned: any = {};
            const rawValues: Record<string, string> = {};

            Object.keys(rest).forEach(key => {
                const value = (rest as any)[key];
                if (value === undefined || value === null || value === '') {
                    return; // skip
                }

                if (numericFields.has(key)) {
                    const strVal = String(value).trim();
                    if (strVal === '') return;
                    if (!isNaN(Number(strVal)) && strVal !== '') {
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
                    cleaned[key] = value;
                }
            });

            if (Object.keys(rawValues).length > 0) {
                cleaned.rawValues = rawValues;
            }
            return cleaned;
        });
    }, []);

    const handleCheckValidation = async () => {
        if (itemData.length === 0) {
            toast.error('No data to validate');
            return;
        }

        // Step 1: Clear all existing validation states immediately
        setValidationResult(null);

        setIsLoading(true);
        try {
            const cleanedData = cleanItemDataForApi(itemData);

            const result = await validateItems(cleanedData, itemGroupId);
            setValidationResult(result);
            setMode('validated');

            if (result.isValid) {
                toast.success('All validations passed! Ready to import.');
            } else {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount;

                // Aggregate failures by column
                const columnFailures = new Map<string, Set<string>>();

                result.rows.forEach((row: ItemRowValidation) => {
                    // 1. Handle Duplicates (Row Level)
                    if (row.rowStatus === ValidationStatus.Duplicate) {
                        // Attribute duplicate to ItemName as primary indicator
                        const col = 'ItemName';
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
            }
        } catch (error: any) {
            console.error('[Validation Error] Full error:', error);
            console.error('[Validation Error] Response data:', error?.response?.data);
            const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Validation failed';
            const errorDetails = error?.response?.data?.path ? ` (at ${error?.response?.data?.path})` : '';
            showError(errorMsg + errorDetails);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (itemData.length === 0) {
            showError('No data to import');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Full Re-Validation (with same cleaning as Check Validation)
            const cleanedForValidation = cleanItemDataForApi(itemData);
            const result = await validateItems(cleanedForValidation, itemGroupId);
            setValidationResult(result);

            if (!result.isValid) {
                const totalIssues = result.summary.duplicateCount + result.summary.missingDataCount + result.summary.mismatchCount + result.summary.invalidContentCount;

                // Aggregate failures by column
                const columnFailures = new Map<string, Set<string>>();

                result.rows.forEach((row: ItemRowValidation) => {
                    // 1. Handle Duplicates
                    if (row.rowStatus === ValidationStatus.Duplicate) {
                        const col = 'ItemName';
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

            // 2. Confirmation
            if (!window.confirm(`Validation passed. Import ${itemData.length} item(s)?`)) {
                return;
            }

            // 3. Import (use same cleaning — at this point all values are valid after validation passed)
            const cleanedData = cleanItemDataForApi(itemData);

            console.log('[ItemImport] Sending data:', cleanedData);
            const importRes = await importItems(cleanedData, itemGroupId);

            if (importRes.success) {
                console.log('[ItemImport] Success:', importRes);
                // Show success popup instead of toast
                setSuccessInfo({ rowCount: importRes.importedRows ?? cleanedData.length, groupName: itemGroupName });

                // If some rows failed, also show failed rows list after success popup
                if (importRes.errorRows > 0 && importRes.errorMessages && importRes.errorMessages.length > 0) {
                    setValidationModalContent({
                        title: `${importRes.errorRows} Row(s) Failed During Import`,
                        messages: importRes.errorMessages
                    });
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
            console.error('[ItemImport] Error:', error);
            const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Import failed';
            showError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        if (itemData.length === 0) {
            showError('No data to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Item Master');

        let exportColumns: string[] = [];

        if (itemGroupName === 'PAPER') {
            exportColumns = [
                'Quality', 'GSM', 'Manufecturer', 'Finish', 'ManufecturerItemCode',
                'Caliper', 'SizeW', 'SizeL', 'PurchaseUnit', 'PurchaseRate',
                'ShelfLife', 'EstimationUnit', 'EstimationRate', 'StockUnit',
                'MinimumStockQty', 'IsStandardItem', 'IsRegularItem', 'PackingType',
                'UnitPerPacking', 'WtPerPacking', 'ItemSize', 'ItemName',
                'ProductHSNName', 'CertificationType'
            ];
        } else if (itemGroupName === 'REEL') {
            exportColumns = [
                'Quality', 'BF', 'SizeW', 'GSM', 'Caliper', 'Manufecturer',
                'ManufecturerItemCode', 'Finish', 'ShelfLife', 'PurchaseUnit',
                'PurchaseRate', 'EstimationUnit', 'EstimationRate', 'StockUnit',
                'MinimumStockQty', 'IsStandardItem', 'IsRegularItem', 'StockRefCode',
                'ProductHSNName', 'CertificationType', 'ItemName'
            ];
        } else if (itemGroupName === 'INK & ADDITIVES') {
            exportColumns = [
                'ItemSubGroupName', 'ItemType', 'InkColour', 'PantoneCode', 'Manufecturer',
                'ManufecturerItemCode', 'ShelfLife', 'PurchaseUnit', 'PurchaseRate',
                'EstimationUnit', 'EstimationRate', 'StockUnit', 'MinimumStockQty',
                'StockType', 'IsStandardItem', 'IsRegularItem', 'PurchaseOrderQuantity',
                'StockRefCode', 'ProductHSNName', 'ItemName'
            ];
        } else if (itemGroupName === 'VARNISHES & COATINGS') {
            exportColumns = [
                'ItemType', 'Quality', 'ItemSubGroupName', 'Manufecturer', 'ManufecturerItemCode',
                'ShelfLife', 'PurchaseUnit', 'PurchaseRate', 'EstimationUnit', 'EstimationRate',
                'StockUnit', 'MinimumStockQty', 'StockType', 'IsStandardItem', 'IsRegularItem',
                'PurchaseOrderQuantity', 'StockRefCode', 'ProductHSNName', 'ItemName'
            ];
        } else if (itemGroupName === 'LAMINATION FILM') {
            exportColumns = [
                'Quality', 'ItemSubGroupName', 'Manufecturer', 'ManufecturerItemCode', 'SizeW',
                'Thickness', 'Density', 'ShelfLife', 'PurchaseUnit', 'PurchaseRate',
                'EstimationUnit', 'EstimationRate', 'StockUnit', 'MinimumStockQty', 'StockType',
                'IsStandardItem', 'IsRegularItem', 'PurchaseOrderQuantity', 'StockRefCode',
                'ProductHSNName', 'ItemName'
            ];
        } else if (itemGroupName === 'FOIL') {
            exportColumns = [
                'Quality', 'ItemSubGroupName', 'Manufecturer', 'ManufecturerItemCode', 'SizeW',
                'Thickness', 'Density', 'ShelfLife', 'PurchaseUnit', 'PurchaseRate',
                'EstimationUnit', 'EstimationRate', 'StockUnit', 'MinimumStockQty', 'StockType',
                'IsStandardItem', 'IsRegularItem', 'PurchaseOrderQuantity', 'StockRefCode',
                'ProductHSNName', 'ItemName'
            ];
        } else if (itemGroupName === 'ROLL') {
            exportColumns = [
                'ItemType', 'Quality', 'Manufecturer', 'ManufecturerItemCode', 'GSM',
                'ReleaseGSM', 'AdhesiveGSM', 'SizeW', 'Thickness', 'Density', 'TotalGSM',
                'ShelfLife', 'PurchaseUnit', 'PurchaseRate', 'EstimationUnit', 'EstimationRate',
                'StockUnit', 'MinimumStockQty', 'IsStandardItem', 'IsRegularItem',
                'StockRefCode', 'ProductHSNName', 'ItemName'
            ];
        } else if (itemGroupName === 'OTHER MATERIAL') {
            exportColumns = [
                'ItemSubGroupName', 'Quality', 'Manufecturer', 'ManufecturerItemCode',
                'ShelfLife', 'PurchaseUnit', 'PurchaseRate', 'EstimationUnit', 'EstimationRate',
                'StockUnit', 'MinimumStockQty', 'StockType', 'IsStandardItem', 'IsRegularItem',
                'PurchaseOrderQuantity', 'StockRefCode', 'ProductHSNName', 'ItemName'
            ];
        } else {
            // Default columns
            exportColumns = [
                'ItemName', 'HSNGroup', 'StockUnit', 'PurchaseUnit', 'EstimationUnit',
                'UnitPerPacking', 'WtPerPacking', 'ConversionFactor',
                'StockType', 'StockCategory', 'SizeW', 'SizeL',
                'PurchaseRate', 'StockRefCode', 'ItemDescription'
            ];
        }

        worksheet.columns = exportColumns.map(col => ({ header: col, key: col, width: 20 }));
        worksheet.getRow(1).font = { bold: true };

        // Color mapping for validation status
        const colors = {
            duplicate: 'FFFFE0E0',     // Light Red
            missing: 'FFD0E8FF',       // Light Blue
            mismatch: 'FFFFFF99',      // Light Yellow
            invalid: 'FFE8D0FF'        // Light Purple
        };

        const validationMap = new Map<number, ItemRowValidation>();
        validationResult?.rows.forEach(row => validationMap.set(row.rowIndex, row));

        itemData.forEach((item, rowIndex) => {
            let rowValues: any = {};

            if (itemGroupName === 'PAPER') {
                rowValues = {
                    Quality: item.quality,
                    GSM: item.gsm,
                    Manufecturer: item.manufecturer,
                    Finish: item.finish,
                    ManufecturerItemCode: item.manufecturerItemCode,
                    Caliper: item.caliper,
                    SizeW: item.sizeW,
                    SizeL: item.sizeL,
                    PurchaseUnit: item.purchaseUnit,
                    PurchaseRate: item.purchaseRate,
                    ShelfLife: item.shelfLife,
                    EstimationUnit: item.estimationUnit,
                    EstimationRate: item.estimationRate,
                    StockUnit: item.stockUnit,
                    MinimumStockQty: item.minimumStockQty,
                    IsStandardItem: item.isStandardItem,
                    IsRegularItem: item.isRegularItem,
                    PackingType: item.packingType,
                    UnitPerPacking: item.unitPerPacking,
                    WtPerPacking: item.wtPerPacking,
                    ItemSize: item.itemSize,
                    ItemName: item.itemName,
                    ProductHSNName: item.productHSNName,
                    CertificationType: item.certificationType
                };
            } else if (itemGroupName === 'REEL') {
                rowValues = {
                    Quality: item.quality,
                    BF: item.bf,
                    SizeW: item.sizeW,
                    GSM: item.gsm,
                    Caliper: item.caliper,
                    Manufecturer: item.manufecturer,
                    ManufecturerItemCode: item.manufecturerItemCode,
                    Finish: item.finish,
                    ShelfLife: item.shelfLife,
                    PurchaseUnit: item.purchaseUnit,
                    PurchaseRate: item.purchaseRate,
                    EstimationUnit: item.estimationUnit,
                    EstimationRate: item.estimationRate,
                    StockUnit: item.stockUnit,
                    MinimumStockQty: item.minimumStockQty,
                    IsStandardItem: item.isStandardItem,
                    IsRegularItem: item.isRegularItem,
                    StockRefCode: item.stockRefCode,
                    ProductHSNName: item.productHSNName,
                    CertificationType: item.certificationType,
                    ItemName: item.itemName
                };
            } else if (itemGroupName === 'INK & ADDITIVES') {
                rowValues = {
                    ItemSubGroupName: item.itemSubGroupName,
                    ItemType: item.itemType,
                    InkColour: item.inkColour,
                    PantoneCode: item.pantoneCode,
                    Manufecturer: item.manufecturer,
                    ManufecturerItemCode: item.manufecturerItemCode,
                    ShelfLife: item.shelfLife,
                    PurchaseUnit: item.purchaseUnit,
                    PurchaseRate: item.purchaseRate,
                    EstimationUnit: item.estimationUnit,
                    EstimationRate: item.estimationRate,
                    StockUnit: item.stockUnit,
                    MinimumStockQty: item.minimumStockQty,
                    StockType: item.stockType,
                    IsStandardItem: item.isStandardItem,
                    IsRegularItem: item.isRegularItem,
                    PurchaseOrderQuantity: item.purchaseOrderQuantity,
                    StockRefCode: item.stockRefCode,
                    ProductHSNName: item.productHSNName,
                    ItemName: item.itemName
                };
            } else if (itemGroupName === 'VARNISHES & COATINGS') {
                rowValues = {
                    ItemType: item.itemType,
                    Quality: item.quality,
                    ItemSubGroupName: item.itemSubGroupName,
                    Manufecturer: item.manufecturer,
                    ManufecturerItemCode: item.manufecturerItemCode,
                    ShelfLife: item.shelfLife,
                    PurchaseUnit: item.purchaseUnit,
                    PurchaseRate: item.purchaseRate,
                    EstimationUnit: item.estimationUnit,
                    EstimationRate: item.estimationRate,
                    StockUnit: item.stockUnit,
                    MinimumStockQty: item.minimumStockQty,
                    StockType: item.stockType,
                    IsStandardItem: item.isStandardItem,
                    IsRegularItem: item.isRegularItem,
                    PurchaseOrderQuantity: item.purchaseOrderQuantity,
                    StockRefCode: item.stockRefCode,
                    ProductHSNName: item.productHSNName,
                    ItemName: item.itemName
                };
            } else if (itemGroupName === 'LAMINATION FILM') {
                rowValues = {
                    Quality: item.quality,
                    ItemSubGroupName: item.itemSubGroupName,
                    Manufecturer: item.manufecturer,
                    ManufecturerItemCode: item.manufecturerItemCode,
                    SizeW: item.sizeW,
                    Thickness: item.thickness,
                    Density: item.density,
                    ShelfLife: item.shelfLife,
                    PurchaseUnit: item.purchaseUnit,
                    PurchaseRate: item.purchaseRate,
                    EstimationUnit: item.estimationUnit,
                    EstimationRate: item.estimationRate,
                    StockUnit: item.stockUnit,
                    MinimumStockQty: item.minimumStockQty,
                    StockType: item.stockType,
                    IsStandardItem: item.isStandardItem,
                    IsRegularItem: item.isRegularItem,
                    PurchaseOrderQuantity: item.purchaseOrderQuantity,
                    StockRefCode: item.stockRefCode,
                    ProductHSNName: item.productHSNName,
                    ItemName: item.itemName
                };
            } else if (itemGroupName === 'FOIL') {
                rowValues = {
                    Quality: item.quality,
                    ItemSubGroupName: item.itemSubGroupName,
                    Manufecturer: item.manufecturer,
                    ManufecturerItemCode: item.manufecturerItemCode,
                    SizeW: item.sizeW,
                    Thickness: item.thickness,
                    Density: item.density,
                    ShelfLife: item.shelfLife,
                    PurchaseUnit: item.purchaseUnit,
                    PurchaseRate: item.purchaseRate,
                    EstimationUnit: item.estimationUnit,
                    EstimationRate: item.estimationRate,
                    StockUnit: item.stockUnit,
                    MinimumStockQty: item.minimumStockQty,
                    StockType: item.stockType,
                    IsStandardItem: item.isStandardItem,
                    IsRegularItem: item.isRegularItem,
                    PurchaseOrderQuantity: item.purchaseOrderQuantity,
                    StockRefCode: item.stockRefCode,
                    ProductHSNName: item.productHSNName,
                    ItemName: item.itemName
                };
            } else if (itemGroupName === 'ROLL') {
                rowValues = {
                    ItemType: item.itemType,
                    Quality: item.quality,
                    Manufecturer: item.manufecturer,
                    ManufecturerItemCode: item.manufecturerItemCode,
                    GSM: item.gsm,
                    ReleaseGSM: item.releaseGSM,
                    AdhesiveGSM: item.adhesiveGSM,
                    SizeW: item.sizeW,
                    Thickness: item.thickness,
                    Density: item.density,
                    TotalGSM: item.totalGSM,
                    ShelfLife: item.shelfLife,
                    PurchaseUnit: item.purchaseUnit,
                    PurchaseRate: item.purchaseRate,
                    EstimationUnit: item.estimationUnit,
                    EstimationRate: item.estimationRate,
                    StockUnit: item.stockUnit,
                    MinimumStockQty: item.minimumStockQty,
                    IsStandardItem: item.isStandardItem,
                    IsRegularItem: item.isRegularItem,
                    StockRefCode: item.stockRefCode,
                    ProductHSNName: item.productHSNName,
                    ItemName: item.itemName
                };
            } else if (itemGroupName === 'OTHER MATERIAL') {
                rowValues = {
                    ItemSubGroupName: item.itemSubGroupName,
                    Quality: item.quality,
                    Manufecturer: item.manufecturer,
                    ManufecturerItemCode: item.manufecturerItemCode,
                    ShelfLife: item.shelfLife,
                    PurchaseUnit: item.purchaseUnit,
                    PurchaseRate: item.purchaseRate,
                    EstimationUnit: item.estimationUnit,
                    EstimationRate: item.estimationRate,
                    StockUnit: item.stockUnit,
                    MinimumStockQty: item.minimumStockQty,
                    StockType: item.stockType,
                    IsStandardItem: item.isStandardItem,
                    IsRegularItem: item.isRegularItem,
                    PurchaseOrderQuantity: item.purchaseOrderQuantity,
                    StockRefCode: item.stockRefCode,
                    ProductHSNName: item.productHSNName,
                    ItemName: item.itemName
                };
            } else {
                rowValues = {
                    ItemName: item.itemName,
                    HSNGroup: item.hsnGroup,
                    StockUnit: item.stockUnit,
                    PurchaseUnit: item.purchaseUnit,
                    EstimationUnit: item.estimationUnit,
                    UnitPerPacking: item.unitPerPacking,
                    WtPerPacking: item.wtPerPacking,
                    ConversionFactor: item.conversionFactor,
                    StockType: item.stockType,
                    StockCategory: item.stockCategory,
                    SizeW: item.sizeW,
                    SizeL: item.sizeL,
                    PurchaseRate: item.purchaseRate,
                    StockRefCode: item.stockRefCode,
                    ItemDescription: item.itemDescription
                };
            }

            const excelRow = worksheet.addRow(rowValues);

            // Apply validation colors if validation results exist
            if (validationResult && validationMap.has(rowIndex)) {
                const rowValidation = validationMap.get(rowIndex);

                if (rowValidation) {
                    // For duplicate rows, color the entire row red
                    if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
                        excelRow.eachCell((cell) => {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: colors.duplicate }
                            };
                        });
                    } else {
                        // For other validations, color specific cells
                        rowValidation.cellValidations?.forEach((cellVal: any) => {
                            // Find column index (Case-insensitive match)
                            const lowerColName = cellVal.columnName.toLowerCase();
                            const colIndexFound = exportColumns.findIndex(c => c.toLowerCase() === lowerColName) + 1;

                            if (colIndexFound > 0) {
                                const cell = excelRow.getCell(colIndexFound);
                                let fillColor = '';

                                if (cellVal.status === ValidationStatus.MissingData) {
                                    fillColor = colors.missing;
                                } else if (cellVal.status === ValidationStatus.Mismatch) {
                                    fillColor = colors.mismatch;
                                } else if (cellVal.status === ValidationStatus.InvalidContent) {
                                    fillColor = colors.invalid;
                                }

                                if (fillColor) {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: fillColor }
                                    };
                                }
                            }
                        });
                    }
                }
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${itemGroupName}.xlsx`);
        toast.success('Data exported successfully with validation colors');
    };

    const handleRemoveSelectedRows = async () => {
        if (selectedRows.size === 0) {
            toast.error('Please select rows to remove');
            return;
        }

        if (!window.confirm(`Are you sure you want to remove ${selectedRows.size} Item(s)?`)) {
            return;
        }

        if (mode === 'preview' || mode === 'validated') {
            const newData = itemData.filter((_, index) => !selectedRows.has(index));
            setItemData(newData);
            setSelectedRows(new Set());
            setValidationResult(null);
            setMode('preview'); // Ensure mode stays in preview/edit
            toast.success(`Removed ${selectedRows.size} row(s) from preview`);
            return;
        }

        // Backend Deletion Logic (for Loaded Data)
        setIsLoading(true);
        try {
            const selectedIndices = Array.from(selectedRows);
            const itemsToDelete = selectedIndices.map(index => itemData[index]).filter(item => item && item.itemID);

            let deletedCount = 0;
            for (const item of itemsToDelete) {
                if (item.itemID) {
                    await softDeleteItem(item.itemID);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                toast.success(`Successfully removed ${deletedCount} item(s) from database`);
                await handleLoadData();
                setSelectedRows(new Set());
            } else {
                // Fallback if no valid IDs found in selection
                if (itemsToDelete.length === 0 && selectedRows.size > 0) {
                    toast.error('Selected rows do not have valid IDs or are not saved yet.');
                } else {
                    toast.error('No items were deleted.');
                }
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to remove items');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearAllDataTrigger = async (type: 'clearOnly' | 'freshUpload') => {
        setClearActionType(type);

        if (type === 'clearOnly') {
            setIsLoading(true);
            const count = await getItemCount(itemGroupId);
            setIsLoading(false);

            if (count === 0) {
                setNoDataPopupGroup(`${itemGroupName} Item Group`);
                return;
            }
        }
        setClearFlowStep(1);
        generateCaptcha();
    };

    const handleClearConfirm = (step: 1 | 2 | 3) => {
        // Validate CAPTCHA
        const userAnswer = parseInt(captchaInput);
        if (isNaN(userAnswer) || userAnswer !== captchaQuestion.answer) {
            setCaptchaError(true);
            showError('❌ Incorrect CAPTCHA answer. Please try again.');
            return;
        }

        // Move to next step and generate new CAPTCHA
        setClearFlowStep((step + 1) as any);
        generateCaptcha();
    };

    const handleClearCancel = () => {
        setClearFlowStep(0);
        setClearCredentials({ username: '', password: '', reason: '' });
        setCaptchaInput('');
        setCaptchaError(false);
    };

    const handleCredentialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let deletedCount = 0;
            try {
                const result = await clearAllItemData(
                    clearCredentials.username,
                    clearCredentials.password,
                    clearCredentials.reason,
                    itemGroupId
                );
                deletedCount = result.deletedCount || 0;
            } catch (clearError: any) {
                if (clearError?.response?.status === 401 || clearError?.response?.status === 403) {
                    throw clearError;
                }
                deletedCount = 0;
            }

            if (deletedCount > 0 && clearActionType === 'clearOnly') {
                setClearSuccessInfo({ rowCount: deletedCount, groupName: `${itemGroupName} Item Group` });
            } else if (deletedCount === 0 && clearActionType === 'clearOnly') {
                toast.success('No existing data to clear.');
            }
            setItemData([]);
            setValidationResult(null);
            setMode('idle');

            setIsLoading(false);

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
            if (error?.response?.status === 401) {
                showError('❌ Invalid credentials');
            } else {
                showError('Failed to clear data');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // AG Grid Configuration
    const columnDefs: ColDef[] = useMemo(() => {
        // Determine if grid should be editable (not when loading from database)
        const isEditable = mode !== 'loaded';

        const baseCols: ColDef[] = [
            {
                headerName: '#',
                headerCheckboxSelection: true,
                headerCheckboxSelectionFilteredOnly: true,
                checkboxSelection: true,
                width: 50,
                pinned: 'left'
            },
            {
                headerName: '#',
                valueGetter: 'node.rowIndex + 1',
                width: 60,
                pinned: 'left'
            }
        ];

        // PAPER Group Columns
        if (itemGroupName === 'PAPER') {
            return [
                ...baseCols,
                { field: 'quality', headerName: 'Quality', editable: isEditable, width: 150 },
                { field: 'gsm', headerName: 'GSM', editable: isEditable, width: 90, type: 'numericColumn' },
                { field: 'manufecturer', headerName: 'Manufecturer', editable: isEditable, width: 150 },
                { field: 'finish', headerName: 'Finish', editable: isEditable, width: 120 },
                { field: 'manufecturerItemCode', headerName: 'ManufecturerItemCode', editable: isEditable, width: 150 },
                {
                    field: 'caliper', headerName: 'Caliper', editable: false, width: 100, type: 'numericColumn',
                    cellStyle: { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
                },
                { field: 'sizeW', headerName: 'SizeW', editable: isEditable, width: 100, type: 'numericColumn' },
                { field: 'sizeL', headerName: 'SizeL', editable: isEditable, width: 100, type: 'numericColumn' },
                {
                    field: 'purchaseUnit', headerName: 'PurchaseUnit', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'purchaseRate', headerName: 'PurchaseRate', editable: isEditable, width: 130, type: 'numericColumn' },
                { field: 'shelfLife', headerName: 'ShelfLife', editable: isEditable, width: 110, type: 'numericColumn' },
                {
                    field: 'estimationUnit', headerName: 'EstimationUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'estimationRate', headerName: 'EstimationRate', editable: isEditable, width: 110, type: 'numericColumn' },
                {
                    field: 'stockUnit', headerName: 'StockUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'minimumStockQty', headerName: 'MinimumStockQty', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'isStandardItem', headerName: 'IsStandardItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'isRegularItem', headerName: 'IsRegularItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'packingType', headerName: 'PackingType', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: ['Sheet', 'Gross', 'Ream', 'Packet'] }
                },
                { field: 'unitPerPacking', headerName: 'UnitPerPacking', editable: isEditable, width: 130, type: 'numericColumn' },
                { field: 'wtPerPacking', headerName: 'WtPerPacking', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'itemSize', headerName: 'ItemSize', editable: false, width: 140,
                    cellStyle: { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
                },
                { field: 'itemName', headerName: 'ItemName', editable: isEditable, width: 250 },
                {
                    field: 'productHSNName', headerName: 'ProductHSNName', editable: isEditable, width: 200,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: hsnGroups.map(h => h.displayName) }
                },
                {
                    field: 'certificationType', headerName: 'Certification Type', editable: isEditable, width: 150,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: ['NONE', 'FSC', 'PEFC'] }
                }
            ];
        }

        // REEL Group Columns
        if (itemGroupName === 'REEL') {
            return [
                ...baseCols,
                { field: 'quality', headerName: 'Quality', editable: isEditable, width: 150 },
                { field: 'bf', headerName: 'BF', editable: isEditable, width: 100 },
                { field: 'sizeW', headerName: 'SizeW', editable: isEditable, width: 100, type: 'numericColumn' },
                { field: 'gsm', headerName: 'GSM', editable: isEditable, width: 90, type: 'numericColumn' },
                {
                    field: 'caliper', headerName: 'Caliper', editable: false, width: 100, type: 'numericColumn',
                    cellStyle: { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
                },
                { field: 'manufecturer', headerName: 'Manufecturer', editable: isEditable, width: 150 },
                { field: 'manufecturerItemCode', headerName: 'ManufecturerItemCode', editable: isEditable, width: 150 },
                { field: 'finish', headerName: 'Finish', editable: isEditable, width: 120 },
                { field: 'shelfLife', headerName: 'ShelfLife', editable: isEditable, width: 110, type: 'numericColumn' },
                {
                    field: 'purchaseUnit', headerName: 'PurchaseUnit', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'purchaseRate', headerName: 'PurchaseRate', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'estimationUnit', headerName: 'EstimationUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'estimationRate', headerName: 'EstimationRate', editable: isEditable, width: 110, type: 'numericColumn' },
                {
                    field: 'stockUnit', headerName: 'StockUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'minimumStockQty', headerName: 'MinimumStockQty', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'isStandardItem', headerName: 'IsStandardItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'isRegularItem', headerName: 'IsRegularItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                { field: 'stockRefCode', headerName: 'StockRefCode', editable: isEditable, width: 150 },
                {
                    field: 'productHSNName', headerName: 'ProductHSNName', editable: isEditable, width: 200,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: hsnGroups.map(h => h.displayName) }
                },
                {
                    field: 'certificationType', headerName: 'CertificationType', editable: isEditable, width: 150,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: ['NONE', 'FSC', 'PEFC'] }
                },
                { field: 'itemName', headerName: 'ItemName', editable: isEditable, width: 300 }
            ];
        }

        // INK & ADDITIVES Group Columns
        if (itemGroupName === 'INK & ADDITIVES') {
            return [
                ...baseCols,
                {
                    field: 'itemSubGroupName', headerName: 'ItemSubGroupName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: itemSubGroups.map(sg => sg.itemSubGroupName) }
                },
                { field: 'itemType', headerName: 'ItemType', editable: isEditable, width: 150 },
                { field: 'inkColour', headerName: 'InkColour', editable: isEditable, width: 120 },
                { field: 'pantoneCode', headerName: 'PantoneCode', editable: isEditable, width: 120 },
                { field: 'manufecturer', headerName: 'Manufecturer', editable: isEditable, width: 150 },
                { field: 'manufecturerItemCode', headerName: 'ManufecturerItemCode', editable: isEditable, width: 180 },
                { field: 'shelfLife', headerName: 'ShelfLife', editable: isEditable, width: 100, type: 'numericColumn' },
                {
                    field: 'purchaseUnit', headerName: 'PurchaseUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'purchaseRate', headerName: 'PurchaseRate', editable: isEditable, width: 120, type: 'numericColumn' },
                {
                    field: 'estimationUnit', headerName: 'EstimationUnit', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'estimationRate', headerName: 'EstimationRate', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'stockUnit', headerName: 'StockUnit', editable: isEditable, width: 110,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'minimumStockQty', headerName: 'MinimumStockQty', editable: isEditable, width: 150, type: 'numericColumn' },
                { field: 'stockType', headerName: 'StockType', editable: isEditable, width: 150 },
                {
                    field: 'isStandardItem', headerName: 'IsStandardItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'isRegularItem', headerName: 'IsRegularItem', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                { field: 'purchaseOrderQuantity', headerName: 'PurchaseOrderQuantity', editable: isEditable, width: 180, type: 'numericColumn' },
                { field: 'stockRefCode', headerName: 'StockRefCode', editable: isEditable, width: 130 },
                {
                    field: 'productHSNName', headerName: 'ProductHSNName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: hsnGroups.map(h => h.displayName) }
                },
                { field: 'itemName', headerName: 'ItemName', editable: isEditable, width: 300 }
            ];
        }

        // OTHER MATERIAL Group Columns
        if (itemGroupName === 'OTHER MATERIAL') {
            return [
                ...baseCols,
                {
                    field: 'itemSubGroupName', headerName: 'ItemSubGroupName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: itemSubGroups.map(sg => sg.itemSubGroupName) }
                },
                { field: 'quality', headerName: 'Quality', editable: isEditable, width: 150 },
                { field: 'manufecturer', headerName: 'Manufacturer', editable: isEditable, width: 150 },
                { field: 'manufecturerItemCode', headerName: 'ManufacturerItemCode', editable: isEditable, width: 180 },
                { field: 'shelfLife', headerName: 'ShelfLife', editable: isEditable, width: 100, type: 'numericColumn' },
                {
                    field: 'purchaseUnit', headerName: 'PurchaseUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'purchaseRate', headerName: 'PurchaseRate', editable: isEditable, width: 120, type: 'numericColumn' },
                {
                    field: 'estimationUnit', headerName: 'EstimationUnit', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'estimationRate', headerName: 'EstimationRate', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'stockUnit', headerName: 'StockUnit', editable: isEditable, width: 110,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'minimumStockQty', headerName: 'MinimumStockQty', editable: isEditable, width: 150, type: 'numericColumn' },
                { field: 'stockType', headerName: 'StockType', editable: isEditable, width: 150 },
                {
                    field: 'isStandardItem', headerName: 'IsStandardItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'isRegularItem', headerName: 'IsRegularItem', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                { field: 'purchaseOrderQuantity', headerName: 'PurchaseOrderQuantity', editable: isEditable, width: 180, type: 'numericColumn' },
                { field: 'stockRefCode', headerName: 'StockRefCode', editable: isEditable, width: 130 },
                {
                    field: 'productHSNName', headerName: 'ProductHSNName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: hsnGroups.map(h => h.displayName) }
                },
                { field: 'itemName', headerName: 'ItemName', editable: isEditable, width: 300 }
            ];
        }

        // VARNISHES & COATINGS Group Columns
        if (itemGroupName === 'VARNISHES & COATINGS') {
            return [
                ...baseCols,
                { field: 'itemType', headerName: 'ItemType', editable: isEditable, width: 150 },
                { field: 'quality', headerName: 'Quality', editable: isEditable, width: 150 },
                {
                    field: 'itemSubGroupName', headerName: 'ItemSubGroupName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: itemSubGroups.map(sg => sg.itemSubGroupName) }
                },
                { field: 'manufecturer', headerName: 'Manufacturer', editable: isEditable, width: 150 },
                { field: 'manufecturerItemCode', headerName: 'ManufacturerItemCode', editable: isEditable, width: 180 },
                { field: 'shelfLife', headerName: 'ShelfLife', editable: isEditable, width: 100, type: 'numericColumn' },
                {
                    field: 'purchaseUnit', headerName: 'PurchaseUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'purchaseRate', headerName: 'PurchaseRate', editable: isEditable, width: 120, type: 'numericColumn' },
                {
                    field: 'estimationUnit', headerName: 'EstimationUnit', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'estimationRate', headerName: 'EstimationRate', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'stockUnit', headerName: 'StockUnit', editable: isEditable, width: 110,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'minimumStockQty', headerName: 'MinimumStockQty', editable: isEditable, width: 150, type: 'numericColumn' },
                { field: 'stockType', headerName: 'StockType', editable: isEditable, width: 150 },
                {
                    field: 'isStandardItem', headerName: 'IsStandardItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'isRegularItem', headerName: 'IsRegularItem', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                { field: 'purchaseOrderQuantity', headerName: 'PurchaseOrderQuantity', editable: isEditable, width: 180, type: 'numericColumn' },
                { field: 'stockRefCode', headerName: 'StockRefCode', editable: isEditable, width: 130 },
                {
                    field: 'productHSNName', headerName: 'ProductHSNName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: hsnGroups.map(h => h.displayName) }
                },
                { field: 'itemName', headerName: 'ItemName', editable: isEditable, width: 300 }
            ];
        }

        // LAMINATION FILM Group Columns
        if (itemGroupName === 'LAMINATION FILM') {
            return [
                ...baseCols,
                { field: 'quality', headerName: 'Quality', editable: isEditable, width: 150 },
                {
                    field: 'itemSubGroupName', headerName: 'ItemSubGroupName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: itemSubGroups.map(sg => sg.itemSubGroupName) }
                },
                { field: 'manufecturer', headerName: 'Manufacturer', editable: isEditable, width: 150 },
                { field: 'manufecturerItemCode', headerName: 'ManufacturerItemCode', editable: isEditable, width: 180 },
                { field: 'sizeW', headerName: 'SizeW', editable: isEditable, width: 100, type: 'numericColumn' },
                { field: 'thickness', headerName: 'Thickness', editable: isEditable, width: 110, type: 'numericColumn' },
                { field: 'density', headerName: 'Density', editable: isEditable, width: 100, type: 'numericColumn' },
                { field: 'shelfLife', headerName: 'ShelfLife', editable: isEditable, width: 100, type: 'numericColumn' },
                {
                    field: 'purchaseUnit', headerName: 'PurchaseUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'purchaseRate', headerName: 'PurchaseRate', editable: isEditable, width: 120, type: 'numericColumn' },
                {
                    field: 'estimationUnit', headerName: 'EstimationUnit', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'estimationRate', headerName: 'EstimationRate', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'stockUnit', headerName: 'StockUnit', editable: isEditable, width: 110,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'minimumStockQty', headerName: 'MinimumStockQty', editable: isEditable, width: 150, type: 'numericColumn' },
                { field: 'stockType', headerName: 'StockType', editable: isEditable, width: 150 },
                {
                    field: 'isStandardItem', headerName: 'IsStandardItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'isRegularItem', headerName: 'IsRegularItem', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                { field: 'purchaseOrderQuantity', headerName: 'PurchaseOrderQuantity', editable: isEditable, width: 180, type: 'numericColumn' },
                { field: 'stockRefCode', headerName: 'StockRefCode', editable: isEditable, width: 130 },
                {
                    field: 'productHSNName', headerName: 'ProductHSNName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: hsnGroups.map(h => h.displayName) }
                },
                { field: 'itemName', headerName: 'ItemName', editable: isEditable, width: 300 }
            ];
        }

        // FOIL Group Columns
        if (itemGroupName === 'FOIL') {
            return [
                ...baseCols,
                { field: 'quality', headerName: 'Quality', editable: isEditable, width: 150 },
                {
                    field: 'itemSubGroupName', headerName: 'ItemSubGroupName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: itemSubGroups.map(sg => sg.itemSubGroupName) }
                },
                { field: 'manufecturer', headerName: 'Manufacturer', editable: isEditable, width: 150 },
                { field: 'manufecturerItemCode', headerName: 'ManufacturerItemCode', editable: isEditable, width: 180 },
                { field: 'sizeW', headerName: 'SizeW', editable: isEditable, width: 100, type: 'numericColumn' },
                { field: 'thickness', headerName: 'Thickness', editable: isEditable, width: 110, type: 'numericColumn' },
                { field: 'density', headerName: 'Density', editable: isEditable, width: 100, type: 'numericColumn' },
                { field: 'shelfLife', headerName: 'ShelfLife', editable: isEditable, width: 100, type: 'numericColumn' },
                {
                    field: 'purchaseUnit', headerName: 'PurchaseUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'purchaseRate', headerName: 'PurchaseRate', editable: isEditable, width: 120, type: 'numericColumn' },
                {
                    field: 'estimationUnit', headerName: 'EstimationUnit', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'estimationRate', headerName: 'EstimationRate', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'stockUnit', headerName: 'StockUnit', editable: isEditable, width: 110,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'minimumStockQty', headerName: 'MinimumStockQty', editable: isEditable, width: 150, type: 'numericColumn' },
                { field: 'stockType', headerName: 'StockType', editable: isEditable, width: 150 },
                {
                    field: 'isStandardItem', headerName: 'IsStandardItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'isRegularItem', headerName: 'IsRegularItem', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                { field: 'purchaseOrderQuantity', headerName: 'PurchaseOrderQuantity', editable: isEditable, width: 180, type: 'numericColumn' },
                { field: 'stockRefCode', headerName: 'StockRefCode', editable: isEditable, width: 130 },
                {
                    field: 'productHSNName', headerName: 'ProductHSNName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: hsnGroups.map(h => h.displayName) }
                },
                { field: 'itemName', headerName: 'ItemName', editable: isEditable, width: 300 }
            ];
        }

        // ROLL Group Columns
        if (itemGroupName === 'ROLL') {
            return [
                ...baseCols,
                {
                    field: 'itemType', headerName: 'ItemType', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: ['Paper', 'Film'] }
                },
                { field: 'quality', headerName: 'Quality', editable: isEditable, width: 150 },
                { field: 'manufecturer', headerName: 'Manufacturer', editable: isEditable, width: 150 },
                { field: 'manufecturerItemCode', headerName: 'ManufacturerItemCode', editable: isEditable, width: 180 },
                { field: 'gsm', headerName: 'GSM', editable: isEditable, width: 90, type: 'numericColumn' },
                { field: 'releaseGSM', headerName: 'ReleaseGSM', editable: isEditable, width: 110, type: 'numericColumn' },
                { field: 'adhesiveGSM', headerName: 'AdhesiveGSM', editable: isEditable, width: 120, type: 'numericColumn' },
                { field: 'sizeW', headerName: 'SizeW', editable: isEditable, width: 100, type: 'numericColumn' },
                { field: 'thickness', headerName: 'Thickness', editable: isEditable, width: 110, type: 'numericColumn' },
                { field: 'density', headerName: 'Density', editable: isEditable, width: 100, type: 'numericColumn' },
                {
                    field: 'totalGSM', headerName: 'TotalGSM', editable: false, width: 110, type: 'numericColumn',
                    cellStyle: { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
                },
                { field: 'shelfLife', headerName: 'ShelfLife', editable: isEditable, width: 100, type: 'numericColumn' },
                {
                    field: 'purchaseUnit', headerName: 'PurchaseUnit', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'purchaseRate', headerName: 'PurchaseRate', editable: isEditable, width: 120, type: 'numericColumn' },
                {
                    field: 'estimationUnit', headerName: 'EstimationUnit', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'estimationRate', headerName: 'EstimationRate', editable: isEditable, width: 130, type: 'numericColumn' },
                {
                    field: 'stockUnit', headerName: 'StockUnit', editable: isEditable, width: 110,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: units.map(u => u.unitSymbol) }
                },
                { field: 'minimumStockQty', headerName: 'MinimumStockQty', editable: isEditable, width: 150, type: 'numericColumn' },
                {
                    field: 'isStandardItem', headerName: 'IsStandardItem', editable: isEditable, width: 130,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                {
                    field: 'isRegularItem', headerName: 'IsRegularItem', editable: isEditable, width: 120,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: [true, false] }
                },
                { field: 'stockRefCode', headerName: 'StockRefCode', editable: isEditable, width: 130 },
                {
                    field: 'productHSNName', headerName: 'ProductHSNName', editable: isEditable, width: 180,
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: hsnGroups.map(h => h.displayName) }
                },
                { field: 'itemName', headerName: 'ItemName', editable: isEditable, width: 300 }
            ];
        }

        const cols: ColDef[] = [
            ...baseCols,
            { field: 'itemName', headerName: 'Item Name', editable: isEditable, width: 250 },
            {
                field: 'hsnGroup',
                headerName: 'HSN Group',
                editable: isEditable,
                width: 180,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: hsnGroups.map(h => h.displayName)
                }
            },
            {
                field: 'stockUnit', headerName: 'Stock Unit', editable: isEditable, width: 120,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: { values: units.map(u => u.unitSymbol) }
            },
            {
                field: 'purchaseUnit', headerName: 'Purchase Unit', editable: isEditable, width: 140,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: { values: units.map(u => u.unitSymbol) }
            },
            {
                field: 'estimationUnit', headerName: 'Estimation Unit', editable: isEditable, width: 150,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: { values: units.map(u => u.unitSymbol) }
            },
            { field: 'unitPerPacking', headerName: 'Unit/Packing', editable: isEditable, width: 140, type: 'numericColumn' },
            { field: 'wtPerPacking', headerName: 'Wt/Packing', editable: isEditable, width: 130, type: 'numericColumn' },
            { field: 'conversionFactor', headerName: 'Conv. Factor', editable: isEditable, width: 140, type: 'numericColumn' },
            { field: 'stockType', headerName: 'Stock Type', editable: isEditable, width: 130 },
            { field: 'stockCategory', headerName: 'Stock Category', editable: isEditable, width: 150 },
            { field: 'sizeW', headerName: 'Size W', editable: isEditable, width: 100, type: 'numericColumn' },
            { field: 'sizeL', headerName: 'Size L', editable: isEditable, width: 100, type: 'numericColumn' },
            { field: 'purchaseRate', headerName: 'Purchase Rate', editable: isEditable, width: 140, type: 'numericColumn' },
            { field: 'stockRefCode', headerName: 'Stock Ref Code', editable: isEditable, width: 150 },
            { field: 'itemDescription', headerName: 'Description', editable: isEditable, width: 250 }
        ];
        return cols;
    }, [hsnGroups, units, itemGroupName, isDark, mode]);

    const defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        resizable: true,
        editable: false
    };

    const onGridReady = useCallback((params: any) => {
        setGridApi(params.api);
    }, []);

    const onSelectionChanged = useCallback(() => {
        if (!gridApi) return;
        const selectedNodes = gridApi.getSelectedNodes();
        // Use itemData.indexOf to get the stable index in the source array, NOT the view index
        const indices = new Set(selectedNodes.map(node => itemData.indexOf(node.data)).filter(i => i !== -1));
        setSelectedRows(indices);
    }, [gridApi, itemData]);

    const onCellValueChanged = useCallback((params: any) => {
        // Use stable index lookup (works correctly with filtered/sorted grids)
        const rowIndex = itemData.indexOf(params.data);
        if (rowIndex === -1) return;

        const updatedData = [...itemData];
        const item = { ...params.data }; // Shallow copy to avoid mutation issues

        // PAPER Calculations - Excel-like live updates
        if (itemGroupName === 'PAPER') {
            const changedField = params.colDef.field;

            // Recalculate Caliper (GSM / 1000)
            if (changedField === 'gsm') {
                if (item.gsm && item.gsm > 0) {
                    item.caliper = parseFloat((item.gsm / 1000).toFixed(3));
                } else {
                    item.caliper = null;
                }
            }

            // Recalculate ItemSize (SizeW X SizeL)
            if (changedField === 'sizeW' || changedField === 'sizeL') {
                if (item.sizeW && item.sizeW > 0 && item.sizeL && item.sizeL > 0) {
                    item.itemSize = `${item.sizeW} X ${item.sizeL}`;
                } else {
                    item.itemSize = null;
                }
            }

            // Recalculate WtPerPacking ((SizeW * SizeL * GSM * UnitPerPacking) / 1000000000)
            if (['sizeW', 'sizeL', 'gsm', 'unitPerPacking'].includes(changedField)) {
                if (item.sizeW && item.sizeW > 0 &&
                    item.sizeL && item.sizeL > 0 &&
                    item.gsm && item.gsm > 0 &&
                    item.unitPerPacking && item.unitPerPacking > 0) {
                    const val = (item.sizeW * item.sizeL * item.gsm * item.unitPerPacking) / 1000000000;
                    item.wtPerPacking = parseFloat(val.toFixed(4));
                } else {
                    item.wtPerPacking = null;
                }
            }

            // Recalculate ItemName (Quality, GSM, Manufacturer, Finish, ItemSize)
            if (['quality', 'gsm', 'manufecturer', 'finish', 'sizeW', 'sizeL'].includes(changedField)) {
                const parts = [];
                if (item.quality) parts.push(item.quality);
                if (item.gsm) parts.push(`${item.gsm} GSM`);
                if (item.manufecturer) parts.push(item.manufecturer);
                if (item.finish) parts.push(item.finish);
                if (item.itemSize) parts.push(`${item.itemSize} MM`);

                item.itemName = parts.join(' ');
            }
        }

        // REEL Calculations - Excel-like live updates
        if (itemGroupName === 'REEL') {
            const changedField = params.colDef.field;

            // Recalculate Caliper (GSM / 1000)
            if (changedField === 'gsm') {
                if (item.gsm && item.gsm > 0) {
                    item.caliper = parseFloat((item.gsm / 1000).toFixed(3));
                } else {
                    item.caliper = null;
                }
            }

            // Recalculate ItemName (BF + Quality + GSM + Manufacturer + Finish + SizeW + Caliper)
            if (['bf', 'quality', 'gsm', 'manufecturer', 'finish', 'sizeW'].includes(changedField)) {
                // Ensure Caliper is updated first if GSM changed
                if (changedField === 'gsm' && item.gsm && item.gsm > 0) {
                    item.caliper = parseFloat((item.gsm / 1000).toFixed(3));
                }

                const parts = [];
                if (item.bf) parts.push(item.bf);
                if (item.quality) parts.push(item.quality);
                if (item.gsm) parts.push(`${item.gsm} GSM`);
                if (item.manufecturer) parts.push(item.manufecturer);
                if (item.finish) parts.push(item.finish);
                if (item.sizeW) parts.push(item.sizeW.toString());
                if (item.caliper) parts.push(item.caliper.toString());

                item.itemName = parts.join(' ');
            }
        }

        // ROLL Calculations - Excel-like live updates
        if (itemGroupName === 'ROLL') {
            const changedField = params.colDef.field;

            // Recalculate TotalGSM (GSM + ReleaseGSM + AdhesiveGSM)
            if (['gsm', 'releaseGSM', 'adhesiveGSM'].includes(changedField)) {
                item.totalGSM = (item.gsm || 0) + (item.releaseGSM || 0) + (item.adhesiveGSM || 0);
            }

            // Recalculate ItemName (Quality, GSM GSM, ReleaseGSM GSM, AdhesiveGSM GSM, Manufacturer, SizeW MM)
            if (['quality', 'gsm', 'releaseGSM', 'adhesiveGSM', 'manufecturer', 'sizeW'].includes(changedField)) {
                // Ensure TotalGSM is updated first if any GSM field changed
                if (['gsm', 'releaseGSM', 'adhesiveGSM'].includes(changedField)) {
                    item.totalGSM = (item.gsm || 0) + (item.releaseGSM || 0) + (item.adhesiveGSM || 0);
                }

                const parts = [];
                if (item.quality) parts.push(item.quality);
                if (item.gsm) parts.push(`${item.gsm} GSM`);
                if (item.releaseGSM) parts.push(`${item.releaseGSM} GSM`);
                if (item.adhesiveGSM) parts.push(`${item.adhesiveGSM} GSM`);
                if (item.manufecturer) parts.push(item.manufecturer);
                if (item.sizeW) parts.push(`${item.sizeW} MM`);

                item.itemName = parts.join(', ');
            }
        }

        // Update data using stable index
        updatedData[rowIndex] = item;
        setItemData(updatedData);
    }, [itemData, itemGroupName]);

    const validationMap = useMemo(() => {
        const map = new Map<number, ItemRowValidation>();
        validationResult?.rows.forEach(row => map.set(row.rowIndex, row));
        return map;
    }, [validationResult]);

    const rowClassRules: RowClassRules = {
        'bg-red-50 dark:bg-red-900/20': (params) => {
            const rowIndex = itemData.indexOf(params.data);
            if (rowIndex === -1) return false;
            const validation = validationMap.get(rowIndex);
            return validation?.rowStatus === ValidationStatus.Duplicate;
        }
    };

    const isExternalFilterPresent = useCallback(() => {
        return filterType !== 'all';
    }, [filterType]);

    const doesExternalFilterPass = useCallback((node: IRowNode) => {
        const rowIndex = itemData.indexOf(node.data);
        if (rowIndex === -1) return false;

        const validation = validationMap.get(rowIndex);
        if (!validation) return filterType === 'valid';

        switch (filterType) {
            case 'valid': return validation.rowStatus === ValidationStatus.Valid;
            case 'duplicate': return validation.rowStatus === ValidationStatus.Duplicate;
            // For these categories, check cellValidations so a duplicate row with missing/mismatch/invalid still shows
            case 'missing': return validation.cellValidations?.some((cv: any) => cv.status === ValidationStatus.MissingData) ?? false;
            case 'mismatch': return validation.cellValidations?.some((cv: any) => cv.status === ValidationStatus.Mismatch) ?? false;
            case 'invalid': return validation.cellValidations?.some((cv: any) => cv.status === ValidationStatus.InvalidContent) ?? false;
            default: return true;
        }
    }, [filterType, validationMap, itemData]);

    useEffect(() => {
        gridApi?.onFilterChanged();
    }, [filterType, gridApi]);

    // Helper: find matching CellValidation for a column
    const findCellValidation = useCallback((rowValidation: ItemRowValidation | undefined, colField: string | undefined, colHeader: string | undefined) => {
        if (!rowValidation?.cellValidations || rowValidation.cellValidations.length === 0) return null;

        // Try match by headerName (exact)
        let cellVal = rowValidation.cellValidations.find((cv: any) => cv.columnName === colHeader);

        // Try match by field name (case-insensitive, handles camelCase vs PascalCase)
        if (!cellVal && colField) {
            cellVal = rowValidation.cellValidations.find((cv: any) =>
                cv.columnName?.toLowerCase() === colField.toLowerCase()
            );
        }

        // Try match by headerName (case-insensitive)
        if (!cellVal && colHeader) {
            cellVal = rowValidation.cellValidations.find((cv: any) =>
                cv.columnName?.toLowerCase() === colHeader.toLowerCase()
            );
        }

        return cellVal || null;
    }, []);

    // Add cellStyle + tooltipValueGetter to all columns for validation highlighting
    const columnsWithStyle = useMemo(() => {
        return columnDefs.map(col => {
            if (!col.field) return col;

            return {
                ...col,
                tooltipValueGetter: (params: any) => {
                    const rowIndex = itemData.indexOf(params.data);
                    if (rowIndex === -1) return null;
                    const rowValidation = validationMap.get(rowIndex);
                    if (!rowValidation) return null;

                    const cellVal = findCellValidation(rowValidation, params.colDef.field, params.colDef.headerName);
                    if (cellVal) return cellVal.validationMessage;

                    // Row-level tooltip for duplicates
                    if (rowValidation.rowStatus === ValidationStatus.Duplicate) {
                        return rowValidation.errorMessage || 'Duplicate row detected';
                    }
                    return null;
                },
                cellStyle: (params: any): Record<string, string> | null => {
                    const rowIndex = itemData.indexOf(params.data);
                    if (rowIndex === -1) return null;

                    const colors = {
                        duplicate: isDark ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2',
                        missing: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe',
                        mismatch: isDark ? 'rgba(202, 138, 4, 0.2)' : '#fef9c3',
                        invalid: isDark ? 'rgba(147, 51, 234, 0.2)' : '#f3e8ff'
                    };

                    const rowValidation = validationMap.get(rowIndex);

                    // Row style for duplicate
                    if (rowValidation?.rowStatus === ValidationStatus.Duplicate) {
                        return { backgroundColor: colors.duplicate };
                    }

                    // Cell specific style - match by headerName AND field
                    const cellVal = findCellValidation(rowValidation, params.colDef.field, params.colDef.headerName);
                    if (cellVal) {
                        const status = cellVal.status;
                        if (status === ValidationStatus.MissingData) {
                            return { backgroundColor: colors.missing };
                        }
                        if (status === ValidationStatus.Mismatch) {
                            return { backgroundColor: colors.mismatch };
                        }
                        if (status === ValidationStatus.InvalidContent) {
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
        });
    }, [columnDefs, validationMap, isDark, itemData, findCellValidation]);

    return (
        <div className="space-y-4">

            {/* ✅ Success Popup Modal */}
            {successInfo && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {/* Green header bar */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 w-full" />
                        <div className="p-8 text-center">
                            {/* Animated check icon */}
                            <div className="mx-auto mb-5 w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center ring-8 ring-green-50 dark:ring-green-900/10">
                                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Import Successful!</h2>

                            <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-1">
                                Successfully imported
                            </p>
                            <p className="text-4xl font-extrabold text-green-600 dark:text-green-400 mb-1">
                                {successInfo.rowCount}
                            </p>
                            <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-6">
                                {successInfo.rowCount === 1 ? 'row' : 'rows'} into <span className="font-semibold text-gray-800 dark:text-white">{successInfo.groupName} Item Group</span>
                            </p>

                            <button
                                onClick={() => {
                                    setSuccessInfo(null);
                                    setItemData([]);
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
                        setItemData([]);
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

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Item Master - {itemGroupName}
                </h2>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={handleLoadData}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                    <Database className="w-5 h-5" />
                    Load Data
                </button>

                <button
                    onClick={() => handleClearAllDataTrigger('clearOnly')}
                    disabled={isLoading || selectedRows.size > 0}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                    <ShieldAlert className="w-5 h-5" />
                    Clear All Data
                </button>

                {mode === 'loaded' ? (
                    <button
                        onClick={handleRemoveSelectedRows}
                        disabled={isLoading || selectedRows.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#D2691E] hover:bg-[#A55217] text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        <Trash2 className="w-5 h-5" />
                        Soft Delete ({selectedRows.size})
                    </button>
                ) : (mode === 'preview' || mode === 'validated') && (
                    <button
                        onClick={handleRemoveSelectedRows}
                        disabled={isLoading || selectedRows.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#D2691E] hover:bg-[#A55217] text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        <Trash2 className="w-5 h-5" />
                        Delete Excel Row ({selectedRows.size})
                    </button>
                )}

                <button
                    onClick={() => handleClearAllDataTrigger('freshUpload')}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                    <FilePlus2 className="w-5 h-5" />
                    Fresh Upload
                </button>

                <button
                    onClick={handleFileSelectTrigger}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                    <Upload className="w-5 h-5" />
                    Existing Upload
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                />

                {(mode === 'loaded' || mode === 'preview' || mode === 'validated') && (
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        <Download className="w-5 h-5" />
                        Export
                    </button>
                )}

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
                        ℹ️ Edit cells directly in the grid below, or click on validation summary to filter rows.
                        {validationResult.summary.duplicateCount > 0 &&
                            <span className="ml-2 text-red-600 dark:text-red-400 font-bold">
                                ⚠️ {validationResult.summary.duplicateCount} duplicate(s) found! Remove or edit them.
                            </span>
                        }
                        {validationResult.summary.missingDataCount > 0 &&
                            <span className="ml-2 text-blue-600 dark:text-blue-400 font-bold">
                                ⚠️ {validationResult.summary.missingDataCount} row(s) have missing data! Fill in required fields.
                            </span>
                        }
                        {validationResult.summary.mismatchCount > 0 &&
                            <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-bold">
                                ⚠️ {validationResult.summary.mismatchCount} row(s) have mismatched data! Check HSNGroup and Units.
                            </span>
                        }
                        {validationResult.summary.invalidContentCount > 0 &&
                            <span className="ml-2 text-purple-600 dark:text-purple-400 font-bold">
                                ⚠️ {validationResult.summary.invalidContentCount} row(s) have invalid content! Hover over purple cells for details.
                            </span>
                        }
                    </p>

                    {/* Detailed Invalid Content Errors */}
                    {filterType === 'invalid' && validationResult.summary.invalidContentCount > 0 && (
                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg max-h-48 overflow-y-auto">
                            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">Invalid Content Details:</h4>
                            <div className="space-y-1">
                                {validationResult.rows
                                    .filter((row: ItemRowValidation) => row.rowStatus === ValidationStatus.InvalidContent)
                                    .flatMap((row: ItemRowValidation) =>
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
                                    .filter((row: ItemRowValidation) => row.rowStatus === ValidationStatus.InvalidContent)
                                    .reduce((count: number, row: ItemRowValidation) =>
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

            {/* AG Grid */}
            {(itemData.length > 0 || mode === 'loaded') && (
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
                        rowData={itemData}
                        columnDefs={columnsWithStyle}
                        defaultColDef={defaultColDef}
                        onGridReady={onGridReady}
                        getRowId={(params) => params.data.itemID?.toString() || params.data.tempId}
                        rowSelection="multiple"
                        onSelectionChanged={onSelectionChanged}
                        onCellValueChanged={onCellValueChanged}
                        rowClassRules={rowClassRules}
                        isExternalFilterPresent={isExternalFilterPresent}
                        doesExternalFilterPass={doesExternalFilterPass}
                        pagination={true}
                        paginationPageSize={20}
                        paginationPageSizeSelector={[20, 50, 100]}
                        tooltipShowDelay={300}
                        tooltipInteraction={true}
                        overlayNoRowsTemplate='<span class="text-gray-500 dark:text-gray-400 text-lg">No records found</span>'
                    />
                </div>
            )}

            {/* Clear Data Confirmation Popups */}
            {clearFlowStep === 1 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border-4 border-red-500">
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">⚠️ WARNING - Data Deletion (1/3)</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            Are you sure you want to clear all the <strong>{itemGroupName}</strong> data?
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
                            <button onClick={handleClearCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">
                                Cancel
                            </button>
                            <button onClick={() => handleClearConfirm(1)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                                Yes, Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {clearFlowStep === 2 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border-4 border-orange-500">
                        <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">⚠️ CONFIRMATION (2/3)</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            Discussed with the client that the data needs to be cleared?
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
                            <button onClick={handleClearCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">
                                No, Cancel
                            </button>
                            <button onClick={() => handleClearConfirm(2)} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium">
                                Yes, Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {clearFlowStep === 3 && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border-4 border-red-700">
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-500 mb-4">🔥 FINAL CONFIRMATION (3/3)</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            Have you received an email from your client asking to clear the data?
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
                            <button onClick={handleClearCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg">
                                No, Cancel
                            </button>
                            <button onClick={() => handleClearConfirm(3)} className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium">
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password <span className="text-gray-400 text-xs">(Optional)</span></label>
                                <input
                                    type="password"
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    value={clearCredentials.password}
                                    onChange={e => setClearCredentials({ ...clearCredentials, password: e.target.value })}
                                    placeholder="Leave blank if no password is set"
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

export default ItemMasterEnhanced;
