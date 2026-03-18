import axios from 'axios';

const API_BASE_URL = 'http://localhost:5050/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    const companyToken = localStorage.getItem('companyToken');
    const activeToken = token || companyToken;

    if (activeToken) {
        config.headers.Authorization = `Bearer ${activeToken}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear all auth data from localStorage
            localStorage.removeItem('authToken');
            localStorage.removeItem('companyToken');
            localStorage.removeItem('bulkimport_auth');

            // Dispatch custom event for AuthContext to listen
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));

            console.warn('Unauthorized access. Session expired - redirecting to login.');
        }
        return Promise.reject(error);
    }
);

export interface ModuleDto {
    moduleId: number;
    moduleName: string;
    moduleHeadName?: string;
    moduleDisplayName?: string;
    description?: string;
    // Display Fields
    moduleHeadDisplayName?: string;
    moduleHeadDisplayOrder?: number;
    moduleDisplayOrder?: number;
    setGroupIndex?: number;
    // Print Fields
    printDocumentWebPage?: string;
    printDocumentName?: string;
    printDocumentWebPage1?: string;
    printDocumentName1?: string;
    // System Fields
    companyID?: number;
    userID?: number;
    fYear?: string;
}

export interface IndusModuleInfoDto {
    moduleName: string;
    moduleDisplayName?: string;
    moduleHeadName?: string;
    moduleHeadDisplayName?: string;
    setGroupIndex?: number;
    suggestedHeadDisplayOrder?: number;
}

export interface ModuleSystemDefaultsDto {
    companyID: number;
    userID: number;
    fYear: string;
    suggestedHeadDisplayOrder: number;
    suggestedDisplayOrder: number;
}

export const getAllModules = async (): Promise<ModuleDto[]> => {
    const response = await api.get('/module/GetModules?headName=ALL');
    return response.data;
};

export const createModule = async (module: ModuleDto): Promise<number> => {
    const response = await api.post('/module/Create', module);
    return response.data.moduleId;
};

export const updateModule = async (module: ModuleDto): Promise<void> => {
    await api.put('/module/Update', module);
};

export const deleteModule = async (moduleId: number): Promise<void> => {
    await api.delete(`/module/Delete/${moduleId}`);
};

export const getModuleHeads = async (): Promise<string[]> => {
    const response = await api.get('/module/GetHeads');
    return response.data;
};

export const getIndusModuleNames = async (): Promise<string[]> => {
    const response = await api.get('/module/IndusModuleNames');
    return response.data;
};

export const getIndusModuleInfo = async (moduleName: string): Promise<IndusModuleInfoDto> => {
    const response = await api.get(`/module/IndusModuleInfo?moduleName=${encodeURIComponent(moduleName)}`);
    return response.data;
};

export const getModuleSystemDefaults = async (): Promise<ModuleSystemDefaultsDto> => {
    const response = await api.get('/module/SystemDefaults');
    return response.data;
};

export const getNextDisplayOrder = async (setGroupIndex: number): Promise<number> => {
    const response = await api.get(`/module/NextDisplayOrder?setGroupIndex=${setGroupIndex}`);
    return response.data.nextOrder;
};

export const checkModuleExists = async (moduleName: string): Promise<boolean> => {
    const response = await api.get(`/module/CheckModuleExists?moduleName=${encodeURIComponent(moduleName)}`);
    return response.data.exists;
};

export const checkDisplayOrderExists = async (order: number, setGroupIndex: number): Promise<boolean> => {
    const response = await api.get(`/module/CheckDisplayOrderExists?order=${order}&setGroupIndex=${setGroupIndex}`);
    return response.data.exists;
};

export interface ExcelPreviewDto {
    headers: string[];
    rows: any[][];
    totalRows: number;
    totalColumns: number;
}

export interface ImportResultDto {
    success: boolean;
    totalRows: number;
    importedRows: number;
    duplicateRows: number;
    errorRows: number;
    errorMessages: string[];
    message: string;
}

export const getModules = async (headName: string = 'Masters'): Promise<ModuleDto[]> => {
    const response = await api.get(`/module/GetModules?headName=${headName}`);
    return response.data;
};

export const previewExcel = async (file: File): Promise<ExcelPreviewDto> => {
    console.log('[API] previewExcel called with file:', file.name, file.type, file.size);
    const formData = new FormData();
    formData.append('file', file);

    console.log('[API] Sending POST to /excel/Preview');
    console.log('[API] FormData entries:', Array.from(formData.entries()));

    const response = await api.post('/excel/Preview', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    console.log('[API] Response received:', response.status, response.statusText);
    console.log('[API] Response data:', response.data);

    return response.data;
};

export const importExcel = async (file: File, tableName: string, subModuleId?: number): Promise<ImportResultDto> => {
    const formData = new FormData();
    formData.append('file', file);

    let url = `/excel/Import?tableName=${tableName}`;
    if (subModuleId !== undefined && subModuleId > 0) {
        url += `&subModuleId=${subModuleId}`;
    }

    const response = await api.post(url, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export interface LedgerGroupDto {
    ledgerGroupID: number;
    ledgerGroupName: string;
    ledgerGroupNameDisplay: string;
    ledgerGroupNameID?: number;
}

export interface MasterColumnDto {
    fieldName: string;
    dataType: string;
    isRequired: boolean;
    sequenceNo: number;
}

export const getLedgerGroups = async (): Promise<LedgerGroupDto[]> => {
    const response = await api.get('/excel/LedgerGroups');
    return response.data;
};

export const getMasterColumns = async (ledgerGroupId: number): Promise<MasterColumnDto[]> => {
    const response = await api.get(`/excel/MasterColumns/${ledgerGroupId}`);
    return response.data;
};

export const importLedger = async (file: File, ledgerGroupId: number): Promise<ImportResultDto> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/excel/ImportLedger?ledgerGroupId=${ledgerGroupId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// ==========================================
// LEDGER MASTER ENHANCED API
// ==========================================

export interface LedgerMasterDto {
    ledgerID?: number;
    ledgerGroupID: number;
    ledgerName?: string;
    mailingName?: string;
    address1?: string;
    address2?: string;
    address3?: string;
    country?: string;
    state?: string;
    city?: string;
    pincode?: string;
    telephoneNo?: string;
    email?: string;
    mobileNo?: string;
    website?: string;
    panNo?: string;
    gstNo?: string;
    salesRepresentative?: string;
    supplyTypeCode?: string;
    gstApplicable?: boolean;
    deliveredQtyTolerance?: number;
    refCode?: string;
    gstRegistrationType?: string;
    creditDays?: string;  // Backend database column is nvarchar(64)
    legalName?: string;
    mailingAddress?: string;
    isDeletedTransaction?: boolean;
    currencyCode?: string;
    departmentName?: string;
    departmentID?: number;
    designation?: string;
    dateOfBirth?: string;
    clientName?: string;
    refClientID?: number;
}

export enum ValidationStatus {
    Valid = 0,
    Duplicate = 1,
    MissingData = 2,
    Mismatch = 3,
    InvalidContent = 4
}

export interface CellValidation {
    columnName: string;
    validationMessage: string;
    status: ValidationStatus;
}

export interface LedgerRowValidation {
    rowIndex: number;
    data: LedgerMasterDto;
    cellValidations: CellValidation[];
    rowStatus: ValidationStatus;
    errorMessage?: string;
}

export interface ValidationSummary {
    duplicateCount: number;
    missingDataCount: number;
    mismatchCount: number;
    invalidContentCount: number;
    totalRows: number;
    validRows: number;
}

export interface LedgerValidationResultDto {
    rows: LedgerRowValidation[];
    summary: ValidationSummary;
    isValid: boolean;
}

export interface CountryStateDto {
    country: string;
    state: string;
}

export interface SalesRepresentativeDto {
    employeeID?: number;
    employeeName?: string;
    // Handle potential PascalCase serialization
    EmployeeID?: number;
    EmployeeName?: string;
}

export interface DepartmentDto {
    departmentID?: number;
    departmentName?: string;
    DepartmentID?: number;
    DepartmentName?: string;
}

export interface ClientDto {
    ledgerID?: number;
    ledgerName?: string;
    LedgerID?: number;
    LedgerName?: string;
}

export const getLedgersByGroup = async (ledgerGroupId: number): Promise<LedgerMasterDto[]> => {
    const response = await api.get(`/ledger/bygroup/${ledgerGroupId}`);
    return response.data;
};

export const getCountryStates = async (): Promise<CountryStateDto[]> => {
    const response = await api.get('/ledger/country-states');
    return response.data;
};

export const getSalesRepresentatives = async (): Promise<SalesRepresentativeDto[]> => {
    const response = await api.get('/ledger/sales-representatives');
    return response.data;
};

export const getClients = async (): Promise<ClientDto[]> => {
    const response = await api.get('/ledger/clients');
    return response.data;
};

export const getDepartments = async (): Promise<DepartmentDto[]> => {
    const response = await api.get('/ledger/departments');
    return response.data;
};

export const softDeleteLedger = async (ledgerId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/ledger/soft-delete/${ledgerId}`);
    return response.data;
};

