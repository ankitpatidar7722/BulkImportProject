import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    CreditCard, Plus, Edit2, Trash2, Save, X, Loader2, RefreshCw, Search,
    Database, Server, ChevronRight, ArrowLeft, CheckCircle2, Building2,
    GitBranch, Factory, PartyPopper, Settings, Copy
} from 'lucide-react';
import {
    getCompanySubscriptions,
    createCompanySubscription,
    updateCompanySubscription,
    deleteCompanySubscription,
    getServers,
    setupDatabase,
    saveCompanyMaster,
    saveBranchMaster,
    saveProductionUnit,
    completeSetup,
    getNextClientCode,
    getModuleSettings,
    saveModuleSettings,
    getClientDropdown,
    copyModules,
    CompanySubscriptionDto,
    SetupDatabaseRequest,
    SetupDatabaseResponse,
    CompanyMasterRequest,
    BranchMasterRequest,
    ProductionUnitRequest,
    CompleteSetupRequest,
    CompleteSetupResponse,
    ModuleSettingsRow,
    ClientDropdownItem,
} from '../services/api';
import { useMessageModal } from '../components/MessageModal';

import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, GridApi } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const EMPTY_FORM: CompanySubscriptionDto = {
    companyUserID: '', password: '', companyName: '', companyCode: '', companyUniqueCode: '',
    conn_String: '', applicationName: 'estimoprime', subscriptionStatus: 'Active',
    statusDescription: '', subscriptionStatusMessage: '', address: '', country: 'India',
    state: '', city: '', gstin: '', email: '', mobile: '', loginAllowed: 1,
    fromDate: '', toDate: '', paymentDueDate: '', fYear: '',
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

const generateDatabaseName = (applicationName: string, clientName: string): string => {
    const cleanClient = clientName.trim().replace(/\s+/g, '');
    if (!cleanClient) return '';
    if (applicationName.toLowerCase() === 'printudeerp') return `IndusPrintude${cleanClient}`;
    return `IndusEnterprise${cleanClient}`;
};

// ─── Step Labels ───
const WIZARD_STEPS = [
    { num: 1, label: 'Database', icon: Database },
    { num: 2, label: 'Subscription', icon: CreditCard },
    { num: 3, label: 'Company', icon: Building2 },
    { num: 4, label: 'Branch', icon: GitBranch },
    { num: 5, label: 'Production', icon: Factory },
];

type WizardStepNum = 1 | 2 | 3 | 4 | 5 | 6; // 6 = success screen

const CompanySubscription: React.FC = () => {
    const { showMessage, ModalRenderer } = useMessageModal();

    const [data, setData] = useState<CompanySubscriptionDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<CompanySubscriptionDto | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<CompanySubscriptionDto>({ ...EMPTY_FORM });
    const [originalCompanyUserID, setOriginalCompanyUserID] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editTab, setEditTab] = useState<1 | 2>(1);

    // ─── Module Settings State ───
    const [moduleData, setModuleData] = useState<ModuleSettingsRow[]>([]);
    const [moduleOriginal, setModuleOriginal] = useState<ModuleSettingsRow[]>([]);
    const [isModuleLoading, setIsModuleLoading] = useState(false);
    const [isModuleSaving, setIsModuleSaving] = useState(false);
    const [moduleSearch, setModuleSearch] = useState('');
    const moduleGridRef = useRef<AgGridReact>(null);

    // ─── Copy As State ───
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [clientList, setClientList] = useState<ClientDropdownItem[]>([]);
    const [copyTargetUserID, setCopyTargetUserID] = useState('');
    const [copyClientSearch, setCopyClientSearch] = useState('');
    const [isCopying, setIsCopying] = useState(false);
    const [isClientListLoading, setIsClientListLoading] = useState(false);

    // ─── Wizard State ───
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState<WizardStepNum>(1);
    const [serverList, setServerList] = useState<string[]>([]);
    const [wizardServer, setWizardServer] = useState('');
    const [wizardAppName, setWizardAppName] = useState('estimoprime');
    const [wizardClientName, setWizardClientName] = useState('');
    const [wizardDbName, setWizardDbName] = useState('');
    const [wizardDbNameEdited, setWizardDbNameEdited] = useState(false);
    const [isSettingUpDb, setIsSettingUpDb] = useState(false);
    const [setupResult, setSetupResult] = useState<SetupDatabaseResponse | null>(null);

    // Step 3: Company Master
    const [companyMaster, setCompanyMaster] = useState<CompanyMasterRequest>({
        connectionString: '', companyID: 2, companyName: '',
        address1: '', address2: '', address3: '', city: '', state: '', country: 'India',
        pincode: '', contactNO: '', mobileNO: '', email: '', website: '',
        stateTinNo: '', cinNo: '', productionUnitAddress: '', address: '',
        gstin: '', productionUnitName: '', pan: '',
    });

    // Step 4: Branch Master
    const [branchMaster, setBranchMaster] = useState<BranchMasterRequest>({
        connectionString: '', branchID: 1, branchName: '', mailingName: '',
        address1: '', address2: '', address3: '', address: '',
        city: '', district: '', state: '', country: 'India', pincode: '',
        mobileNo: '', email: '', stateTinNo: '', gstin: '', companyID: 2,
    });

    // Step 5: Production Unit
    const [productionUnit, setProductionUnit] = useState<ProductionUnitRequest>({
        connectionString: '', productionUnitName: '', address: '',
        city: '', state: '', gstNo: '', pincode: '', country: 'India', pan: '',
    });

    // Final success
    const [setupComplete, setSetupComplete] = useState<CompleteSetupResponse | null>(null);

    const gridApiRef = useRef<GridApi | null>(null);

    // ─── Fetch Data ───
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getCompanySubscriptions();
            if (response.success) setData(response.data);
            else showMessage('error', 'Load Error', response.message || 'Failed to load data.');
        } catch (error) {
            console.error(error);
            showMessage('error', 'Load Error', 'Failed to load company subscriptions.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-generate DB name
    useEffect(() => {
        if (!wizardDbNameEdited && wizardClientName) {
            setWizardDbName(generateDatabaseName(wizardAppName, wizardClientName));
        }
    }, [wizardAppName, wizardClientName, wizardDbNameEdited]);

    // ─── AG Grid ───
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
        { headerName: 'From Date', field: 'fromDate', width: 130, filter: 'agDateColumnFilter', valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString('en-IN') : '' },
        { headerName: 'To Date', field: 'toDate', width: 130, filter: 'agDateColumnFilter', valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString('en-IN') : '' },
        { headerName: 'Payment Due', field: 'paymentDueDate', width: 130, filter: 'agDateColumnFilter', valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString('en-IN') : '' },
        { headerName: 'Login Allowed', field: 'loginAllowed', width: 120, filter: 'agNumberColumnFilter' },
        { headerName: 'GSTIN', field: 'gstin', width: 170, filter: 'agTextColumnFilter' },
        { headerName: 'Email', field: 'email', width: 200, filter: 'agTextColumnFilter' },
        { headerName: 'Mobile', field: 'mobile', width: 130, filter: 'agTextColumnFilter' },
        { headerName: 'Status Description', field: 'statusDescription', width: 180, filter: 'agTextColumnFilter' },
        { headerName: 'ERP Message', field: 'subscriptionStatusMessage', width: 180, filter: 'agTextColumnFilter' },
    ], []);

    const defaultColDef = useMemo(() => ({ sortable: true, resizable: true }), []);

    // ─── Wizard Handlers ───

    const handleCreate = async () => {
        setWizardStep(1);
        setWizardServer(''); setWizardAppName('estimoprime'); setWizardClientName('');
        setWizardDbName(''); setWizardDbNameEdited(false); setSetupResult(null);
        setFormData({ ...EMPTY_FORM }); setSetupComplete(null);
        setShowWizard(true);
        try {
            const [serversRes, codeRes] = await Promise.all([getServers(), getNextClientCode()]);
            if (serversRes.success) {
                setServerList(serversRes.servers);
                if (serversRes.servers.length > 0) setWizardServer(serversRes.servers[0]);
            }
            if (codeRes.success) {
                setFormData(prev => ({
                    ...prev,
                    companyUniqueCode: codeRes.companyUniqueCode,
                    maxCompanyUniqueCode: codeRes.maxCompanyUniqueCode,
                }));
            }
        } catch (err) { console.error('Failed to fetch initial data', err); }
    };

    // Step 1: Create Database
    const handleStep1Save = async () => {
        if (!wizardServer) { showMessage('error', 'Validation', 'Please select a server.'); return; }
        if (!wizardAppName) { showMessage('error', 'Validation', 'Please select an application name.'); return; }
        if (!wizardClientName.trim()) { showMessage('error', 'Validation', 'Client Name is required.'); return; }
        if (!wizardDbName.trim()) { showMessage('error', 'Validation', 'Database Name is required.'); return; }

        setIsSettingUpDb(true);
        try {
            const req: SetupDatabaseRequest = {
                server: wizardServer, applicationName: wizardAppName,
                clientName: wizardClientName.trim(), databaseName: wizardDbName.trim(),
            };
            const result = await setupDatabase(req);
            if (result.success) {
                setSetupResult(result);
                setFormData({
                    ...EMPTY_FORM,
                    conn_String: result.connectionString,
                    applicationName: result.applicationName,
                    companyName: result.clientName,
                });
                setWizardStep(2);
                showMessage('success', 'Database Created', result.message);
            } else {
                showMessage('error', 'Setup Failed', result.message);
            }
        } catch (error: any) {
            showMessage('error', 'Setup Failed', error?.response?.data?.message || 'Database setup failed.');
        } finally {
            setIsSettingUpDb(false);
        }
    };

    // Step 2: Save Subscription
    const handleStep2Save = async () => {
        if (!formData.companyUserID.trim()) { showMessage('error', 'Validation', 'User ID is required.'); return; }
        if (/\s/.test(formData.companyUserID)) { showMessage('error', 'Validation', 'User ID must not contain spaces.'); return; }
        if (!formData.password.trim()) { showMessage('error', 'Validation', 'Password is required.'); return; }
        if (/\s/.test(formData.password)) { showMessage('error', 'Validation', 'Password must not contain spaces.'); return; }
        if (!formData.companyName.trim()) { showMessage('error', 'Validation', 'Client Name is required.'); return; }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { showMessage('error', 'Validation', 'Please enter a valid email.'); return; }
        if (formData.mobile && !/^\d+$/.test(formData.mobile)) { showMessage('error', 'Validation', 'Mobile must be numeric.'); return; }

        setIsSaving(true);
        try {
            const payload: any = {
                companyUserID: formData.companyUserID, password: formData.password || '',
                conn_String: formData.conn_String || null, companyName: formData.companyName,
                applicationName: formData.applicationName || null, applicationVersion: formData.applicationVersion || null,
                subscriptionStatus: formData.subscriptionStatus || null, statusDescription: formData.statusDescription || null,
                subscriptionStatusMessage: formData.subscriptionStatusMessage || null, address: formData.address || null,
                country: formData.country || null, state: formData.state || null, city: formData.city || null,
                companyCode: formData.companyCode || null, companyUniqueCode: formData.companyUniqueCode || null,
                maxCompanyUniqueCode: formData.maxCompanyUniqueCode || null,
                gstin: formData.gstin || null, email: formData.email || null, mobile: formData.mobile || null,
                loginAllowed: formData.loginAllowed ?? 1, fromDate: formData.fromDate || null,
                toDate: formData.toDate || null, paymentDueDate: formData.paymentDueDate || null,
                fYear: formData.fYear || null,
            };
            const response = await createCompanySubscription(payload);
            if (response.success) {
                showMessage('success', 'Created', 'Subscription record created successfully.');
                // Auto-fill Step 3 with data from subscription
                const connStr = formData.conn_String || '';
                setCompanyMaster(prev => ({
                    ...prev,
                    connectionString: connStr,
                    companyName: formData.companyName,
                    city: formData.city || '', state: formData.state || '', country: formData.country || 'India',
                    email: formData.email || '', gstin: formData.gstin || '',
                    mobileNO: formData.mobile || '', address: formData.address || '',
                }));
                setWizardStep(3);
            } else {
                showMessage('error', 'Save Error', response.message);
            }
        } catch (error) {
            showMessage('error', 'Save Error', 'Failed to save record.');
        } finally {
            setIsSaving(false);
        }
    };

    // Step 3: Save Company Master
    const handleStep3Save = async () => {
        if (!companyMaster.companyName.trim()) { showMessage('error', 'Validation', 'Company Name is required.'); return; }
        setIsSaving(true);
        try {
            const response = await saveCompanyMaster(companyMaster);
            if (response.success) {
                showMessage('success', 'Saved', 'Company Master saved.');
                const connStr = companyMaster.connectionString;
                setBranchMaster(prev => ({
                    ...prev,
                    connectionString: connStr,
                    branchName: companyMaster.companyName,
                    mailingName: companyMaster.companyName,
                    address1: companyMaster.address1 || '', address2: companyMaster.address2 || '',
                    address3: companyMaster.address3 || '', address: companyMaster.address || '',
                    city: companyMaster.city || '', state: companyMaster.state || '',
                    country: companyMaster.country || 'India', pincode: companyMaster.pincode || '',
                    mobileNo: companyMaster.mobileNO || '', email: companyMaster.email || '',
                    stateTinNo: companyMaster.stateTinNo || '', gstin: companyMaster.gstin || '',
                    companyID: response.companyID,
                }));
                setWizardStep(4);
            } else {
                showMessage('error', 'Save Error', response.message);
            }
        } catch (error) {
            showMessage('error', 'Save Error', 'Failed to save Company Master.');
        } finally {
            setIsSaving(false);
        }
    };

    // Step 4: Save Branch Master
    const handleStep4Save = async () => {
        if (!branchMaster.branchName.trim()) { showMessage('error', 'Validation', 'Branch Name is required.'); return; }
        setIsSaving(true);
        try {
            const response = await saveBranchMaster(branchMaster);
            if (response.success) {
                showMessage('success', 'Saved', 'Branch Master saved.');
                const connStr = branchMaster.connectionString;
                setProductionUnit(prev => ({
                    ...prev,
                    connectionString: connStr,
                    productionUnitName: companyMaster.productionUnitName || companyMaster.companyName,
                    address: companyMaster.productionUnitAddress || companyMaster.address || '',
                    city: companyMaster.city || '', state: companyMaster.state || '',
                    gstNo: companyMaster.gstin || '', pincode: companyMaster.pincode || '',
                    country: companyMaster.country || 'India', pan: companyMaster.pan || '',
                }));
                setWizardStep(5);
            } else {
                showMessage('error', 'Save Error', response.message);
            }
        } catch (error) {
            showMessage('error', 'Save Error', 'Failed to save Branch Master.');
        } finally {
            setIsSaving(false);
        }
    };

    // Step 5: Save Production Unit + Final Submit
    const handleStep5Save = async () => {
        if (!productionUnit.productionUnitName.trim()) { showMessage('error', 'Validation', 'Production Unit Name is required.'); return; }
        setIsSaving(true);
        try {
            // Save Production Unit
            const puResp = await saveProductionUnit(productionUnit);
            if (!puResp.success) { showMessage('error', 'Save Error', puResp.message); setIsSaving(false); return; }

            // Complete Setup (Update UserMaster + fetch credentials)
            const completeReq: CompleteSetupRequest = {
                connectionString: productionUnit.connectionString,
                city: companyMaster.city || '', state: companyMaster.state || '',
                country: companyMaster.country || '', companyUserID: formData.companyUserID,
            };
            const completeResp = await completeSetup(completeReq);
            if (completeResp.success) {
                setSetupComplete(completeResp);
                setWizardStep(6);
                await fetchData();
            } else {
                showMessage('error', 'Setup Error', completeResp.message);
            }
        } catch (error) {
            showMessage('error', 'Error', 'Failed to complete setup.');
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Module Settings Handlers ───
    const loadModuleSettings = useCallback(async (appName?: string, connStr?: string) => {
        const applicationName = appName || formData.applicationName;
        const connectionString = connStr || formData.conn_String;
        if (!applicationName || !connectionString) return;
        setIsModuleLoading(true);
        try {
            const res = await getModuleSettings(applicationName, connectionString);
            if (res.success) {
                setModuleData(res.data);
                setModuleOriginal(res.data.map(r => ({ ...r })));
            } else {
                showMessage('error', 'Module Settings', res.message);
            }
        } catch (err) {
            showMessage('error', 'Error', 'Failed to load module settings.');
        } finally {
            setIsModuleLoading(false);
        }
    }, [formData.applicationName, formData.conn_String, showMessage]);

    const handleModuleStatusToggle = useCallback((moduleName: string) => {
        setModuleData(prev => prev.map(row =>
            row.moduleName === moduleName ? { ...row, status: !row.status } : row
        ));
    }, []);

    const handleSaveModuleSettings = async () => {
        if (!formData.applicationName || !formData.conn_String) {
            showMessage('error', 'Error', 'Application name or connection string is missing.');
            return;
        }
        // Build diff: only send changed items
        const changes: { moduleName: string; status: boolean }[] = [];
        for (const mod of moduleData) {
            const orig = moduleOriginal.find(o => o.moduleName === mod.moduleName);
            if (!orig || orig.status !== mod.status) {
                changes.push({ moduleName: mod.moduleName, status: mod.status });
            }
        }
        if (changes.length === 0) {
            showMessage('info', 'No Changes', 'No module changes to save.');
            return;
        }
        setIsModuleSaving(true);
        try {
            const res = await saveModuleSettings({
                applicationName: formData.applicationName,
                connectionString: formData.conn_String,
                modules: changes,
            });
            if (res.success) {
                showMessage('success', 'Saved', res.message);
                // Refresh to get fresh state
                await loadModuleSettings();
            } else {
                showMessage('error', 'Save Failed', res.message);
            }
        } catch (err) {
            showMessage('error', 'Error', 'Failed to save module settings.');
        } finally {
            setIsModuleSaving(false);
        }
    };

    // ─── Copy As Handlers ───
    const handleOpenCopyModal = async () => {
        setShowCopyModal(true);
        setCopyTargetUserID('');
        setCopyClientSearch('');
        setClientList([]);
        setIsClientListLoading(true);
        try {
            const res = await getClientDropdown();
            console.log('[CopyAs] getClientDropdown response:', res);
            if (res.success && res.data && res.data.length > 0) {
                setClientList(res.data);
            } else if (res.success) {
                showMessage('info', 'No Clients', 'No clients found in the database.');
            } else {
                showMessage('error', 'Error', res.message || 'Unknown error loading clients.');
            }
        } catch (err: any) {
            console.error('[CopyAs] Error loading clients:', err);
            showMessage('error', 'Error', err?.message || 'Failed to load client list.');
        } finally {
            setIsClientListLoading(false);
        }
    };

    const handleCopyModules = async () => {
        if (!copyTargetUserID) {
            showMessage('info', 'Select Client', 'Please select a target client.');
            return;
        }
        if (!formData.conn_String) {
            showMessage('error', 'Error', 'Source connection string is missing.');
            return;
        }
        setIsCopying(true);
        try {
            const res = await copyModules(formData.conn_String, copyTargetUserID);
            if (res.success) {
                showMessage('success', 'Copied', res.message);
                setShowCopyModal(false);
            } else {
                showMessage('error', 'Copy Failed', res.message);
            }
        } catch {
            showMessage('error', 'Error', 'Failed to copy modules.');
        } finally {
            setIsCopying(false);
        }
    };

    const filteredClientList = useMemo(() => {
        if (!copyClientSearch.trim()) return clientList;
        const q = copyClientSearch.toLowerCase();
        return clientList.filter(c => c.companyName.toLowerCase().includes(q) || c.companyUserID.toLowerCase().includes(q));
    }, [clientList, copyClientSearch]);

    // Load module settings when switching to Module Settings tab
    useEffect(() => {
        if (showForm && editTab === 2 && formData.applicationName && formData.conn_String) {
            loadModuleSettings();
        }
    }, [showForm, editTab]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredModuleData = useMemo(() => {
        if (!moduleSearch.trim()) return moduleData;
        const q = moduleSearch.toLowerCase();
        return moduleData.filter(r =>
            r.moduleHeadName.toLowerCase().includes(q) ||
            r.moduleDisplayName.toLowerCase().includes(q) ||
            r.moduleName.toLowerCase().includes(q)
        );
    }, [moduleData, moduleSearch]);

    const StatusCellRenderer = useCallback((params: any) => {
        const row = params.data as ModuleSettingsRow;
        if (!row) return null;
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <input type="checkbox" checked={row.status} readOnly
                    onClick={() => handleModuleStatusToggle(row.moduleName)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#f59e0b' }} />
            </div>
        );
    }, [handleModuleStatusToggle]);

    const moduleColDefs = useMemo<ColDef[]>(() => [
        {
            headerName: 'Module Head Name',
            field: 'moduleHeadName',
            flex: 1,
            filter: true,
            sortable: true,
        },
        {
            headerName: 'Module Display Name',
            field: 'moduleDisplayName',
            flex: 1,
            filter: true,
            sortable: true,
        },
        {
            headerName: 'Status',
            field: 'status',
            width: 110,
            sortable: true,
            cellRenderer: StatusCellRenderer,
        },
    ], [StatusCellRenderer]);

    // ─── Edit Handlers ───
    const handleEdit = () => {
        if (!selectedRow) { showMessage('info', 'No Selection', 'Please select a row to edit.'); return; }
        setOriginalCompanyUserID(selectedRow.companyUserID);
        setFormData({
            ...selectedRow,
            fromDate: formatDateForInput(selectedRow.fromDate),
            toDate: formatDateForInput(selectedRow.toDate),
            paymentDueDate: formatDateForInput(selectedRow.paymentDueDate),
        });
        setEditTab(1);
        setShowForm(true);
    };

    const handleRowDoubleClick = (event: any) => {
        const row = event.data as CompanySubscriptionDto;
        setSelectedRow(row);
        setOriginalCompanyUserID(row.companyUserID);
        setFormData({
            ...row,
            fromDate: formatDateForInput(row.fromDate),
            toDate: formatDateForInput(row.toDate),
            paymentDueDate: formatDateForInput(row.paymentDueDate),
        });
        setEditTab(1);
        setShowForm(true);
    };

    const handleRowClick = (event: any) => setSelectedRow(event.data);

    const handleDelete = () => {
        if (!selectedRow) { showMessage('info', 'No Selection', 'Please select a row to delete.'); return; }
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!selectedRow) return;
        setShowDeleteConfirm(false); setIsLoading(true);
        try {
            const response = await deleteCompanySubscription(selectedRow.companyUserID);
            if (response.success) { showMessage('success', 'Deleted', 'Record deleted.'); setSelectedRow(null); await fetchData(); }
            else showMessage('error', 'Delete Error', response.message);
        } catch { showMessage('error', 'Delete Error', 'Failed to delete record.'); }
        finally { setIsLoading(false); }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => {
            let finalValue: any = value;
            if (type === 'number') finalValue = value === '' ? null : parseInt(value, 10);
            else if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
            return { ...prev, [name]: finalValue };
        });
    };

    const handleFormSubmit = async () => {
        if (!formData.companyName.trim()) { showMessage('error', 'Validation', 'Client Name is required.'); return; }
        if (!formData.companyUserID.trim()) { showMessage('error', 'Validation', 'User ID is required.'); return; }
        setIsSaving(true);
        try {
            const payload: any = {
                companyUserID: formData.companyUserID, password: formData.password || '',
                conn_String: formData.conn_String || null, companyName: formData.companyName,
                applicationName: formData.applicationName || null, applicationVersion: formData.applicationVersion || null,
                subscriptionStatus: formData.subscriptionStatus || null, statusDescription: formData.statusDescription || null,
                subscriptionStatusMessage: formData.subscriptionStatusMessage || null, address: formData.address || null,
                country: formData.country || null, state: formData.state || null, city: formData.city || null,
                companyCode: formData.companyCode || null, companyUniqueCode: formData.companyUniqueCode || null,
                gstin: formData.gstin || null, email: formData.email || null, mobile: formData.mobile || null,
                loginAllowed: formData.loginAllowed ?? 1, fromDate: formData.fromDate || null,
                toDate: formData.toDate || null, paymentDueDate: formData.paymentDueDate || null, fYear: formData.fYear || null,
            };
            payload.originalCompanyUserID = originalCompanyUserID;
            const response = await updateCompanySubscription(payload);
            if (response.success) { showMessage('success', 'Updated', 'Record updated.'); setShowForm(false); setSelectedRow(null); await fetchData(); }
            else showMessage('error', 'Save Error', response.message);
        } catch { showMessage('error', 'Save Error', 'Failed to save record.'); }
        finally { setIsSaving(false); }
    };

    const onGridReady = (params: any) => { gridApiRef.current = params.api; };
    useEffect(() => { if (gridApiRef.current) gridApiRef.current.setGridOption('quickFilterText', searchText); }, [searchText]);

    // ─── Generic updater for step forms ───
    const updateCompanyMaster = (field: string, value: string) => setCompanyMaster(prev => ({ ...prev, [field]: value }));
    const updateBranchMaster = (field: string, value: string) => setBranchMaster(prev => ({ ...prev, [field]: value }));
    const updateProductionUnit = (field: string, value: string) => setProductionUnit(prev => ({ ...prev, [field]: value }));

    // ─── Wizard Step Header Subtitle ───
    const getStepSubtitle = (step: WizardStepNum): string => {
        switch (step) {
            case 1: return 'Step 1 of 5: Setup Database';
            case 2: return 'Step 2 of 5: Subscription Details';
            case 3: return 'Step 3 of 5: Company Master';
            case 4: return 'Step 4 of 5: Branch Master';
            case 5: return 'Step 5 of 5: Production Unit & Finish';
            case 6: return 'Setup Complete!';
            default: return '';
        }
    };

    // ─── RENDER ───
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Subscription</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage company subscriptions and licensing ({data.length} records)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} disabled={isLoading} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button onClick={handleCreate} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                        <Plus className="w-4 h-4" /> Create
                    </button>
                    <button onClick={handleEdit} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors">
                        <Edit2 className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search across all columns..." value={searchText} onChange={e => setSearchText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>

            {/* AG Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="ag-theme-quartz" style={{ height: 'calc(100vh - 320px)', width: '100%', ['--ag-grid-size' as any]: '6px' }}>
                    <AgGridReact rowData={data} columnDefs={columnDefs} defaultColDef={defaultColDef}
                        onGridReady={onGridReady} rowSelection="single" onRowClicked={handleRowClick}
                        onRowDoubleClicked={handleRowDoubleClick} pagination={true} paginationPageSize={50}
                        paginationPageSizeSelector={[25, 50, 100, 200]} animateRows={true}
                        getRowId={(params) => params.data.companyUserID} loading={isLoading}
                        overlayNoRowsTemplate="<span class='text-gray-500 text-sm'>No subscription records found</span>" />
                </div>
            </div>

            {/* ═══════════════ FULL SETUP WIZARD ═══════════════ */}
            {showWizard && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 border border-gray-200 dark:border-gray-700">
                        {/* Wizard Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    {wizardStep === 6 ? <PartyPopper className="w-5 h-5 text-white" /> :
                                        React.createElement(WIZARD_STEPS[(wizardStep as number) - 1]?.icon || Database, { className: 'w-5 h-5 text-white' })}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Complete Company Setup</h2>
                                    <p className="text-sm text-indigo-100">{getStepSubtitle(wizardStep)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Step Progress Indicators */}
                                <div className="hidden md:flex items-center gap-1">
                                    {WIZARD_STEPS.map((s, i) => (
                                        <React.Fragment key={s.num}>
                                            {i > 0 && <div className={`w-4 h-0.5 ${wizardStep > s.num ? 'bg-white/80' : 'bg-white/20'}`} />}
                                            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                                                wizardStep === s.num ? 'bg-white text-indigo-600 scale-110' :
                                                wizardStep > s.num ? 'bg-white/80 text-indigo-600' : 'bg-white/20 text-white'
                                            }`}>
                                                {wizardStep > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                                <button onClick={() => setShowWizard(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* ═══ STEP 1: Database Setup ═══ */}
                        {wizardStep === 1 && (
                            <>
                                <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Database Setup</h3>
                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Select a server, application type, and client name. A new database will be created and restored from the application template.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Database Configuration</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Server *</label>
                                                <input type="text" list="server-list" value={wizardServer} onChange={e => setWizardServer(e.target.value)}
                                                    placeholder="Enter or select server (e.g. 13.200.122.70,1433)"
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
                                                <datalist id="server-list">{serverList.map(s => <option key={s} value={s} />)}</datalist>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Application Name *</label>
                                                <select value={wizardAppName} onChange={e => { setWizardAppName(e.target.value); setWizardDbNameEdited(false); }}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
                                                    {APPLICATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Client Name *</label>
                                                <input type="text" value={wizardClientName} onChange={e => { setWizardClientName(e.target.value); if (wizardDbNameEdited) setWizardDbNameEdited(false); }}
                                                    placeholder="Enter client name" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Database Name * <span className="ml-1 text-xs text-gray-400 font-normal">(auto-generated)</span></label>
                                                <input type="text" value={wizardDbName} onChange={e => { setWizardDbName(e.target.value); setWizardDbNameEdited(true); }}
                                                    placeholder="Database name" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
                                            </div>
                                        </div>
                                        {wizardDbName && (
                                            <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                                    <strong>Preview:</strong> Database <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">{wizardDbName}</code> on <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">{wizardServer || '(select server)'}</code> using <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">{wizardAppName}</code> template.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <WizardFooter onCancel={() => setShowWizard(false)} onNext={handleStep1Save} isSaving={isSettingUpDb}
                                    nextLabel={isSettingUpDb ? 'Creating Database...' : 'Create Database & Continue'} nextIcon={<Database className="w-4 h-4" />} />
                            </>
                        )}

                        {/* ═══ STEP 2: Subscription Details ═══ */}
                        {wizardStep === 2 && (
                            <>
                                <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">
                                    {setupResult && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Database Created</h3>
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1"><strong>{setupResult.databaseName}</strong> on <strong>{setupResult.server}</strong></p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <CardSection title="Client Information" color="indigo">
                                        <FormField label="Client Code" name="companyUniqueCode" value={formData.companyUniqueCode || ''} onChange={handleFormChange} readOnly />
                                        <FormField label="Client Name *" name="companyName" value={formData.companyName} onChange={handleFormChange} />
                                        <FormField label="Company Code" name="companyCode" value={formData.companyCode || ''} onChange={handleFormChange} />
                                        <FormSelect label="Application Name" name="applicationName" value={formData.applicationName || ''} onChange={handleFormChange} options={APPLICATION_OPTIONS} />
                                        <FormField label="GSTIN" name="gstin" value={formData.gstin || ''} onChange={handleFormChange} />
                                    </CardSection>
                                    <CardSection title="Address" color="emerald">
                                        <div className="md:col-span-3"><FormField label="Address" name="address" value={formData.address || ''} onChange={handleFormChange} /></div>
                                        <FormField label="City" name="city" value={formData.city || ''} onChange={handleFormChange} />
                                        <FormField label="State" name="state" value={formData.state || ''} onChange={handleFormChange} />
                                        <FormField label="Country" name="country" value={formData.country || ''} onChange={handleFormChange} />
                                    </CardSection>
                                    <CardSection title="Contact Details" color="amber">
                                        <FormField label="Email" name="email" value={formData.email || ''} onChange={handleFormChange} type="email" />
                                        <FormField label="Mobile" name="mobile" value={formData.mobile || ''} onChange={handleFormChange} />
                                    </CardSection>
                                    <CardSection title="Subscription" color="purple">
                                        <FormSelect label="Status" name="subscriptionStatus" value={formData.subscriptionStatus || ''} onChange={handleFormChange} options={SUBSCRIPTION_STATUS_OPTIONS} />
                                        <FormField label="From Date" name="fromDate" value={formatDateForInput(formData.fromDate)} onChange={handleFormChange} type="date" />
                                        <FormField label="To Date" name="toDate" value={formatDateForInput(formData.toDate)} onChange={handleFormChange} type="date" />
                                        <FormField label="Payment Due Date" name="paymentDueDate" value={formatDateForInput(formData.paymentDueDate)} onChange={handleFormChange} type="date" />
                                        <FormField label="Status Description" name="statusDescription" value={formData.statusDescription || ''} onChange={handleFormChange} />
                                        <FormField label="ERP Message" name="subscriptionStatusMessage" value={formData.subscriptionStatusMessage || ''} onChange={handleFormChange} />
                                    </CardSection>
                                    <CardSection title="Login & Access" color="red">
                                        <FormField label="User ID *" name="companyUserID" value={formData.companyUserID} onChange={handleFormChange} />
                                        <FormField label="Password *" name="password" value={formData.password} onChange={handleFormChange} />
                                        <FormField label="Connection String" name="conn_String" value={formData.conn_String || ''} onChange={handleFormChange} />
                                        <FormField label="Login Allowed" name="loginAllowed" value={String(formData.loginAllowed ?? '')} onChange={handleFormChange} type="number" />
                                    </CardSection>
                                </div>
                                <WizardFooter onBack={() => setWizardStep(1)} onCancel={() => setShowWizard(false)} onNext={handleStep2Save}
                                    isSaving={isSaving} nextLabel={isSaving ? 'Saving...' : 'Save & Continue'} />
                            </>
                        )}

                        {/* ═══ STEP 3: Company Master ═══ */}
                        {wizardStep === 3 && (
                            <>
                                <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">
                                    <CardSection title="Company Details" color="indigo">
                                        <StepField label="Company ID" value={String(companyMaster.companyID)} onChange={v => setCompanyMaster(prev => ({ ...prev, companyID: parseInt(v) || 2 }))} type="number" />
                                        <StepField label="Company Name *" value={companyMaster.companyName} onChange={v => updateCompanyMaster('companyName', v)} />
                                        <StepField label="GSTIN" value={companyMaster.gstin || ''} onChange={v => updateCompanyMaster('gstin', v)} />
                                        <StepField label="PAN" value={companyMaster.pan || ''} onChange={v => updateCompanyMaster('pan', v)} />
                                        <StepField label="CIN No" value={companyMaster.cinNo || ''} onChange={v => updateCompanyMaster('cinNo', v)} />
                                        <StepField label="State TIN No" value={companyMaster.stateTinNo || ''} onChange={v => updateCompanyMaster('stateTinNo', v)} />
                                    </CardSection>
                                    <CardSection title="Address" color="emerald">
                                        <StepField label="Address 1" value={companyMaster.address1 || ''} onChange={v => updateCompanyMaster('address1', v)} />
                                        <StepField label="Address 2" value={companyMaster.address2 || ''} onChange={v => updateCompanyMaster('address2', v)} />
                                        <StepField label="Address 3" value={companyMaster.address3 || ''} onChange={v => updateCompanyMaster('address3', v)} />
                                        <StepField label="City" value={companyMaster.city || ''} onChange={v => updateCompanyMaster('city', v)} />
                                        <StepField label="State" value={companyMaster.state || ''} onChange={v => updateCompanyMaster('state', v)} />
                                        <StepField label="Country" value={companyMaster.country || ''} onChange={v => updateCompanyMaster('country', v)} />
                                        <StepField label="Pincode" value={companyMaster.pincode || ''} onChange={v => updateCompanyMaster('pincode', v)} />
                                    </CardSection>
                                    <CardSection title="Contact" color="amber">
                                        <StepField label="Contact No" value={companyMaster.contactNO || ''} onChange={v => updateCompanyMaster('contactNO', v)} />
                                        <StepField label="Mobile No" value={companyMaster.mobileNO || ''} onChange={v => updateCompanyMaster('mobileNO', v)} />
                                        <StepField label="Email" value={companyMaster.email || ''} onChange={v => updateCompanyMaster('email', v)} />
                                        <StepField label="Website" value={companyMaster.website || ''} onChange={v => updateCompanyMaster('website', v)} />
                                    </CardSection>
                                    <CardSection title="Production Unit" color="purple">
                                        <StepField label="Production Unit Name" value={companyMaster.productionUnitName || ''} onChange={v => updateCompanyMaster('productionUnitName', v)} />
                                        <div className="md:col-span-2"><StepField label="Production Unit Address" value={companyMaster.productionUnitAddress || ''} onChange={v => updateCompanyMaster('productionUnitAddress', v)} /></div>
                                    </CardSection>
                                </div>
                                <WizardFooter onBack={() => setWizardStep(2)} onCancel={() => setShowWizard(false)} onNext={handleStep3Save}
                                    isSaving={isSaving} nextLabel={isSaving ? 'Saving...' : 'Save & Continue'} />
                            </>
                        )}

                        {/* ═══ STEP 4: Branch Master ═══ */}
                        {wizardStep === 4 && (
                            <>
                                <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">
                                    <CardSection title="Branch Details" color="indigo">
                                        <StepField label="Branch ID" value={String(branchMaster.branchID)} onChange={v => setBranchMaster(prev => ({ ...prev, branchID: parseInt(v) || 1 }))} type="number" />
                                        <div className="md:col-span-2"><StepField label="Branch Name *" value={branchMaster.branchName} onChange={v => updateBranchMaster('branchName', v)} /></div>
                                    </CardSection>
                                    <CardSection title="Auto-filled Details (editable)" color="emerald">
                                        <StepField label="Mailing Name" value={branchMaster.mailingName || ''} onChange={v => updateBranchMaster('mailingName', v)} />
                                        <StepField label="Address 1" value={branchMaster.address1 || ''} onChange={v => updateBranchMaster('address1', v)} />
                                        <StepField label="Address 2" value={branchMaster.address2 || ''} onChange={v => updateBranchMaster('address2', v)} />
                                        <StepField label="City" value={branchMaster.city || ''} onChange={v => updateBranchMaster('city', v)} />
                                        <StepField label="District" value={branchMaster.district || ''} onChange={v => updateBranchMaster('district', v)} />
                                        <StepField label="State" value={branchMaster.state || ''} onChange={v => updateBranchMaster('state', v)} />
                                        <StepField label="Country" value={branchMaster.country || ''} onChange={v => updateBranchMaster('country', v)} />
                                        <StepField label="Pincode" value={branchMaster.pincode || ''} onChange={v => updateBranchMaster('pincode', v)} />
                                        <StepField label="Mobile No" value={branchMaster.mobileNo || ''} onChange={v => updateBranchMaster('mobileNo', v)} />
                                        <StepField label="Email" value={branchMaster.email || ''} onChange={v => updateBranchMaster('email', v)} />
                                        <StepField label="State TIN No" value={branchMaster.stateTinNo || ''} onChange={v => updateBranchMaster('stateTinNo', v)} />
                                        <StepField label="GSTIN" value={branchMaster.gstin || ''} onChange={v => updateBranchMaster('gstin', v)} />
                                    </CardSection>
                                </div>
                                <WizardFooter onBack={() => setWizardStep(3)} onCancel={() => setShowWizard(false)} onNext={handleStep4Save}
                                    isSaving={isSaving} nextLabel={isSaving ? 'Saving...' : 'Save & Continue'} />
                            </>
                        )}

                        {/* ═══ STEP 5: Production Unit ═══ */}
                        {wizardStep === 5 && (
                            <>
                                <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">
                                    <CardSection title="Production Unit Details" color="indigo">
                                        <div className="md:col-span-2"><StepField label="Production Unit Name *" value={productionUnit.productionUnitName} onChange={v => updateProductionUnit('productionUnitName', v)} /></div>
                                        <div className="md:col-span-3"><StepField label="Address" value={productionUnit.address || ''} onChange={v => updateProductionUnit('address', v)} /></div>
                                    </CardSection>
                                    <CardSection title="Auto-filled Details (editable)" color="emerald">
                                        <StepField label="City" value={productionUnit.city || ''} onChange={v => updateProductionUnit('city', v)} />
                                        <StepField label="State" value={productionUnit.state || ''} onChange={v => updateProductionUnit('state', v)} />
                                        <StepField label="Country" value={productionUnit.country || ''} onChange={v => updateProductionUnit('country', v)} />
                                        <StepField label="Pincode" value={productionUnit.pincode || ''} onChange={v => updateProductionUnit('pincode', v)} />
                                        <StepField label="GST No" value={productionUnit.gstNo || ''} onChange={v => updateProductionUnit('gstNo', v)} />
                                        <StepField label="PAN" value={productionUnit.pan || ''} onChange={v => updateProductionUnit('pan', v)} />
                                    </CardSection>
                                </div>
                                <WizardFooter onBack={() => setWizardStep(4)} onCancel={() => setShowWizard(false)} onNext={handleStep5Save}
                                    isSaving={isSaving} nextLabel={isSaving ? 'Finishing Setup...' : 'Save & Complete Setup'}
                                    nextIcon={<CheckCircle2 className="w-4 h-4" />} nextColor="bg-emerald-600 hover:bg-emerald-700" />
                            </>
                        )}

                        {/* ═══ STEP 6: Success Screen ═══ */}
                        {wizardStep === 6 && setupComplete && (
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <PartyPopper className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Congratulations!</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">You have successfully setup the database. The client can now login with the credentials below.</p>

                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md mx-auto mb-8">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">User ID</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">{setupComplete.companyUserID}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Password</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">{setupComplete.password}</span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => { setShowWizard(false); }}
                                    className="px-8 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ EDIT FORM (Centered Wide Modal) ═══ */}
            {showForm && (
                <>
                    <style>{`@keyframes editModalIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                         onClick={() => setShowForm(false)}>
                        <div className="w-full max-w-[1400px] mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
                             onClick={e => e.stopPropagation()}
                             style={{ animation: 'editModalIn 0.2s ease-out' }}>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <Edit2 className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">Edit Subscription</h2>
                                        <p className="text-xs text-amber-100/80">{formData.companyName} {formData.companyUniqueCode ? `(${formData.companyUniqueCode})` : ''}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors" title="Close">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Tab Bar */}
                            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2">
                                {([
                                    { id: 1 as const, label: 'Company Detail', icon: <CreditCard className="w-3.5 h-3.5" /> },
                                    { id: 2 as const, label: 'Module Settings', icon: <Settings className="w-3.5 h-3.5" /> },
                                ]).map(tab => (
                                    <button key={tab.id} onClick={() => setEditTab(tab.id)}
                                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-all rounded-t-lg ${
                                            editTab === tab.id
                                                ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-white dark:bg-gray-900'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                        }`}>
                                        {tab.icon} {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="p-6">

                                {/* Tab 1: Company Detail — All fields in one view */}
                                {editTab === 1 && (
                                    <div className="space-y-5">
                                        {/* Row 1: Client & Login */}
                                        <div>
                                            <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <CreditCard className="w-3.5 h-3.5" /> Client & Login
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <FormField label="Client Code" name="companyUniqueCode" value={formData.companyUniqueCode || ''} onChange={handleFormChange} />
                                                <FormField label="Client Name *" name="companyName" value={formData.companyName} onChange={handleFormChange} />
                                                <FormField label="User ID *" name="companyUserID" value={formData.companyUserID} onChange={handleFormChange} />
                                                <FormField label="Password" name="password" value={formData.password} onChange={handleFormChange} />
                                                <FormField label="Company Code" name="companyCode" value={formData.companyCode || ''} onChange={handleFormChange} />
                                                <FormSelect label="Application" name="applicationName" value={formData.applicationName || ''} onChange={handleFormChange} options={APPLICATION_OPTIONS} />
                                                <FormField label="Login Allowed" name="loginAllowed" value={String(formData.loginAllowed ?? '')} onChange={handleFormChange} type="number" />
                                                <FormField label="GSTIN" name="gstin" value={formData.gstin || ''} onChange={handleFormChange} />
                                            </div>
                                        </div>

                                        {/* Row 2: Address & Contact */}
                                        <div>
                                            <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Building2 className="w-3.5 h-3.5" /> Address & Contact
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="md:col-span-2">
                                                    <FormField label="Address" name="address" value={formData.address || ''} onChange={handleFormChange} />
                                                </div>
                                                <FormField label="Email" name="email" value={formData.email || ''} onChange={handleFormChange} type="email" />
                                                <FormField label="Mobile" name="mobile" value={formData.mobile || ''} onChange={handleFormChange} />
                                                <FormField label="City" name="city" value={formData.city || ''} onChange={handleFormChange} />
                                                <FormField label="State" name="state" value={formData.state || ''} onChange={handleFormChange} />
                                                <FormField label="Country" name="country" value={formData.country || ''} onChange={handleFormChange} />
                                            </div>
                                        </div>

                                        {/* Row 3: Subscription */}
                                        <div>
                                            <h3 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Subscription
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <FormSelect label="Status" name="subscriptionStatus" value={formData.subscriptionStatus || ''} onChange={handleFormChange} options={SUBSCRIPTION_STATUS_OPTIONS} />
                                                <FormField label="From Date" name="fromDate" value={formatDateForInput(formData.fromDate)} onChange={handleFormChange} type="date" />
                                                <FormField label="To Date" name="toDate" value={formatDateForInput(formData.toDate)} onChange={handleFormChange} type="date" />
                                                <FormField label="Payment Due" name="paymentDueDate" value={formatDateForInput(formData.paymentDueDate)} onChange={handleFormChange} type="date" />
                                                <div className="md:col-span-2">
                                                    <FormTextArea label="Status Description" name="statusDescription" value={formData.statusDescription || ''} onChange={handleFormChange} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <FormTextArea label="ERP Message" name="subscriptionStatusMessage" value={formData.subscriptionStatusMessage || ''} onChange={handleFormChange} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 2: Module Settings */}
                                {editTab === 2 && (
                                    <div className="flex flex-col" style={{ minHeight: '520px' }}>
                                        {/* Custom grid header styles */}
                                        <style>{`
                                            .module-grid .ag-header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px 8px 0 0; }
                                            .module-grid .ag-header-cell-label { color: #fff; font-weight: 700; font-size: 13px; letter-spacing: 0.3px; }
                                            .module-grid .ag-header-cell { border-right: 1px solid rgba(255,255,255,0.15); }
                                            .module-grid .ag-icon { color: #fff !important; }
                                            .module-grid .ag-row { font-size: 13px; }
                                            .module-grid .ag-row-even { background: #fffbeb; }
                                            .module-grid .ag-row:hover { background: #fef3c7 !important; }
                                            .module-grid .ag-paging-panel { font-size: 12px; font-weight: 500; }
                                        `}</style>

                                        {/* Search Bar + Copy As */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="relative flex-1 max-w-sm">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input type="text" placeholder="Search modules..."
                                                    value={moduleSearch} onChange={e => setModuleSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm" />
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                                                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                                                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                                    {moduleData.filter(r => r.status).length} <span className="font-normal text-gray-500 dark:text-gray-400">/ {moduleData.length} active</span>
                                                </span>
                                            </div>
                                            <div className="ml-auto">
                                                <button onClick={handleOpenCopyModal}
                                                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                                                    <Copy className="w-4 h-4" /> Copy As
                                                </button>
                                            </div>
                                        </div>

                                        {/* Grid or Loader */}
                                        {isModuleLoading ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                                <span className="ml-3 text-sm text-gray-500">Loading modules...</span>
                                            </div>
                                        ) : !formData.conn_String ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                                <Settings className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                                                <p className="text-sm text-gray-500 dark:text-gray-400">No connection string available for this subscription.</p>
                                            </div>
                                        ) : (
                                            <div className="ag-theme-quartz module-grid rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" style={{ height: 460, width: '100%' }}>
                                                <AgGridReact
                                                    ref={moduleGridRef}
                                                    rowData={filteredModuleData}
                                                    columnDefs={moduleColDefs}
                                                    defaultColDef={{ resizable: true }}
                                                    pagination={true}
                                                    paginationPageSize={500}
                                                    paginationPageSizeSelector={[500, 1000, 2000]}
                                                    animateRows={true}
                                                    getRowId={(params) => params.data.moduleName}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>

                            {/* Footer - Dynamic buttons based on tab */}
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                                <button onClick={() => setShowForm(false)}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <X className="w-4 h-4" /> Close
                                </button>
                                {editTab === 1 && (
                                    <button onClick={handleFormSubmit} disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-sm">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                                {editTab === 2 && formData.conn_String && (
                                    <button onClick={handleSaveModuleSettings} disabled={isModuleSaving}
                                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-sm">
                                        {isModuleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {isModuleSaving ? 'Saving...' : 'Save Module'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ═══ Copy As Modal ═══ */}
            {showCopyModal && (
                <>
                    <style>{`@keyframes copyModalIn { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                         onClick={() => setShowCopyModal(false)}>
                        <div className="w-full max-w-[560px] mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
                             onClick={e => e.stopPropagation()}
                             style={{ animation: 'copyModalIn 0.2s ease-out' }}>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <Copy className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">Copy Modules To Another Client</h2>
                                        <p className="text-xs text-indigo-200/80">Source: {formData.companyName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCopyModal(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors" title="Close">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Client Name *</label>

                                {isClientListLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                        <span className="ml-2 text-sm text-gray-500">Loading clients...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Searchable input */}
                                        <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input type="text" placeholder="Search clients..."
                                                value={copyClientSearch} onChange={e => setCopyClientSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                        </div>

                                        {/* Client list */}
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden" style={{ maxHeight: 280 }}>
                                            <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                                                {filteredClientList.length === 0 ? (
                                                    <div className="py-8 text-center text-sm text-gray-400">No clients found</div>
                                                ) : filteredClientList.map(client => (
                                                    <div key={client.companyUserID}
                                                        onClick={() => setCopyTargetUserID(client.companyUserID)}
                                                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors ${
                                                            copyTargetUserID === client.companyUserID
                                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-l-indigo-500'
                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-l-transparent'
                                                        }`}>
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{client.companyName}</span>
                                                            <span className="ml-2 text-xs text-gray-400">({client.companyUserID})</span>
                                                        </div>
                                                        {copyTargetUserID === client.companyUserID && (
                                                            <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {copyTargetUserID && (
                                            <div className="mt-3 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                                                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                                    <strong>Selected:</strong> {clientList.find(c => c.companyUserID === copyTargetUserID)?.companyName} ({copyTargetUserID})
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                                <button onClick={() => setShowCopyModal(false)}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <X className="w-4 h-4" /> Close
                                </button>
                                <button onClick={handleCopyModules} disabled={isCopying || !copyTargetUserID}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm">
                                    {isCopying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isCopying ? 'Copying...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Delete</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete the subscription for <strong>{selectedRow?.companyName}</strong>? This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Reusable Components ───────────────────────────────────────────────

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";
const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

interface FormFieldProps {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string; placeholder?: string; readOnly?: boolean;
}
const FormField: React.FC<FormFieldProps> = ({ label, name, value, onChange, type = 'text', placeholder, readOnly }) => (
    <div>
        <label className={labelCls}>{label}</label>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder || label.replace(' *', '')}
            readOnly={readOnly}
            className={`${inputCls}${readOnly ? ' bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''}`} />
    </div>
);

interface FormTextAreaProps {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
}
const FormTextArea: React.FC<FormTextAreaProps> = ({ label, name, value, onChange, placeholder }) => (
    <div>
        <label className={labelCls}>{label}</label>
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder || label}
            rows={3}
            className={`${inputCls} resize-none`}
            style={{ minHeight: '80px', maxHeight: '120px' }} />
    </div>
);

interface FormSelectProps {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: string[];
}
const FormSelect: React.FC<FormSelectProps> = ({ label, name, value, onChange, options }) => (
    <div>
        <label className={labelCls}>{label}</label>
        <select name={name} value={value} onChange={onChange} className={inputCls}>
            <option value="">-- Select --</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

// Step field (controlled by value/onChange string)
interface StepFieldProps {
    label: string; value: string; onChange: (v: string) => void; type?: string;
}
const StepField: React.FC<StepFieldProps> = ({ label, value, onChange, type = 'text' }) => (
    <div>
        <label className={labelCls}>{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={label.replace(' *', '')} className={inputCls} />
    </div>
);

// Card Section wrapper
const colorMap: Record<string, string> = {
    indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    purple: 'text-purple-600 dark:text-purple-400',
    red: 'text-red-600 dark:text-red-400',
};
const CardSection: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${colorMap[color] || colorMap.indigo}`}>{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
    </div>
);

// Wizard Footer
interface WizardFooterProps {
    onBack?: () => void; onCancel: () => void; onNext: () => void;
    isSaving: boolean; nextLabel: string; nextIcon?: React.ReactNode;
    nextColor?: string;
}
const WizardFooter: React.FC<WizardFooterProps> = ({ onBack, onCancel, onNext, isSaving, nextLabel, nextIcon, nextColor }) => (
    <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
        <div>
            {onBack && (
                <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            )}
        </div>
        <div className="flex items-center gap-3">
            <button onClick={onCancel} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={onNext} disabled={isSaving}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${nextColor || 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (nextIcon || <ChevronRight className="w-4 h-4" />)}
                {nextLabel}
            </button>
        </div>
    </div>
);

export default CompanySubscription;
