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
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/excel/Preview', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const importExcel = async (file: File, tableName: string): Promise<ImportResultDto> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/excel/Import?tableName=${tableName}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};



export interface CompanyDto {
    companyId: number;
    companyName: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    gstin: string;
    isActive: boolean;
    isGstApplicable: boolean;
    isEinvoiceApplicable: boolean;
    isInternalApprovalRequired: boolean;
    isRequisitionApproval: boolean;
    isPOApprovalRequired: boolean;
    isInvoiceApprovalRequired: boolean;
    isGRNApprovalRequired: boolean;
    jobScheduleReleaseRequired: boolean;
    isSalesOrderApprovalRequired: boolean;
    isJobReleaseFeatureRequired: boolean;
    showPlanUptoWastagePerc: boolean;
    byPassCostApproval: boolean;
}

export const getCompany = async (): Promise<CompanyDto> => {
    const response = await api.get('/Company');
    return response.data;
};

export const updateCompany = async (company: CompanyDto): Promise<void> => {
    await api.put('/Company', company);
};

export default api;