export const validateLedgers = async (ledgers: LedgerMasterDto[], ledgerGroupId: number): Promise<LedgerValidationResultDto> => {
    const response = await api.post('/ledger/validate', {
        ledgers,
        ledgerGroupId
    });
    return response.data;
};

export const importLedgers = async (ledgers: LedgerMasterDto[], ledgerGroupId: number): Promise<ImportResultDto> => {
    const response = await api.post('/ledger/import', {
        ledgers,
        ledgerGroupId
    });
    return response.data;
};

export const clearAllLedgerData = async (ledgerGroupId: number, username: string, password: string, reason: string): Promise<any> => {
    const response = await api.post('/ledger/clear-all-data', {
        ledgerGroupId,
        username,
        password,
        reason
    });
    return response.data;
};

export const parseExcelToLedgers = async (file: File): Promise<LedgerMasterDto[]> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/excel/ParseLedgerExcel', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
}

// ==========================================
// ITEM MASTER API
// ==========================================

export interface ItemGroupDto {
    itemGroupID: number;
    itemGroupName: string;
    itemGroupPrefix: string;
    itemNameFormula?: string;
    itemDescriptionFormula?: string;
}

export const getItemGroups = async (): Promise<ItemGroupDto[]> => {
    const response = await api.get('/excel/ItemGroups');
    return response.data;
};

export const getItemMasterColumns = async (itemGroupId: number): Promise<MasterColumnDto[]> => {
    const response = await api.get(`/excel/ItemMasterColumns/${itemGroupId}`);
    return response.data;
};

