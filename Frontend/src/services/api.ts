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
            // Optional: Dispatch event or handle logout
            console.warn('Unauthorized access. Session might be expired.');
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
    // New Fields
    moduleHeadDisplayName?: string;
    moduleHeadDisplayOrder?: number;
    moduleDisplayOrder?: number;
    setGroupIndex?: number;
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
    creditDays?: number;
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
    wtCalculateOnEstimation?: boolean;
    showPlanUptoWastagePerc: boolean;
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
    manualProductionEntryTime?: string;
    productionEntryBackDay?: number;
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
    messageShow?: boolean;
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

