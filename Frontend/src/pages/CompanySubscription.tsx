import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    CreditCard, Plus, Edit2, Trash2, Save, X, Loader2, RefreshCw, Search,
    Database, Server, ChevronRight, ArrowLeft, CheckCircle2
} from 'lucide-react';
import {
    getCompanySubscriptions,
    createCompanySubscription,
    updateCompanySubscription,
    deleteCompanySubscription,
    getServers,
    setupDatabase,
    CompanySubscriptionDto,
    SetupDatabaseRequest,
    SetupDatabaseResponse,
} from '../services/api';
import { useMessageModal } from '../components/MessageModal';

import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, GridApi } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const EMPTY_FORM: CompanySubscriptionDto = {
    companyUserID: '',
    password: '',
    companyName: '',
    companyCode: '',
    companyUniqueCode: '',
    conn_String: '',
    applicationName: 'estimoprime',
    subscriptionStatus: 'Active',
    statusDescription: '',
    subscriptionStatusMessage: '',
    address: '',
    country: 'India',
    state: '',
    city: '',
    gstin: '',
    email: '',
    mobile: '',
    loginAllowed: 1,
    fromDate: '',
    toDate: '',
    paymentDueDate: '',
    fYear: '',
};

const APPLICATION_OPTIONS = ['estimoprime', 'multiunit', 'PrintudeERP'];
const SUBSCRIPTION_STATUS_OPTIONS = ['Active', 'Expired'];

const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch { return ''; }
};

// Generate database name based on application and client name
const generateDatabaseName = (applicationName: string, clientName: string): string => {
    const cleanClient = clientName.trim().replace(/\s+/g, '');
    if (!cleanClient) return '';
    const appLower = applicationName.toLowerCase();
    if (appLower === 'printuderp') {
        return `IndusPrintude${cleanClient}`;
    }
    // desktop, estimoprime, multiunit
    return `IndusEnterprise${cleanClient}`;
};

