import axios from 'axios';

const API_BASE_URL = 'http://localhost:5050/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

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