export const importItemMaster = async (file: File, itemGroupId: number): Promise<ImportResultDto> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/excel/ImportItem?itemGroupId=${itemGroupId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export interface CompanyDto {
    companyId: number;
    // 🏢 1. Company Basic Information
    companyName: string;
    tallyCompanyName?: string;
    productionUnitName?: string;
    productionUnitAddress?: string;
    address: string;
    address1?: string;
    address2?: string;
    address3?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    contactNO?: string;
    mobileNO?: string;
    phone: string;
    email: string;
    website: string;
    concerningPerson?: string;
    companyStartDate?: string;
    isActive: boolean;
    lastInvoiceDate?: string;

    // 🧾 2. Statutory & Tax Information
    gstin: string;
    pan?: string;
    cinNo?: string;
    iecNo?: string;
    importExportCode?: string;
    stateTinNo?: string;
    msmeno?: string;
    isSalesTax: boolean;
    isGstApplicable: boolean;
    isVatApplicable: boolean;
    isEinvoiceApplicable: boolean;
    defaultTaxLedgerTypeName?: string;
    taxApplicableBranchWise: boolean;

    // 🏦 3. Bank & Payment Information
    bankDetails?: string;
    cashAgainstDocumentsBankDetails?: string;

    // 🔐 4. Approval & Workflow Settings
    isRequisitionApproval: boolean;
    isPOApprovalRequired: boolean;
    isInvoiceApprovalRequired: boolean;
    isGRNApprovalRequired: boolean;
    isSalesOrderApprovalRequired: boolean;
    isJobReleaseFeatureRequired: boolean;
    isInternalApprovalRequired: boolean;
    byPassCostApproval: boolean;
    byPassInventoryForProduction: boolean;
    jobReleasedChecklistFeature: boolean;
    jobScheduleReleaseRequired: boolean;

    // ⚙️ 5. Domain / Module Enable Settings
    flexoDomainEnable?: boolean;
    offsetDomainEnable?: boolean;
    corrugationDomainEnable?: boolean;
    rotoDomainEnable?: boolean;
    bookPlanningFeatureEnable?: boolean;
    rigidBoxPlanningFeatureEnable?: boolean;
    shipperPlanningFeatureEnable?: boolean;
    isProductCatalogCreated?: boolean;
    isSupplierItemAllocationRequired?: boolean;

    // 🧮 6. Estimation & Calculation Settings
    costEstimationMethodType?: string;
    estimationRoundOffDecimalPlace?: number;
    purchaseRoundOffDecimalPlace?: number;
    invoiceRoundOffDecimalPlace?: number;
    estimationPerUnitCostDecimalPlace?: number;
    roundOffImpressionValue?: number;
    autoRoundOffNotApplicable?: boolean;
    wtCalculateOnEstimation?: string;
    showPlanUptoWastagePerc: number;
    isWastageAddInPrintingRate?: boolean;
    is_Book_Half_Form_Wastage?: boolean;

    // 🖨️ 7. Printing / RDLC Settings
    invoicePrintRDLC?: string;
    packingSlipPrintRDLC?: string;
    challanPrintRDLC?: string;
    pwoPrintRDLC?: string;
    salesReturnPrintRDLC?: string;
    coaPrintRDLC?: string;
    outSourceChallanRDLC?: string;
    pwoFlexoPrintRDLC?: string;
    pwoGangPrintRDLC?: string;
    qcAndPackingSlip?: string;
    itemSalesOrderBookingPrint?: string;
    unitwisePrintoutSetting?: boolean;
    fastInvoicePrint?: boolean;
    fastEInvoicePrint?: boolean;

    // 🏭 8. Production Configuration
    manualProductionEntryTime?: boolean;
    productionEntryBackDay?: string;
    productionUnitID?: number;
    generateVoucherNoByProductionUnit?: boolean;
    materialConsumptionDetailsFlage?: boolean;
    bufferGSMMinus?: number;
    bufferGSMPlus?: number;
    bufferSizeMinus?: number;
    bufferSizePlus?: number;

    // 🌐 9. API & Integration Settings
    apiBaseURL?: string;
    apiAuthenticationURL?: string;
    apiClientID?: string;
    apiClientSecretID?: string;
    apiIntegrationRequired?: boolean;
    indusAPIAuthToken?: string;
    clientAPIAuthToken?: string;
    indusAPIBaseUrl?: string;
    clientAPIBaseUrl?: string;
    indusTokenAuthAPI?: string;
    clientTokenAuthAPI?: string;
    indusMailAPIBaseUrl?: string;
    apiBasicAuthUserName?: string;
    apiBasicAuthPassword?: string;
    integrationType?: string;
    logoutPage?: string;
    desktopConnString?: string;
    applicationConfiguration?: string;
    companyStaticIP?: string;

    // 🕒 11. Time & System Settings
    timeZone?: string;
    duration?: string;
    end_time?: string;
    lastShownTime?: string;
    messageShow?: string;
    time?: string;

    // 🔐 12. Security & OTP Settings
    otpVerificationFeatureEnabled?: boolean;
    otpVerificationExcludedDevices?: string;
    multipleFYearNotRequired?: boolean;

    // 🏷️ 13. Prefix & Reference Settings
    refCompanyCode?: string;
    refSalesOfficeCode?: string;
    isotpRequired?: boolean;

    // 💱 14. Currency Settings
    currencyHeadName?: string;
    currencyChildName?: string;
    currencyCode?: string;
    currencySymboliconRef?: string;

    // 📝 15. Miscellaneous / Other Settings
    fax?: string;
    backupPath?: string;
    description?: string;
    isInvoicePrintProductWise?: boolean;
    isInvoiceBlockFeatureRequired?: boolean;
    purchaseTolerance?: number;
    isDeletedTransaction: boolean;

    // 🏭 Production extras
    isProductionSlipGenerated?: boolean;
    productionProcessWiseToleranceRequired?: boolean;

    // 💬 Communication & CRM
    isCrmActivated?: boolean;
    isWhatsAppActivated?: boolean;
    isEmailActivated?: boolean;
    isNotificationEnabled?: boolean;

    // 📢 Client Communication
    isJobScheduled_SendToClient?: boolean;
    isOrderReady_QcAndPacking_SendToClient?: boolean;
    isInvoice_Ready_SendToClient?: boolean;
    isSales_Order_Approve_ByClient?: boolean;

    // 🔄 Workflow Automation
    isAutoRequisitionCreation?: number;
    autoIndentFeatureRequired?: boolean;
    isPicklistFeatureRequired?: boolean;

    // 📄 Document extras
    isQuotationVisibleAfterSO?: boolean;

    // 🏷️ Prefix Settings
    productCatlogPrefix?: string;
    jobCardPrefix?: string;
}

export const getCompany = async (): Promise<CompanyDto> => {
    const response = await api.get('/Company');
    return response.data;
};

export const updateCompany = async (company: CompanyDto): Promise<void> => {
    await api.put('/Company', company);
};

export default api;

// ---------------------------------------------
// HSN Master Types & APIs
// ---------------------------------------------

export interface HSNMasterDto {
    productHSNID?: number;
    productHSNName?: string; // Group Name
    displayName?: string;
    hsnCode?: string;
    productCategory?: string; // ProductType
    gstTaxPercentage?: number;
    cgstTaxPercentage?: number;
    sgstTaxPercentage?: number;
    igstTaxPercentage?: number;
    itemGroupName?: string;
    itemGroupID?: number;
    companyID?: number;
    isDeletedTransaction?: boolean;
}

export interface HSNRowValidation {
    rowIndex: number;
    data: HSNMasterDto;
    cellValidations: CellValidation[];
    rowStatus: ValidationStatus;
    errorMessage?: string;
}

export interface HSNValidationResultDto {
    rows: HSNRowValidation[];
    summary: ValidationSummary;
    isValid: boolean;
}

export const getHSNs = async (companyId: number = 2): Promise<HSNMasterDto[]> => {
    const response = await api.get(`/hsn/list?companyId=${companyId}`);
    return response.data;
};

export const getItemGroupNames = async (companyId: number = 2): Promise<string[]> => {
    const response = await api.get(`/hsn/itemgroups?companyId=${companyId}`);
    return response.data;
};

export const importHSNs = async (hsns: HSNMasterDto[]): Promise<ImportResultDto> => {
    const response = await api.post('/hsn/import', hsns);
    return response.data;
};

export const softDeleteHSN = async (id: number): Promise<ImportResultDto> => {
    const response = await api.delete(`/hsn/delete/${id}`);
    return response.data;
};

export const clearHSNData = async (companyId: number, username?: string, password?: string, reason?: string) => {
    try {
        const response = await api.post('/hsn/clear', {
            companyId,
            username,
            password,
            reason
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const validateHSNs = async (hsns: HSNMasterDto[]): Promise<HSNValidationResultDto> => {
    const response = await api.post('/hsn/validate', hsns);
    return response.data;
};

// ==========================================
// SPARE PART MASTER API
// ==========================================

export interface SparePartMasterDto {
    sparePartID?: number;
    sparePartName?: string;
    sparePartGroup?: string;
    hsnGroup?: string;
    unit?: string;
    rate?: number;
    sparePartType?: string;
    minimumStockQty?: number;
    purchaseOrderQuantity?: number;
    stockRefCode?: string;
    supplierReference?: string;
    narration?: string;
    isDeletedTransaction?: boolean;
}

export interface SparePartRowValidation {
    rowIndex: number;
    data: SparePartMasterDto;
    cellValidations: CellValidation[];
    rowStatus: ValidationStatus;
    errorMessage?: string;
}

export interface SparePartValidationResultDto {
    rows: SparePartRowValidation[];
    summary: ValidationSummary;
    isValid: boolean;
}

export interface HSNGroupDto {
    productHSNID: number;
    displayName: string;
    hsnCode?: string;
}

export interface UnitDto {
    unitID: number;
    unitSymbol: string;
}

export const getAllSpareParts = async (): Promise<SparePartMasterDto[]> => {
    const response = await api.get('/sparepart/all');
    return response.data;
};

export const getHSNGroups = async (): Promise<HSNGroupDto[]> => {
    const response = await api.get('/sparepart/hsn-groups');
    return response.data;
};

export const getUnits = async (): Promise<UnitDto[]> => {
    const response = await api.get('/sparepart/units');
    return response.data;
};

export const softDeleteSparePart = async (sparePartId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/sparepart/soft-delete/${sparePartId}`);
    return response.data;
};

export const validateSpareParts = async (spareParts: SparePartMasterDto[]): Promise<SparePartValidationResultDto> => {
    const response = await api.post('/sparepart/validate', {
        spareParts
    });
    return response.data;
};

export const importSpareParts = async (spareParts: SparePartMasterDto[]): Promise<ImportResultDto> => {
    const response = await api.post('/sparepart/import', {
        spareParts
    });
    return response.data;
};

export const clearAllSparePartData = async (username: string, password: string, reason: string): Promise<any> => {
    const response = await api.post('/sparepart/clear-all-data', {
        username,
        password,
        reason
    });
    return response.data;
};

// ==================== ITEM MASTER ====================

export interface ItemMasterDto {
    itemID?: number;
    itemName?: string;
    itemCode?: string;
    itemGroupID?: number;
    itemGroupName?: string;
    productHSNID?: number;
    hsnGroup?: string;
    stockUnit?: string;
    purchaseUnit?: string;
    estimationUnit?: string;
    unitPerPacking?: number;
    wtPerPacking?: number;
    conversionFactor?: number;
    itemSubGroupID?: number;
    stockType?: string;
    stockCategory?: string;
    sizeW?: number;
    sizeL?: number;
    itemSize?: string;
    purchaseRate?: number;
    stockRefCode?: string;
    itemDescription?: string;
    isDeletedTransaction?: boolean;
    dynamicFields?: Record<string, any>;
    tempId?: string;

    // Paper-specific fields
    quality?: string;
    gsm?: number;
    manufecturer?: string;
    finish?: string;
    manufecturerItemCode?: string;
    caliper?: number;
    shelfLife?: number;
    estimationRate?: number;
    minimumStockQty?: number;
    isStandardItem?: boolean;
    isRegularItem?: boolean;
    packingType?: string;
    certificationType?: string;
    paperGroup?: string;
    productHSNName?: string;
    hsnCode?: string;

    // REEL-specific field
    bf?: string;

    // INK & ADDITIVES-specific fields
    itemSubGroupName?: string;
    itemType?: string;
    inkColour?: string;
    pantoneCode?: string;
    purchaseOrderQuantity?: number;

    // LAMINATION FILM-specific fields
    thickness?: number;
    density?: number;

    // ROLL-specific fields
    releaseGSM?: number;
    adhesiveGSM?: number;
    totalGSM?: number;
}

export interface ItemSubGroupDto {
    itemSubGroupID: number;
    itemSubGroupName: string;
}

export interface ItemValidationResultDto {
    isValid: boolean;
    rows: ItemRowValidation[];
    summary: ValidationSummary;
}

export interface ItemRowValidation {
    rowIndex: number;
    data: ItemMasterDto;
    cellValidations: CellValidation[];
    rowStatus: ValidationStatus;
    errorMessage?: string;
}

export const getAllItems = async (itemGroupId: number): Promise<ItemMasterDto[]> => {
    const response = await api.get(`/item?itemGroupId=${itemGroupId}`);
    return response.data;
};

export const getItemHSNGroups = async (): Promise<HSNGroupDto[]> => {
    const response = await api.get('/item/hsn-groups');
    return response.data;
};

export const getItemUnits = async (): Promise<UnitDto[]> => {
    const response = await api.get('/item/units');
    return response.data;
};

export const getItemSubGroups = async (itemGroupId: number): Promise<ItemSubGroupDto[]> => {
    const response = await api.get(`/item/item-sub-groups?itemGroupId=${itemGroupId}`);
    return response.data;
};

export const softDeleteItem = async (itemId: number): Promise<any> => {
    const response = await api.delete(`/item/${itemId}`);
    return response.data;
};

export const validateItems = async (items: ItemMasterDto[], itemGroupId: number): Promise<ItemValidationResultDto> => {
    const response = await api.post('/item/validate', {
        items,
        itemGroupId
    });
    return response.data.validationResult;
};

export const importItems = async (items: ItemMasterDto[], itemGroupId: number): Promise<ImportResultDto> => {
    const response = await api.post('/item/import', {
        items,
        itemGroupId
    });
    return response.data;
};

export const clearAllItemData = async (username: string, password: string, reason: string, itemGroupId: number): Promise<any> => {
    const response = await api.post('/item/clear-all-data', {
        username,
        password,
        reason,
        itemGroupId
    });
    return response.data;
};

// ==================== TOOL MASTER API ====================

export interface ToolGroupDto {
    toolGroupID: number;
    toolGroupName: string;
    toolGroupNameDisplay?: string;
}

export interface ToolMasterDto {
    toolID?: number;
    toolName?: string;
    toolCode?: string;
    toolGroupID?: number;
    toolGroupName?: string;
    toolType?: string;
    productHSNID?: number;
    productHSNName?: string;
    hsnCode?: string;
    sizeL?: number;
    sizeW?: number;
    sizeH?: number;
    upsAround?: number;
    upsAcross?: number;
    totalUps?: number;
    purchaseUnit?: string;
    purchaseRate?: number;
    manufacturerItemCode?: string;
    purchaseOrderQuantity?: number;
    shelfLife?: number;
    stockUnit?: string;
    minimumStockQty?: number;
    isStandardItem?: boolean;
    isRegularItem?: boolean;
    isDeletedTransaction?: boolean;
}

export interface ToolRowValidation {
    rowIndex: number;
    data: ToolMasterDto;
    cellValidations: CellValidation[];
    rowStatus: ValidationStatus;
    errorMessage?: string;
}

export interface ToolValidationResultDto {
    isValid: boolean;
    rows: ToolRowValidation[];
    summary: ValidationSummary;
}

export const getToolGroups = async (): Promise<ToolGroupDto[]> => {
    const response = await api.get('/tool/groups');
    return response.data;
};

export const getAllTools = async (toolGroupId: number): Promise<ToolMasterDto[]> => {
    const response = await api.get(`/tool?toolGroupId=${toolGroupId}`);
    return response.data;
};

export const getToolHSNGroups = async (): Promise<HSNGroupDto[]> => {
    const response = await api.get('/tool/hsn-groups');
    return response.data;
};

export const getToolUnits = async (): Promise<UnitDto[]> => {
    const response = await api.get('/tool/units');
    return response.data;
};

export const softDeleteTool = async (toolId: number): Promise<any> => {
    const response = await api.delete(`/tool/${toolId}`);
    return response.data;
};

export const validateTools = async (tools: ToolMasterDto[], toolGroupId: number): Promise<ToolValidationResultDto> => {
    const response = await api.post('/tool/validate', {
        tools,
        toolGroupId
    });
    return response.data.validationResult;
};

export const importTools = async (tools: ToolMasterDto[], toolGroupId: number): Promise<ImportResultDto> => {
    const response = await api.post('/tool/import', {
        tools,
        toolGroupId
    });
    return response.data;
};

export const clearAllToolData = async (username: string, password: string, reason: string, toolGroupId: number): Promise<any> => {
    const response = await api.post('/tool/clear-all-data', {
        username,
        password,
        reason,
        toolGroupId
    });
    return response.data;
};

// ==================== ITEM STOCK API ====================

export interface ItemStockRowDto {
    rowIndex?: number;
    itemCode?: string;
    receiptQuantity: number;
    landedRate: number;
    stockUnit?: string;
    batchNo?: string;
    warehouseName?: string;
    binName?: string;
    warehouseID?: number;
}

export interface ItemStockImportResult {
    success: boolean;
    totalRows: number;
    importedRows: number;
    failedRows: number;
    message: string;
    errorMessages: string[];
}

export interface ItemStockEnrichedRow {
    itemCode?: string;
    itemID: number;
    receiptQuantity: number;
    landedRate: number;
    batchNo?: string;
    stockUnit?: string;
    warehouseName?: string;
    binName?: string;
    isValid: boolean;
    error?: string;
}

export interface ItemStockEnrichResult {
    rows: ItemStockEnrichedRow[];
    invalidItemCodes: string[];
}

export interface WarehouseDto {
    warehouseID: number;
    warehouseName: string;
    binName?: string;
}

export const getStockWarehouses = async (): Promise<WarehouseDto[]> => {
    const response = await api.get('/itemstock/warehouses');
    return response.data;
};

export const getStockBins = async (warehouseName: string): Promise<WarehouseDto[]> => {
    const response = await api.get('/itemstock/bins', { params: { warehouseName } });
    return response.data;
};

export const enrichItemStock = async (rows: { itemCode?: string; receiptQuantity: number; landedRate: number; stockUnit?: string; warehouseName?: string; binName?: string }[], itemGroupId: number): Promise<ItemStockEnrichResult> => {
    const response = await api.post('/itemstock/enrich', { rows, itemGroupId });
    return response.data;
};

export const importItemStock = async (rows: ItemStockRowDto[], itemGroupId: number): Promise<ItemStockImportResult> => {
    const response = await api.post('/itemstock/import', { rows, itemGroupId });
    return response.data;
};

export interface ItemStockCellValidation {
    columnName: string;
    status: string;
    validationMessage: string;
}

export interface ItemStockRowValidation {
    rowIndex: number;
    rowStatus: string;
    errorMessage?: string;
    cellValidations: ItemStockCellValidation[];
}

export interface ItemStockValidationSummary {
    totalRows: number;
    validRows: number;
    duplicateCount: number;
    missingDataCount: number;
    mismatchCount: number;
    invalidContentCount: number;
}

export interface ItemStockValidationResult {
    isValid: boolean;
    summary: ItemStockValidationSummary;
    rows: ItemStockRowValidation[];
}

export const validateItemStock = async (rows: ItemStockEnrichedRow[], itemGroupId: number): Promise<ItemStockValidationResult> => {
    const response = await api.post('/itemstock/validate', { rows, itemGroupId });
    return response.data;
};

export const loadStockData = async (itemGroupId: number): Promise<ItemStockEnrichedRow[]> => {
    const response = await api.get('/itemstock/load', { params: { itemGroupId } });
    return response.data;
};

export const resetItemStock = async (itemGroupId: number, username: string, password: string, reason: string): Promise<ItemStockImportResult> => {
    const response = await api.post('/itemstock/reset-item-stock', { itemGroupId, username, password, reason });
    return response.data;
};

export const resetFloorStock = async (itemGroupId: number, username: string, password: string, reason: string): Promise<ItemStockImportResult> => {
    const response = await api.post('/itemstock/reset-floor-stock', { itemGroupId, username, password, reason });
    return response.data;
};

// ==================== AUTH API ====================

export interface CompanyLoginRequest {
    companyUserID: string;
    password: string;
}

export interface CompanyLoginResponse {
    success: boolean;
    message: string;
    companyToken: string;
    companyName: string;
}

export interface UserLoginRequest {
    userName: string;
    password: string;
    fYear: string;
}

export interface UserLoginResponse {
    success: boolean;
    message: string;
    token: string;
    userID: number;
    userName: string;
    companyID: number;
    branchID: number;
    fYear: string;
    isAdmin: boolean;
    companyName: string;
}

export const companyLogin = async (data: CompanyLoginRequest): Promise<CompanyLoginResponse> => {
    const response = await api.post('/auth/company-login', data);
    return response.data;
};

export const userLogin = async (data: UserLoginRequest): Promise<UserLoginResponse> => {
    const response = await api.post('/auth/user-login', data);
    return response.data;
};

export const logout = async (): Promise<void> => {
    try {
        await api.post('/auth/logout');
    } catch {
        // Ignore error if logout fails
    }
};

// ==================== INDUS LOGIN ====================

export interface IndusLoginRequest {
    webUserName: string;
    password: string;
}

export interface IndusLoginResponse {
    success: boolean;
    message: string;
    token: string;
    webUserName: string;
}

export const indusLogin = async (data: IndusLoginRequest): Promise<IndusLoginResponse> => {
    const response = await api.post('/auth/indus-login', data);
    return response.data;
};

// ==================== COMPANY SUBSCRIPTION ====================

export interface CompanySubscriptionDto {
    companyUserID: string;
    password: string;
    conn_String?: string;
    companyName: string;
    apiCompanyUserName?: string;
    apiCompanyPassword?: string;
    applicationName?: string;
    applicationVersion?: string;
    dataBaseLocation?: string;
    lastLoginDateTime?: string;
    isActive?: boolean;
    country?: string;
    state?: string;
    city?: string;
    applicationBaseURL?: string;
    companyCode?: string;
    companyUniqueCode?: string;
    maxCompanyUniqueCode?: number;
    fromDate?: string;
    toDate?: string;
    fYear?: string;
    paymentDueDate?: string;
    subscriptionStatus?: string;
    statusDescription?: string;
    subscriptionStatusMessage?: string;
    loginAllowed?: number;
    gstin?: string;
    latestVersion?: string;
    loginAllowedOldVersion?: number;
    oldVersion?: string;
    email?: string;
    mobile?: string;
    address?: string;
}

export interface CompanySubscriptionSaveRequest extends CompanySubscriptionDto {
    originalCompanyUserID?: string;
}

export interface CompanySubscriptionListResponse {
    success: boolean;
    message: string;
    data: CompanySubscriptionDto[];
}

export interface CompanySubscriptionResponse {
    success: boolean;
    message: string;
    data?: CompanySubscriptionDto;
}

export const getCompanySubscriptions = async (): Promise<CompanySubscriptionListResponse> => {
    const response = await api.get('/companysubscription');
    return response.data;
};

export const getCompanySubscriptionByKey = async (companyUserID: string): Promise<CompanySubscriptionResponse> => {
    const response = await api.get(`/companysubscription/${encodeURIComponent(companyUserID)}`);
    return response.data;
};

export const createCompanySubscription = async (data: CompanySubscriptionDto): Promise<CompanySubscriptionResponse> => {
    const response = await api.post('/companysubscription', data);
    return response.data;
};

export const updateCompanySubscription = async (data: CompanySubscriptionSaveRequest): Promise<CompanySubscriptionResponse> => {
    const response = await api.put('/companysubscription', data);
    return response.data;
};

export const deleteCompanySubscription = async (companyUserID: string): Promise<CompanySubscriptionResponse> => {
    const response = await api.delete(`/companysubscription/${encodeURIComponent(companyUserID)}`);
    return response.data;
};

export interface SetupDatabaseRequest {
    server: string;
    applicationName: string;
    clientName: string;
    databaseName: string;
}

export interface SetupDatabaseResponse {
    success: boolean;
    message: string;
    connectionString: string;
    databaseName: string;
    server: string;
    applicationName: string;
    clientName: string;
}

export interface ServerListResponse {
    success: boolean;
    servers: string[];
}

export interface NextClientCodeResponse {
    success: boolean;
    companyUniqueCode: string;
    maxCompanyUniqueCode: number;
    message: string;
}

export const getNextClientCode = async (): Promise<NextClientCodeResponse> => {
    const response = await api.get('/companysubscription/next-client-code');
    return response.data;
};

export const getServers = async (): Promise<ServerListResponse> => {
    const response = await api.get('/companysubscription/servers');
    return response.data;
};

export const setupDatabase = async (data: SetupDatabaseRequest): Promise<SetupDatabaseResponse> => {
    const response = await api.post('/companysubscription/setup-database', data);
    return response.data;
};

// ─── Step 3: Company Master ───
export interface CompanyMasterRequest {
    connectionString: string;
    companyID: number;
    companyName: string;
    address1?: string;
    address2?: string;
    address3?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    contactNO?: string;
    mobileNO?: string;
    email?: string;
    website?: string;
    stateTinNo?: string;
    cinNo?: string;
    productionUnitAddress?: string;
    address?: string;
    gstin?: string;
    productionUnitName?: string;
    pan?: string;
}

export interface CompanyMasterResponse {
    success: boolean;
    message: string;
    companyID: number;
}

export const saveCompanyMaster = async (data: CompanyMasterRequest): Promise<CompanyMasterResponse> => {
    const response = await api.post('/companysubscription/save-company-master', data);
    return response.data;
};

// ─── Step 4: Branch Master ───
export interface BranchMasterRequest {
    connectionString: string;
    branchID: number;
    branchName: string;
    mailingName?: string;
    address1?: string;
    address2?: string;
    address3?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    pincode?: string;
    mobileNo?: string;
    email?: string;
    stateTinNo?: string;
    gstin?: string;
    companyID?: number;
}

export interface BranchMasterResponse {
    success: boolean;
    message: string;
}

export const saveBranchMaster = async (data: BranchMasterRequest): Promise<BranchMasterResponse> => {
    const response = await api.post('/companysubscription/save-branch-master', data);
    return response.data;
};

// ─── Step 5: Production Unit ───
export interface ProductionUnitRequest {
    connectionString: string;
    productionUnitName: string;
    address?: string;
    city?: string;
    state?: string;
    gstNo?: string;
    pincode?: string;
    country?: string;
    pan?: string;
}

export interface ProductionUnitResponse {
    success: boolean;
    message: string;
}

export const saveProductionUnit = async (data: ProductionUnitRequest): Promise<ProductionUnitResponse> => {
    const response = await api.post('/companysubscription/save-production-unit', data);
    return response.data;
};

// ─── Final Step: Complete Setup ───
export interface CompleteSetupRequest {
    connectionString: string;
    city?: string;
    state?: string;
    country?: string;
    companyUserID: string;
}

export interface CompleteSetupResponse {
    success: boolean;
    message: string;
    companyUserID: string;
    password: string;
}

export const completeSetup = async (data: CompleteSetupRequest): Promise<CompleteSetupResponse> => {
    const response = await api.post('/companysubscription/complete-setup', data);
    return response.data;
};

// ─── Module Settings ───
export interface ModuleSettingsRow {
    moduleHeadName: string;
    moduleDisplayName: string;
    moduleName: string;
    status: boolean;
}

export interface ModuleSettingsResponse {
    success: boolean;
    message: string;
    data: ModuleSettingsRow[];
}

export interface SaveModuleSettingsRequest {
    applicationName: string;
    connectionString: string;
    modules: { moduleName: string; status: boolean }[];
}

export interface SaveModuleSettingsResponse {
    success: boolean;
    message: string;
    inserted: number;
    deleted: number;
}

export const getModuleSettings = async (applicationName: string, connectionString: string): Promise<ModuleSettingsResponse> => {
    const response = await api.post('/companysubscription/get-module-settings', { applicationName, connectionString });
    return response.data;
};

export const saveModuleSettings = async (data: SaveModuleSettingsRequest): Promise<SaveModuleSettingsResponse> => {
    const response = await api.post('/companysubscription/save-module-settings', data);
    return response.data;
};

// ─── Copy Modules ───
export interface ClientDropdownItem {
    companyName: string;
    companyUserID: string;
    applicationName: string;
}

export interface ClientDropdownResponse {
    success: boolean;
    message: string;
    data: ClientDropdownItem[];
}

export interface CopyModulesResponse {
    success: boolean;
    message: string;
    copiedCount: number;
}

export const getClientDropdown = async (): Promise<ClientDropdownResponse> => {
    const response = await api.get('/companysubscription/client-dropdown');
    return response.data;
};

export const copyModules = async (sourceConnectionString: string, targetCompanyUserID: string): Promise<CopyModulesResponse> => {
    const response = await api.post('/companysubscription/copy-modules', { sourceConnectionString, targetCompanyUserID });
    return response.data;
};

// ==========================================
// RECORD COUNT CHECK HELPERS
// Used by "Clear All Data" to decide whether to show "No Data found" popup
// or run the full confirmation flow.
// ==========================================

/** Returns the number of ledger records for a given ledger group. */
export const getLedgerCount = async (ledgerGroupId: number): Promise<number> => {
    try {
        const data = await getLedgersByGroup(ledgerGroupId);
        return Array.isArray(data) ? data.length : 0;
    } catch {
        return 0;
    }
};

/** Returns the number of item records for a given item group. */
export const getItemCount = async (itemGroupId: number): Promise<number> => {
    try {
        const data = await getAllItems(itemGroupId);
        return Array.isArray(data) ? data.length : 0;
    } catch {
        return 0;
    }
};

/** Returns the number of tool records for a given tool group. */
export const getToolCount = async (toolGroupId: number): Promise<number> => {
    try {
        const data = await getAllTools(toolGroupId);
        return Array.isArray(data) ? data.length : 0;
    } catch {
        return 0;
    }
};

/** Returns the number of spare part records in the database. */
export const getSparePartCount = async (): Promise<number> => {
    try {
        const data = await getAllSpareParts();
        return Array.isArray(data) ? data.length : 0;
    } catch {
        return 0;
    }
};

/** Returns the number of HSN records in the database. */
export const getHSNCount = async (companyId: number = 2): Promise<number> => {
    try {
        const data = await getHSNs(companyId);
        return Array.isArray(data) ? data.length : 0;
    } catch {
        return 0;
    }
};

// ==========================================
// MODULE AUTHORITY API
// ==========================================

export interface ModuleAuthorityRowDto {
    moduleHeadName: string;
    moduleDisplayName: string;
    status: boolean;
    existsInLoginDb: boolean;
}

export interface ModuleAuthoritySaveDto {
    moduleHeadName: string;
    moduleDisplayName: string;
    status: boolean;
}

export const getModuleAuthorityData = async (product: string): Promise<ModuleAuthorityRowDto[]> => {
    const response = await api.get(`/moduleauthority/GetData?product=${encodeURIComponent(product)}`);
    return response.data;
};

export const saveModuleAuthority = async (product: string, modules: ModuleAuthoritySaveDto[]): Promise<{ inserted: number; enabled: number; disabled: number; total: number }> => {
    const response = await api.post('/moduleauthority/Save', { product, modules });
    return response.data;
};

// ==================== SPARE PART MASTER STOCK API ====================

export interface SparePartStockRowDto {
    rowIndex?: number;
    sparePartName?: string;
    receiptQuantity: number;
    purchaseRate: number;
    stockUnit?: string;
    batchNo?: string;
    warehouseName?: string;
    binName?: string;
    warehouseID?: number;
}

export interface SparePartStockImportResult {
    success: boolean;
    totalRows: number;
    importedRows: number;
    failedRows: number;
    message: string;
    errorMessages: string[];
}

export interface SparePartStockEnrichedRow {
    sparePartName?: string;
    spareID: number;
    receiptQuantity: number;
    purchaseRate: number;
    batchNo?: string;
    stockUnit?: string;
    warehouseName?: string;
    binName?: string;
    isValid: boolean;
    error?: string;
}

export interface SparePartStockEnrichResult {
    rows: SparePartStockEnrichedRow[];
    invalidSparePartNames: string[];
}

export interface SparePartStockCellValidation {
    columnName: string;
    status: string;
    validationMessage: string;
}

export interface SparePartStockRowValidation {
    rowIndex: number;
    rowStatus: string;
    errorMessage?: string;
    cellValidations: SparePartStockCellValidation[];
}

export interface SparePartStockValidationSummary {
    totalRows: number;
    validRows: number;
    duplicateCount: number;
    missingDataCount: number;
    mismatchCount: number;
    invalidContentCount: number;
}

export interface SparePartStockValidationResult {
    isValid: boolean;
    summary: SparePartStockValidationSummary;
    rows: SparePartStockRowValidation[];
}

export const getSparePartStockWarehouses = async (): Promise<WarehouseDto[]> => {
    const response = await api.get('/sparepartmasterstock/warehouses');
    return response.data;
};

export const getSparePartStockBins = async (warehouseName: string): Promise<WarehouseDto[]> => {
    const response = await api.get('/sparepartmasterstock/bins', { params: { warehouseName } });
    return response.data;
};

export const enrichSparePartStock = async (rows: { sparePartName?: string; receiptQuantity: number; purchaseRate: number; stockUnit?: string; warehouseName?: string; binName?: string }[]): Promise<SparePartStockEnrichResult> => {
    const response = await api.post('/sparepartmasterstock/enrich', { rows });
    return response.data;
};

export const importSparePartStock = async (rows: SparePartStockRowDto[]): Promise<SparePartStockImportResult> => {
    const response = await api.post('/sparepartmasterstock/import', { rows });
    return response.data;
};

export const validateSparePartStock = async (rows: SparePartStockEnrichedRow[]): Promise<SparePartStockValidationResult> => {
    const response = await api.post('/sparepartmasterstock/validate', { rows });
    return response.data;
};

export const loadSparePartStockData = async (): Promise<SparePartStockEnrichedRow[]> => {
    const response = await api.get('/sparepartmasterstock/load');
    return response.data;
};

// ==================== TOOL STOCK API ====================

export interface ToolStockRowDto {
    rowIndex?: number;
    toolGroupName?: string;
    toolName?: string;
    receiptQuantity: number;
    purchaseRate: number;
    stockUnit?: string;
    batchNo?: string;
    warehouseName?: string;
    binName?: string;
}

export interface ToolStockImportResult {
    success: boolean;
    totalRows: number;
    importedRows: number;
    failedRows: number;
    message: string;
    errorMessages: string[];
}

export interface ToolStockEnrichedRow {
    toolGroupName?: string;
    toolName?: string;
    toolID: number;
    toolGroupID: number;
    receiptQuantity: number;
    purchaseRate: number;
    batchNo?: string;
    stockUnit?: string;
    warehouseName?: string;
    binName?: string;
    isValid: boolean;
    error?: string;
}

export interface ToolStockEnrichResult {
    rows: ToolStockEnrichedRow[];
    invalidToolNames: string[];
    invalidToolGroupNames: string[];
}

export interface ToolStockCellValidation {
    columnName: string;
    status: string;
    validationMessage: string;
}

export interface ToolStockRowValidation {
    rowIndex: number;
    rowStatus: string;
    errorMessage?: string;
    cellValidations: ToolStockCellValidation[];
}

export interface ToolStockValidationSummary {
    totalRows: number;
    validRows: number;
    duplicateCount: number;
    missingDataCount: number;
    mismatchCount: number;
    invalidContentCount: number;
}

export interface ToolStockValidationResult {
    isValid: boolean;
    summary: ToolStockValidationSummary;
    rows: ToolStockRowValidation[];
}

export const getToolStockWarehouses = async (): Promise<WarehouseDto[]> => {
    const response = await api.get('/toolstock/warehouses');
    return response.data;
};

export const getToolStockBins = async (warehouseName: string): Promise<WarehouseDto[]> => {
    const response = await api.get(`/toolstock/bins?warehouseName=${encodeURIComponent(warehouseName)}`);
    return response.data;
};

export const enrichToolStock = async (rows: { toolGroupName?: string; toolName?: string; receiptQuantity: number; purchaseRate: number; stockUnit?: string; warehouseName?: string; binName?: string }[]): Promise<ToolStockEnrichResult> => {
    const response = await api.post('/toolstock/enrich', { rows });
    return response.data;
};

export const importToolStock = async (rows: ToolStockRowDto[]): Promise<ToolStockImportResult> => {
    const response = await api.post('/toolstock/import', { rows });
    return response.data;
};

export const validateToolStock = async (rows: ToolStockEnrichedRow[]): Promise<ToolStockValidationResult> => {
    const response = await api.post('/toolstock/validate', { rows });
    return response.data;
};

export const loadToolStockData = async (toolGroupId: number): Promise<ToolStockEnrichedRow[]> => {
    const response = await api.get('/toolstock/load', { params: { toolGroupId } });
    return response.data;
};