const CompanySubscription: React.FC = () => {
    const { showMessage, ModalRenderer } = useMessageModal();

    const [data, setData] = useState<CompanySubscriptionDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<CompanySubscriptionDto | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [, setFormMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState<CompanySubscriptionDto>({ ...EMPTY_FORM });
    const [originalCompanyUserID, setOriginalCompanyUserID] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ─── 2-Step Create Wizard State ───
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2>(1);
    const [serverList, setServerList] = useState<string[]>([]);
    const [wizardServer, setWizardServer] = useState('');
    const [wizardAppName, setWizardAppName] = useState('estimoprime');
    const [wizardClientName, setWizardClientName] = useState('');
    const [wizardDbName, setWizardDbName] = useState('');
    const [wizardDbNameEdited, setWizardDbNameEdited] = useState(false);
    const [isSettingUpDb, setIsSettingUpDb] = useState(false);
    const [setupResult, setSetupResult] = useState<SetupDatabaseResponse | null>(null);

    const gridApiRef = useRef<GridApi | null>(null);

    // Fetch data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getCompanySubscriptions();
            if (response.success) {
                setData(response.data);
            } else {
                showMessage('error', 'Load Error', response.message || 'Failed to load data.');
            }
        } catch (error) {
            console.error(error);
            showMessage('error', 'Load Error', 'Failed to load company subscriptions.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-generate DB name when client name or app changes (only if user hasn't manually edited)
    useEffect(() => {
        if (!wizardDbNameEdited && wizardClientName) {
            setWizardDbName(generateDatabaseName(wizardAppName, wizardClientName));
        }
    }, [wizardAppName, wizardClientName, wizardDbNameEdited]);

    // AG Grid Column Definitions
    const columnDefs = useMemo<ColDef[]>(() => [
        { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 60, sortable: false, filter: false, resizable: false },
        { headerName: 'Client Code', field: 'companyUniqueCode', width: 130, filter: 'agTextColumnFilter' },
        {
            headerName: 'Status', field: 'subscriptionStatus', width: 110, filter: 'agTextColumnFilter',
            cellRenderer: (params: any) => {
                const val = params.value;
                if (val === 'Active') return React.createElement('span', { className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700' }, 'Active');
                if (val === 'Expired') return React.createElement('span', { className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700' }, 'Expired');
                return val || '';
            }
        },
        { headerName: 'Client Name', field: 'companyName', width: 200, filter: 'agTextColumnFilter' },
        { headerName: 'Application', field: 'applicationName', width: 130, filter: 'agTextColumnFilter' },
        { headerName: 'Client Address', field: 'address', width: 200, filter: 'agTextColumnFilter' },
        { headerName: 'City', field: 'city', width: 120, filter: 'agTextColumnFilter' },
        { headerName: 'State', field: 'state', width: 130, filter: 'agTextColumnFilter' },
        { headerName: 'Country', field: 'country', width: 110, filter: 'agTextColumnFilter' },
        { headerName: 'Company Code', field: 'companyCode', width: 130, filter: 'agTextColumnFilter' },
        { headerName: 'User ID', field: 'companyUserID', width: 120, filter: 'agTextColumnFilter' },
        {
            headerName: 'From Date', field: 'fromDate', width: 130, filter: 'agDateColumnFilter',
            valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : ''
        },
        {
            headerName: 'To Date', field: 'toDate', width: 130, filter: 'agDateColumnFilter',
            valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : ''
        },
        {
            headerName: 'Payment Due', field: 'paymentDueDate', width: 130, filter: 'agDateColumnFilter',
            valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : ''
        },
        { headerName: 'Login Allowed', field: 'loginAllowed', width: 120, filter: 'agNumberColumnFilter' },
        { headerName: 'GSTIN', field: 'gstin', width: 170, filter: 'agTextColumnFilter' },
        { headerName: 'Email', field: 'email', width: 200, filter: 'agTextColumnFilter' },
        { headerName: 'Mobile', field: 'mobile', width: 130, filter: 'agTextColumnFilter' },
        { headerName: 'Status Description', field: 'statusDescription', width: 180, filter: 'agTextColumnFilter' },
        { headerName: 'ERP Message', field: 'subscriptionStatusMessage', width: 180, filter: 'agTextColumnFilter' },
    ], []);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        resizable: true,
    }), []);

    // ─── Handlers ───

    const handleCreate = async () => {
        // Open Step 1 wizard
        setWizardStep(1);
        setWizardServer('');
        setWizardAppName('estimoprime');
        setWizardClientName('');
        setWizardDbName('');
        setWizardDbNameEdited(false);
        setSetupResult(null);
        setShowWizard(true);

        // Fetch server list
        try {
            const res = await getServers();
            if (res.success) {
                setServerList(res.servers);
                if (res.servers.length > 0) setWizardServer(res.servers[0]);
            }
        } catch (err) {
            console.error('Failed to fetch servers', err);
        }
    };

    const handleWizardStep1Save = async () => {
        // Validate
        if (!wizardServer) {
            showMessage('error', 'Validation', 'Please select a server.');
            return;
        }
        if (!wizardAppName) {
            showMessage('error', 'Validation', 'Please select an application name.');
            return;
        }
        if (!wizardClientName.trim()) {
            showMessage('error', 'Validation', 'Client Name is required.');
            return;
        }
        if (!wizardDbName.trim()) {
            showMessage('error', 'Validation', 'Database Name is required.');
            return;
        }

        setIsSettingUpDb(true);
        try {
            const request: SetupDatabaseRequest = {
                server: wizardServer,
                applicationName: wizardAppName,
                clientName: wizardClientName.trim(),
                databaseName: wizardDbName.trim(),
            };

            const result = await setupDatabase(request);
            if (result.success) {
                setSetupResult(result);
                // Auto-fill Step 2 form with result data
                setFormData({
                    ...EMPTY_FORM,
                    conn_String: result.connectionString,
                    applicationName: result.applicationName,
                    companyName: result.clientName,
                });
                setFormMode('create');
                setOriginalCompanyUserID('');
                setWizardStep(2);
                showMessage('success', 'Database Created', result.message);
            } else {
                showMessage('error', 'Setup Failed', result.message);
            }
        } catch (error: any) {
            console.error('Setup database error:', error);
            showMessage('error', 'Setup Failed', error?.response?.data?.message || 'Database setup failed.');
        } finally {
            setIsSettingUpDb(false);
        }
    };

    const handleWizardStep2Save = async () => {
        // Validation
        if (!formData.companyUserID.trim()) {
            showMessage('error', 'Validation', 'User ID is required.');
            return;
        }
        if (/\s/.test(formData.companyUserID)) {
            showMessage('error', 'Validation', 'User ID must not contain spaces.');
            return;
        }
        if (!formData.password.trim()) {
            showMessage('error', 'Validation', 'Password is required.');
            return;
        }
        if (/\s/.test(formData.password)) {
            showMessage('error', 'Validation', 'Password must not contain spaces.');
            return;
        }
        if (!formData.companyName.trim()) {
            showMessage('error', 'Validation', 'Client Name is required.');
            return;
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            showMessage('error', 'Validation', 'Please enter a valid email address.');
            return;
        }
        if (formData.mobile && !/^\d+$/.test(formData.mobile)) {
            showMessage('error', 'Validation', 'Mobile must be numeric.');
            return;
        }

        setIsSaving(true);
        try {
            const payload: any = {
                companyUserID: formData.companyUserID,
                password: formData.password || '',
                conn_String: formData.conn_String || null,
                companyName: formData.companyName,
                applicationName: formData.applicationName || null,
                applicationVersion: formData.applicationVersion || null,
                subscriptionStatus: formData.subscriptionStatus || null,
                statusDescription: formData.statusDescription || null,
                subscriptionStatusMessage: formData.subscriptionStatusMessage || null,
                address: formData.address || null,
                country: formData.country || null,
                state: formData.state || null,
                city: formData.city || null,
                companyCode: formData.companyCode || null,
                companyUniqueCode: formData.companyUniqueCode || null,
                gstin: formData.gstin || null,
                email: formData.email || null,
                mobile: formData.mobile || null,
                loginAllowed: formData.loginAllowed ?? 1,
                fromDate: formData.fromDate || null,
                toDate: formData.toDate || null,
                paymentDueDate: formData.paymentDueDate || null,
                fYear: formData.fYear || null,
            };

            const response = await createCompanySubscription(payload);
            if (response.success) {
                showMessage('success', 'Created', 'Subscription record created successfully.');
                setShowWizard(false);
                setSelectedRow(null);
                await fetchData();
            } else {
                showMessage('error', 'Save Error', response.message);
            }
        } catch (error) {
            showMessage('error', 'Save Error', 'Failed to save record.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = () => {
        if (!selectedRow) {
            showMessage('info', 'No Selection', 'Please select a row to edit.');
            return;
        }
        setFormMode('edit');
        setOriginalCompanyUserID(selectedRow.companyUserID);
        setFormData({
            ...selectedRow,
            fromDate: formatDateForInput(selectedRow.fromDate),
            toDate: formatDateForInput(selectedRow.toDate),
            paymentDueDate: formatDateForInput(selectedRow.paymentDueDate),
        });
        setShowForm(true);
    };

    const handleRowDoubleClick = (event: any) => {
        const row = event.data as CompanySubscriptionDto;
        setSelectedRow(row);
        setFormMode('edit');
        setOriginalCompanyUserID(row.companyUserID);
        setFormData({
            ...row,
            fromDate: formatDateForInput(row.fromDate),
            toDate: formatDateForInput(row.toDate),
            paymentDueDate: formatDateForInput(row.paymentDueDate),
        });
        setShowForm(true);
    };

    const handleRowClick = (event: any) => {
        setSelectedRow(event.data);
    };

    const handleDelete = () => {
        if (!selectedRow) {
            showMessage('info', 'No Selection', 'Please select a row to delete.');
            return;
        }
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!selectedRow) return;
        setShowDeleteConfirm(false);
        setIsLoading(true);
        try {
            const response = await deleteCompanySubscription(selectedRow.companyUserID);
            if (response.success) {
                showMessage('success', 'Deleted', 'Record deleted successfully.');
                setSelectedRow(null);
                await fetchData();
            } else {
                showMessage('error', 'Delete Error', response.message);
            }
        } catch (error) {
            showMessage('error', 'Delete Error', 'Failed to delete record.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => {
            let finalValue: any = value;
            if (type === 'number') {
                finalValue = value === '' ? null : parseInt(value, 10);
            } else if (type === 'checkbox') {
                finalValue = (e.target as HTMLInputElement).checked;
            }
            return { ...prev, [name]: finalValue };
        });
    };

    const handleFormSubmit = async () => {
        if (!formData.companyName.trim()) {
            showMessage('error', 'Validation', 'Client Name is required.');
            return;
        }
        if (!formData.companyUserID.trim()) {
            showMessage('error', 'Validation', 'User ID is required.');
            return;
        }

        setIsSaving(true);
        try {
            const payload: any = {
                companyUserID: formData.companyUserID,
                password: formData.password || '',
                conn_String: formData.conn_String || null,
                companyName: formData.companyName,
                applicationName: formData.applicationName || null,
                applicationVersion: formData.applicationVersion || null,
                subscriptionStatus: formData.subscriptionStatus || null,
                statusDescription: formData.statusDescription || null,
                subscriptionStatusMessage: formData.subscriptionStatusMessage || null,
                address: formData.address || null,
                country: formData.country || null,
                state: formData.state || null,
                city: formData.city || null,
                companyCode: formData.companyCode || null,
                companyUniqueCode: formData.companyUniqueCode || null,
                gstin: formData.gstin || null,
                email: formData.email || null,
                mobile: formData.mobile || null,
                loginAllowed: formData.loginAllowed ?? 1,
                fromDate: formData.fromDate || null,
                toDate: formData.toDate || null,
                paymentDueDate: formData.paymentDueDate || null,
                fYear: formData.fYear || null,
            };

            payload.originalCompanyUserID = originalCompanyUserID;
            const response = await updateCompanySubscription(payload);

            if (response.success) {
                showMessage('success', 'Updated', 'Record updated successfully.');
                setShowForm(false);
                setSelectedRow(null);
                await fetchData();
            } else {
                showMessage('error', 'Save Error', response.message);
            }
        } catch (error) {
            showMessage('error', 'Save Error', 'Failed to save record.');
        } finally {
            setIsSaving(false);
        }
    };

    const onGridReady = (params: any) => {
        gridApiRef.current = params.api;
    };

    useEffect(() => {
        if (gridApiRef.current) {
            gridApiRef.current.setGridOption('quickFilterText', searchText);
        }
    }, [searchText]);

    // ─── RENDER ─────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {ModalRenderer}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Company Subscription
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage company subscriptions and licensing ({data.length} records)
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button onClick={handleCreate}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                        <Plus className="w-4 h-4" /> Create
                    </button>
                    <button onClick={handleEdit}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors">
                        <Edit2 className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={handleDelete}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search across all columns..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            {/* AG Grid Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="ag-theme-quartz" style={{ height: 'calc(100vh - 320px)', width: '100%', ['--ag-grid-size' as any]: '6px' }}>
                    <AgGridReact
                        rowData={data}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        onGridReady={onGridReady}
                        rowSelection="single"
                        onRowClicked={handleRowClick}
                        onRowDoubleClicked={handleRowDoubleClick}
                        pagination={true}
                        paginationPageSize={50}
                        paginationPageSizeSelector={[25, 50, 100, 200]}
                        animateRows={true}
                        getRowId={(params) => params.data.companyUserID}
                        loading={isLoading}
                        overlayNoRowsTemplate="<span class='text-gray-500 text-sm'>No subscription records found</span>"
                    />
                </div>
            </div>

            {/* ─── 2-STEP CREATE WIZARD ─── */}
            {showWizard && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 border border-gray-200 dark:border-gray-700">
                        {/* Wizard Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    {wizardStep === 1 ? <Database className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        Create New Subscription
                                    </h2>
                                    <p className="text-sm text-indigo-100">
                                        {wizardStep === 1 ? 'Step 1: Setup Database' : 'Step 2: Subscription Details'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Step Indicator */}
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${wizardStep === 1 ? 'bg-white text-indigo-600' : 'bg-white/30 text-white'}`}>
                                        {wizardStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-white/50" />
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${wizardStep === 2 ? 'bg-white text-indigo-600' : 'bg-white/30 text-white'}`}>
                                        2
                                    </div>
                                </div>
                                <button onClick={() => setShowWizard(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* STEP 1: Database Setup */}
                        {wizardStep === 1 && (
                            <>
                                <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Database Setup</h3>
                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                    Select a server, application type, and client name. A new database will be created and restored from the application template.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Database Configuration</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Server (editable with suggestions) */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Server *</label>
                                                <input
                                                    type="text"
                                                    list="server-list"
                                                    value={wizardServer}
                                                    onChange={e => setWizardServer(e.target.value)}
                                                    placeholder="Enter or select server (e.g. 13.200.122.70,1433)"
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                                />
                                                <datalist id="server-list">
                                                    {serverList.map(s => <option key={s} value={s} />)}
                                                </datalist>
                                            </div>

                                            {/* Application Name Dropdown */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Application Name *</label>
                                                <select
                                                    value={wizardAppName}
                                                    onChange={e => {
                                                        setWizardAppName(e.target.value);
                                                        setWizardDbNameEdited(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                                >
                                                    {APPLICATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>

                                            {/* Client Name */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Client Name *</label>
                                                <input
                                                    type="text"
                                                    value={wizardClientName}
                                                    onChange={e => {
                                                        setWizardClientName(e.target.value);
                                                        if (wizardDbNameEdited) setWizardDbNameEdited(false);
                                                    }}
                                                    placeholder="Enter client name"
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                                />
                                            </div>

                                            {/* Database Name (Auto-generated, editable) */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                    Database Name *
                                                    <span className="ml-2 text-xs text-gray-400 font-normal">(auto-generated)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={wizardDbName}
                                                    onChange={e => {
                                                        setWizardDbName(e.target.value);
                                                        setWizardDbNameEdited(true);
                                                    }}
                                                    placeholder="Database name"
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Preview Info */}
                                        {wizardDbName && (
                                            <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                                    <strong>Preview:</strong> Database <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">{wizardDbName}</code> will be created on server <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">{wizardServer || '(select server)'}</code> using <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">{wizardAppName}</code> template.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 1 Footer */}
                                <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                                    <button onClick={() => setShowWizard(false)}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <X className="w-4 h-4" /> Cancel
                                    </button>
                                    <button onClick={handleWizardStep1Save} disabled={isSettingUpDb}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                        {isSettingUpDb ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Creating Database...
                                            </>
                                        ) : (
                                            <>
                                                <Database className="w-4 h-4" />
                                                Create Database & Continue
                                                <ChevronRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* STEP 2: Subscription Details */}
                        {wizardStep === 2 && (
                            <>
                                <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
                                    {/* Success Banner */}
                                    {setupResult && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Database Created Successfully</h3>
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                        <strong>{setupResult.databaseName}</strong> on <strong>{setupResult.server}</strong> — Now fill in the subscription details below.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Card 1: Client Info */}
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Client Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField label="Client Code" name="companyUniqueCode" value={formData.companyUniqueCode || ''} onChange={handleFormChange} />
                                            <FormField label="Client Name *" name="companyName" value={formData.companyName} onChange={handleFormChange} />
                                            <FormField label="Company Code" name="companyCode" value={formData.companyCode || ''} onChange={handleFormChange} />
                                            <FormSelect label="Application Name" name="applicationName" value={formData.applicationName || ''} onChange={handleFormChange} options={APPLICATION_OPTIONS} />
                                            <FormField label="GSTIN" name="gstin" value={formData.gstin || ''} onChange={handleFormChange} />
                                        </div>
                                    </div>

                                    {/* Card 2: Address */}
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4">Address</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-3">
                                                <FormField label="Address" name="address" value={formData.address || ''} onChange={handleFormChange} />
                                            </div>
                                            <FormField label="City" name="city" value={formData.city || ''} onChange={handleFormChange} />
                                            <FormField label="State" name="state" value={formData.state || ''} onChange={handleFormChange} />
                                            <FormField label="Country" name="country" value={formData.country || ''} onChange={handleFormChange} />
                                        </div>
                                    </div>

                                    {/* Card 3: Contact */}
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-4">Contact Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField label="Email" name="email" value={formData.email || ''} onChange={handleFormChange} type="email" />
                                            <FormField label="Mobile" name="mobile" value={formData.mobile || ''} onChange={handleFormChange} />
                                        </div>
                                    </div>

                                    {/* Card 4: Subscription */}
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4">Subscription</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormSelect label="Subscription Status" name="subscriptionStatus" value={formData.subscriptionStatus || ''} onChange={handleFormChange} options={SUBSCRIPTION_STATUS_OPTIONS} />
                                            <FormField label="From Date" name="fromDate" value={formatDateForInput(formData.fromDate)} onChange={handleFormChange} type="date" />
                                            <FormField label="To Date" name="toDate" value={formatDateForInput(formData.toDate)} onChange={handleFormChange} type="date" />
                                            <FormField label="Payment Due Date" name="paymentDueDate" value={formatDateForInput(formData.paymentDueDate)} onChange={handleFormChange} type="date" />
                                            <FormField label="Status Description" name="statusDescription" value={formData.statusDescription || ''} onChange={handleFormChange} />
                                            <FormField label="ERP Message" name="subscriptionStatusMessage" value={formData.subscriptionStatusMessage || ''} onChange={handleFormChange} />
                                        </div>
                                    </div>

                                    {/* Card 5: Login & Access */}
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-4">Login & Access</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField label="User ID *" name="companyUserID" value={formData.companyUserID} onChange={handleFormChange} />
                                            <FormField label="Password *" name="password" value={formData.password} onChange={handleFormChange} />
                                            <FormField label="Connection String" name="conn_String" value={formData.conn_String || ''} onChange={handleFormChange} />
                                            <FormField label="Login Allowed" name="loginAllowed" value={String(formData.loginAllowed ?? '')} onChange={handleFormChange} type="number" />
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2 Footer */}
                                <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                                    <button onClick={() => setWizardStep(1)}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setShowWizard(false)}
                                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <X className="w-4 h-4" /> Cancel
                                        </button>
                                        <button onClick={handleWizardStep2Save} disabled={isSaving}
                                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            {isSaving ? 'Saving...' : 'Create Subscription'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── EDIT FORM (Modal Overlay) ─── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 border border-gray-200 dark:border-gray-700">
                        {/* Form Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-600 to-orange-600 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Edit2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Edit Subscription</h2>
                                    <p className="text-sm text-amber-100">Editing: {formData.companyName}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Form Body - 5 Cards */}
                        <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">

                            {/* Card 1: Client Info */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Client Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField label="Client Code" name="companyUniqueCode" value={formData.companyUniqueCode || ''} onChange={handleFormChange} />
                                    <FormField label="Client Name *" name="companyName" value={formData.companyName} onChange={handleFormChange} />
                                    <FormField label="Company Code" name="companyCode" value={formData.companyCode || ''} onChange={handleFormChange} />
                                    <FormSelect label="Application Name" name="applicationName" value={formData.applicationName || ''} onChange={handleFormChange} options={APPLICATION_OPTIONS} />
                                    <FormField label="GSTIN" name="gstin" value={formData.gstin || ''} onChange={handleFormChange} />
                                </div>
                            </div>

                            {/* Card 2: Address */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4">Address</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-3">
                                        <FormField label="Address" name="address" value={formData.address || ''} onChange={handleFormChange} />
                                    </div>
                                    <FormField label="City" name="city" value={formData.city || ''} onChange={handleFormChange} />
                                    <FormField label="State" name="state" value={formData.state || ''} onChange={handleFormChange} />
                                    <FormField label="Country" name="country" value={formData.country || ''} onChange={handleFormChange} />
                                </div>
                            </div>

                            {/* Card 3: Contact */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-4">Contact Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField label="Email" name="email" value={formData.email || ''} onChange={handleFormChange} type="email" />
                                    <FormField label="Mobile" name="mobile" value={formData.mobile || ''} onChange={handleFormChange} />
                                </div>
                            </div>

                            {/* Card 4: Subscription */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4">Subscription</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormSelect label="Subscription Status" name="subscriptionStatus" value={formData.subscriptionStatus || ''} onChange={handleFormChange} options={SUBSCRIPTION_STATUS_OPTIONS} />
                                    <FormField label="From Date" name="fromDate" value={formatDateForInput(formData.fromDate)} onChange={handleFormChange} type="date" />
                                    <FormField label="To Date" name="toDate" value={formatDateForInput(formData.toDate)} onChange={handleFormChange} type="date" />
                                    <FormField label="Payment Due Date" name="paymentDueDate" value={formatDateForInput(formData.paymentDueDate)} onChange={handleFormChange} type="date" />
                                    <FormField label="Status Description" name="statusDescription" value={formData.statusDescription || ''} onChange={handleFormChange} />
                                    <FormField label="ERP Message" name="subscriptionStatusMessage" value={formData.subscriptionStatusMessage || ''} onChange={handleFormChange} />
                                </div>
                            </div>

                            {/* Card 5: Login & Access */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-4">Login & Access</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField label="User ID *" name="companyUserID" value={formData.companyUserID} onChange={handleFormChange} />
                                    <FormField label="Password" name="password" value={formData.password} onChange={handleFormChange} />
                                    <FormField label="Connection String" name="conn_String" value={formData.conn_String || ''} onChange={handleFormChange} />
                                    <FormField label="Login Allowed" name="loginAllowed" value={String(formData.loginAllowed ?? '')} onChange={handleFormChange} type="number" />
                                </div>
                            </div>
                        </div>

                        {/* Form Footer */}
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                            <button onClick={() => setShowForm(false)}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <X className="w-4 h-4" /> Cancel
                            </button>
                            <button onClick={handleFormSubmit} disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Delete</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete the subscription for <strong>{selectedRow?.companyName}</strong> (UserID: {selectedRow?.companyUserID})? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Reusable Form Components ───────────────────────────────────────────────

interface FormFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, name, value, onChange, type = 'text', placeholder }) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder || label.replace(' *', '')}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        />
    </div>
);

interface FormSelectProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
}

const FormSelect: React.FC<FormSelectProps> = ({ label, name, value, onChange, options }) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        >
            <option value="">-- Select --</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

export default CompanySubscription;
