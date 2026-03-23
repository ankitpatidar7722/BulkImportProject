import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    CreditCard, Plus, Edit2, Trash2, Save, X, Loader2, RefreshCw,
    Database, Server, ChevronRight, ArrowLeft, CheckCircle2, Building2,
    GitBranch, Factory, PartyPopper, Settings, Copy, Search, Layers
} from 'lucide-react';
import {
    getCompanySubscriptions,
    createCompanySubscription,
    updateCompanySubscription,
    deleteCompanySubscription,
    getServers,
    getBackupDatabases,
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
    getModuleGroups,
    getModuleGroupModules,
    getAvailableModulesForGroup,
    createModuleGroup,
    applyModuleGroupToClient,
    checkModulesExist,
    getCompanySubscriptionByKey,
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
    ModuleGroupModuleRow,
} from '../services/api';
import { useMessageModal } from '../components/MessageModal';

import DataGrid, {
    Column,
    Paging,
    Pager,
    SearchPanel,
    FilterRow,
    HeaderFilter,
    Grouping,
    GroupPanel,
    Sorting,
    ColumnChooser,
} from 'devextreme-react/data-grid';
import 'devextreme/dist/css/dx.light.css';

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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editTab, setEditTab] = useState<1 | 2 | 3>(1);

    // ─── Module Settings State ───
    const [moduleData, setModuleData] = useState<ModuleSettingsRow[]>([]);
    const [moduleOriginal, setModuleOriginal] = useState<ModuleSettingsRow[]>([]);
    const [isModuleLoading, setIsModuleLoading] = useState(false);
    const [isModuleSaving, setIsModuleSaving] = useState(false);

    // ─── Copy As State ───
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [clientList, setClientList] = useState<ClientDropdownItem[]>([]);
    const [copyTargetUserID, setCopyTargetUserID] = useState('');
    const [copyClientSearch, setCopyClientSearch] = useState('');
    const [isCopying, setIsCopying] = useState(false);
    const [isClientListLoading, setIsClientListLoading] = useState(false);

    // ─── Module Group Authority State ───
    const [groupAppName, setGroupAppName] = useState<string>('estimoprime');
    const [moduleGroups, setModuleGroups] = useState<string[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [groupModules, setGroupModules] = useState<ModuleGroupModuleRow[]>([]);
    const [isLoadingGroupModules, setIsLoadingGroupModules] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupApp, setNewGroupApp] = useState('estimoprime');
    const [availableModules, setAvailableModules] = useState<ModuleGroupModuleRow[]>([]);
    const [selectedModulesForGroup, setSelectedModulesForGroup] = useState<Set<string>>(new Set());
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // ─── Wizard State ───
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState<WizardStepNum>(1);
    const [maxWizardStep, setMaxWizardStep] = useState<WizardStepNum>(1);
    const [isStep2Saved, setIsStep2Saved] = useState(false);
    const [step2SavedUserId, setStep2SavedUserId] = useState<string>('');
    const [serverList, setServerList] = useState<string[]>([]);
    const [wizardServer, setWizardServer] = useState('');
    const [wizardAppName, setWizardAppName] = useState('estimoprime');
    const [wizardBackupType, setWizardBackupType] = useState('Offset');
    const [wizardClientName, setWizardClientName] = useState('');
    const [wizardDbName, setWizardDbName] = useState('');
    const [wizardDbNameEdited, setWizardDbNameEdited] = useState(false);
    const [wizardBackupDatabase, setWizardBackupDatabase] = useState('');
    const [backupDatabaseList, setBackupDatabaseList] = useState<string[]>([]);
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

    // Fetch dynamic backup databases when application name changes
    useEffect(() => {
        if (wizardAppName) {
            getBackupDatabases(wizardAppName).then(res => {
                if (res.success && res.databases) {
                    setBackupDatabaseList(res.databases);
                } else {
                    setBackupDatabaseList([]);
                }
                setWizardBackupDatabase('');
            }).catch(err => {
                console.error('Failed to get backup databases', err);
                setBackupDatabaseList([]);
                setWizardBackupDatabase('');
            });
        }
    }, [wizardAppName]);

    // ─── Wizard Handlers ───

    const handleCreate = async () => {
        setWizardStep(1);
        setMaxWizardStep(1);
        setIsStep2Saved(false);
        setStep2SavedUserId('');
        setWizardServer(''); setWizardAppName('estimoprime'); setWizardBackupType('Offset'); setWizardClientName('');
        setWizardDbName(''); setWizardDbNameEdited(false); setSetupResult(null);
        setWizardBackupDatabase('');
        setBackupDatabaseList([]);
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
        if (!wizardBackupType) { showMessage('error', 'Validation', 'Please select a backup type.'); return; }
        if (!wizardClientName.trim()) { showMessage('error', 'Validation', 'Client Name is required.'); return; }
        if (!wizardDbName.trim()) { showMessage('error', 'Validation', 'Database Name is required.'); return; }
        if (!wizardBackupDatabase) { showMessage('error', 'Validation', 'Please select a Backup Database Name.'); return; }

        if (setupResult && setupResult.databaseName === wizardDbName.trim()) {
            setWizardStep(2);
            setMaxWizardStep(Math.max(maxWizardStep, 2) as WizardStepNum);
            return;
        }

        setIsSettingUpDb(true);
        try {
            const req: SetupDatabaseRequest = {
                server: wizardServer, applicationName: wizardAppName,
                backupType: wizardBackupType,
                clientName: wizardClientName.trim(), databaseName: wizardDbName.trim(),
                backupDatabaseName: wizardBackupDatabase,
            };
            const result = await setupDatabase(req);
            if (result.success) {
                setSetupResult(result);
                setFormData(prev => ({
                    ...EMPTY_FORM,
                    companyUniqueCode: prev.companyUniqueCode,
                    maxCompanyUniqueCode: prev.maxCompanyUniqueCode,
                    conn_String: result.connectionString,
                    applicationName: result.applicationName,
                    companyName: result.clientName,
                }));
                setWizardStep(2);
                setMaxWizardStep(Math.max(maxWizardStep, 2) as WizardStepNum);
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
        if (!formData.companyName.trim()) { showMessage('error', 'Validation', 'Client Name is required.'); return; }
        if (!formData.applicationName?.trim()) { showMessage('error', 'Validation', 'Application Name is required.'); return; }
        if (!formData.gstin?.trim()) { showMessage('error', 'Validation', 'GSTIN is required.'); return; }
        if (!formData.address?.trim()) { showMessage('error', 'Validation', 'Address is required.'); return; }
        if (!formData.city?.trim()) { showMessage('error', 'Validation', 'City is required.'); return; }
        if (!formData.state?.trim()) { showMessage('error', 'Validation', 'State is required.'); return; }
        if (!formData.country?.trim()) { showMessage('error', 'Validation', 'Country is required.'); return; }
        if (!formData.email?.trim()) { showMessage('error', 'Validation', 'Email is required.'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { showMessage('error', 'Validation', 'Please enter a valid email.'); return; }
        if (!formData.mobile?.trim()) { showMessage('error', 'Validation', 'Mobile is required.'); return; }
        if (!/^\d+$/.test(formData.mobile)) { showMessage('error', 'Validation', 'Mobile must be numeric.'); return; }
        if (!formData.subscriptionStatus?.trim()) { showMessage('error', 'Validation', 'Status is required.'); return; }
        if (!formData.companyUserID.trim()) { showMessage('error', 'Validation', 'User ID is required.'); return; }
        if (/\s/.test(formData.companyUserID)) { showMessage('error', 'Validation', 'User ID must not contain spaces.'); return; }
        if (!formData.password.trim()) { showMessage('error', 'Validation', 'Password is required.'); return; }
        if (/\s/.test(formData.password)) { showMessage('error', 'Validation', 'Password must not contain spaces.'); return; }

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
            let response;
            if (isStep2Saved && step2SavedUserId) {
                payload.originalCompanyUserID = step2SavedUserId;
                response = await updateCompanySubscription(payload);
            } else {
                response = await createCompanySubscription(payload);
            }
            if (response.success) {
                showMessage('success', isStep2Saved ? 'Updated' : 'Created', isStep2Saved ? 'Subscription record updated successfully.' : 'Subscription record created successfully.');
                setIsStep2Saved(true);
                setStep2SavedUserId(formData.companyUserID);
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
                setMaxWizardStep(Math.max(maxWizardStep, 3) as WizardStepNum);
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
                setMaxWizardStep(Math.max(maxWizardStep, 4) as WizardStepNum);
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
                setMaxWizardStep(Math.max(maxWizardStep, 5) as WizardStepNum);
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
                setMaxWizardStep(Math.max(maxWizardStep, 6) as WizardStepNum);
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
            // Fetch target client's details to get connection string
            const targetClientRes = await getCompanySubscriptionByKey(copyTargetUserID);
            if (!targetClientRes.success || !targetClientRes.data?.conn_String) {
                showMessage('error', 'Error', 'Target client connection string not found.');
                setIsCopying(false);
                return;
            }

            // Check if target client already has modules
            const checkRes = await checkModulesExist(targetClientRes.data.conn_String);

            if (checkRes.hasModules) {
                // Show warning confirmation
                const confirmed = window.confirm(
                    `⚠️ Warning: Target client already has ${checkRes.moduleCount} module(s).\n\n` +
                    `Are you sure you want to delete the existing modules and add new modules?\n\n` +
                    `Click OK to proceed or Cancel to abort.`
                );

                if (!confirmed) {
                    setIsCopying(false);
                    return;
                }
            }

            // Proceed with copy
            const res = await copyModules(formData.conn_String, copyTargetUserID);
            if (res.success) {
                showMessage('success', 'Copied', res.message);
                setShowCopyModal(false);
            } else {
                showMessage('error', 'Copy Failed', res.message);
            }
        } catch (err: any) {
            showMessage('error', 'Error', err?.response?.data?.message || 'Failed to copy modules.');
        } finally {
            setIsCopying(false);
        }
    };

    const filteredClientList = useMemo(() => {
        if (!copyClientSearch.trim()) return clientList;
        const q = copyClientSearch.toLowerCase();
        return clientList.filter(c => c.companyName.toLowerCase().includes(q) || c.companyUserID.toLowerCase().includes(q));
    }, [clientList, copyClientSearch]);

    // ─── Module Group Authority Handlers ───
    const loadModuleGroups = useCallback(async (appName: string) => {
        try {
            const res = await getModuleGroups(appName);
            if (res.success) {
                setModuleGroups(res.data);
            }
        } catch {
            showMessage('error', 'Error', 'Failed to load module groups.');
        }
    }, [showMessage]);

    const handleLoadGroupModules = async () => {
        if (!selectedGroup) return;
        setIsLoadingGroupModules(true);
        try {
            const res = await getModuleGroupModules(groupAppName, selectedGroup);
            if (res.success) {
                setGroupModules(res.data);
            } else {
                showMessage('error', 'Load Failed', res.message);
            }
        } catch {
            showMessage('error', 'Error', 'Failed to load group modules.');
        } finally {
            setIsLoadingGroupModules(false);
        }
    };

    const handleApplyModuleGroupToClient = async () => {
        if (!selectedGroup) {
            showMessage('info', 'Required', 'Please select a Module Group.');
            return;
        }
        if (!formData.conn_String) {
            showMessage('error', 'Error', 'Client connection string is missing.');
            return;
        }
        if (groupModules.length === 0) {
            showMessage('info', 'Required', 'Please load modules first by clicking "Load Module".');
            return;
        }

        setIsModuleSaving(true);
        try {
            // Check if client database already has modules
            const checkRes = await checkModulesExist(formData.conn_String);

            if (checkRes.hasModules) {
                // Show warning confirmation
                const confirmed = window.confirm(
                    `⚠️ Warning: This client database already has ${checkRes.moduleCount} module(s).\n\n` +
                    `Are you sure you want to delete the existing modules and add new modules from "${selectedGroup}"?\n\n` +
                    `Click OK to proceed or Cancel to abort.`
                );

                if (!confirmed) {
                    setIsModuleSaving(false);
                    return;
                }
            }

            // Proceed with apply
            const res = await applyModuleGroupToClient({
                applicationName: groupAppName,
                moduleGroupName: selectedGroup,
                connectionString: formData.conn_String
            });

            if (res.success) {
                showMessage('success', 'Applied Successfully', res.message);
            } else {
                showMessage('error', 'Apply Failed', res.message);
            }
        } catch (err: any) {
            showMessage('error', 'Error', err?.response?.data?.message || 'Failed to apply module group to client database.');
        } finally {
            setIsModuleSaving(false);
        }
    };

    const handleOpenCreateGroupModal = async () => {
        setShowCreateGroupModal(true);
        setNewGroupName('');
        setSelectedModulesForGroup(new Set());
        // Load available modules
        try {
            const res = await getAvailableModulesForGroup(newGroupApp);
            if (res.success) {
                setAvailableModules(res.data);
            }
        } catch {
            showMessage('error', 'Error', 'Failed to load available modules.');
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            showMessage('info', 'Required', 'Please enter a Module Group Name.');
            return;
        }
        if (selectedModulesForGroup.size === 0) {
            showMessage('info', 'Required', 'Please select at least one module.');
            return;
        }
        setIsCreatingGroup(true);
        try {
            const res = await createModuleGroup({
                applicationName: newGroupApp,
                moduleGroupName: newGroupName.trim(),
                selectedModuleNames: Array.from(selectedModulesForGroup)
            });
            if (res.success) {
                showMessage('success', 'Created', res.message);
                setShowCreateGroupModal(false);
                // Reload groups
                await loadModuleGroups(groupAppName);
            } else {
                showMessage('error', 'Create Failed', res.message);
            }
        } catch {
            showMessage('error', 'Error', 'Failed to create module group.');
        } finally {
            setIsCreatingGroup(false);
        }
    };

    // Load module groups when application changes (Tab 3)
    useEffect(() => {
        if (editTab === 3) {
            loadModuleGroups(groupAppName);
        }
    }, [groupAppName, editTab, loadModuleGroups]);

    // Load available modules when newGroupApp changes in Create Group modal
    useEffect(() => {
        if (showCreateGroupModal) {
            const loadAvailableModules = async () => {
                try {
                    const res = await getAvailableModulesForGroup(newGroupApp);
                    if (res.success) {
                        setAvailableModules(res.data);
                    }
                } catch {
                    // Silent fail
                }
            };
            loadAvailableModules();
        }
    }, [newGroupApp, showCreateGroupModal]);

    // Load module settings when switching to Module Settings tab
    useEffect(() => {
        if (showForm && editTab === 2 && formData.applicationName && formData.conn_String) {
            loadModuleSettings();
        }
    }, [showForm, editTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── DevExtreme cell renderers for Module Settings ───
    const moduleStatusCellRender = useCallback((cellData: any) => {
        const row = cellData.data as ModuleSettingsRow;
        if (!row) return null;
        return (
            <div className="flex items-center justify-center">
                <input type="checkbox" checked={row.status} readOnly
                    onClick={() => handleModuleStatusToggle(row.moduleName)}
                    className="w-5 h-5 cursor-pointer" style={{ accentColor: '#f59e0b' }} />
            </div>
        );
    }, [handleModuleStatusToggle]);

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
        if (!formData.companyUserID.trim()) { showMessage('error', 'Validation', 'Company Login Name is required.'); return; }
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
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden gap-3 p-1 w-full max-w-full">
            {ModalRenderer}

            {/* Page Header - Fixed */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800 px-5 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Company Subscription</h1>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{data.length} records</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} disabled={isLoading}
                        className="flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150 disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button onClick={handleCreate}
                        className="flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-150 shadow-sm hover:shadow-md shadow-indigo-600/20">
                        <Plus className="w-3.5 h-3.5" /> Create
                    </button>
                    <button onClick={handleEdit}
                        className="flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-all duration-150 shadow-sm hover:shadow-md shadow-amber-500/20">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={handleDelete}
                        className="flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all duration-150 shadow-sm hover:shadow-md shadow-red-500/20">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                </div>
            </div>

            {/* Main DataGrid - fills remaining space, scroll stays inside */}
            <div className="flex-1 min-h-0 min-w-0 bg-white dark:bg-gray-900/60 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <DataGrid
                    dataSource={data}
                    keyExpr="companyUserID"
                    showBorders={true}
                    showRowLines={true}
                    showColumnLines={true}
                    rowAlternationEnabled={true}
                    hoverStateEnabled={true}
                    columnAutoWidth={true}
                    wordWrapEnabled={false}
                    allowColumnResizing={true}
                    columnResizingMode="widget"
                    onRowClick={(e: any) => { if (e.data) setSelectedRow(e.data); }}
                    onRowDblClick={(e: any) => { if (e.data) handleRowDoubleClick(e); }}
                    height="100%"
                    focusedRowEnabled={true}
                >
                    <Sorting mode="multiple" />
                    <Paging defaultPageSize={100} />
                    <Pager showPageSizeSelector={true} allowedPageSizes={[100, 500, 1000, 2000]} showInfo={true} showNavigationButtons={true} displayMode="full" />
                    <SearchPanel visible={true} width={280} placeholder="Search..." highlightSearchText={true} />
                    <FilterRow visible={true} />
                    <HeaderFilter visible={true} />
                    <Grouping autoExpandAll={false} contextMenuEnabled={true} expandMode="rowClick" />
                    <GroupPanel visible={true} emptyPanelText="Drag a column header here to group" />
                    <ColumnChooser enabled={true} mode="select" />

                    <Column caption="#" width={50} alignment="center" allowFiltering={false} allowSorting={false} allowGrouping={false} allowResizing={false}
                        cellRender={(cellData: any) => <span className="text-gray-400 font-mono text-xs">{cellData.rowIndex + 1}</span>} />
                    <Column dataField="companyUniqueCode" caption="Client Code" />
                    <Column dataField="subscriptionStatus" caption="Status"
                        cellRender={(cellData: any) => {
                            const val = cellData.value;
                            if (val === 'Active') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Active</span>;
                            if (val === 'Expired') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Expired</span>;
                            return <span>{val || ''}</span>;
                        }} />
                    <Column dataField="companyName" caption="Client Name" />
                    <Column dataField="applicationName" caption="Application" />
                    <Column dataField="address" caption="Client Address" />
                    <Column dataField="city" caption="City" />
                    <Column dataField="state" caption="State" />
                    <Column dataField="country" caption="Country" />
                    <Column dataField="companyCode" caption="Company Code" />
                    <Column dataField="companyUserID" caption="Company Login Name" />
                    <Column dataField="fromDate" caption="From Date" dataType="date" format="dd/MM/yyyy" />
                    <Column dataField="toDate" caption="To Date" dataType="date" format="dd/MM/yyyy" />
                    <Column dataField="paymentDueDate" caption="Payment Due" dataType="date" format="dd/MM/yyyy" />
                    <Column dataField="loginAllowed" caption="Login Allowed" dataType="number" />
                    <Column dataField="gstin" caption="GSTIN" />
                    <Column dataField="email" caption="Email" />
                    <Column dataField="mobile" caption="Mobile" />
                    <Column dataField="statusDescription" caption="Status Description" />
                    <Column dataField="subscriptionStatusMessage" caption="ERP Message" />
                </DataGrid>
            </div>

            {/* ═══════════════ FULL SETUP WIZARD ═══════════════ */}
            {showWizard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-800">
                        {/* Wizard Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 rounded-t-2xl">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                    {wizardStep === 6 ? <PartyPopper className="w-3.5 h-3.5 text-white" /> :
                                        React.createElement(WIZARD_STEPS[(wizardStep as number) - 1]?.icon || Database, { className: 'w-3.5 h-3.5 text-white' })}
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white tracking-tight">Complete Company Setup</h2>
                                    <p className="text-[10px] text-indigo-200/80 font-medium">{getStepSubtitle(wizardStep)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Step Progress Indicators */}
                                <div className="hidden md:flex items-center gap-1">
                                    {WIZARD_STEPS.map((s, i) => {
                                        const isCompleted = wizardStep > s.num;
                                        const isCurrent = wizardStep === s.num;
                                        const isAllowed = s.num <= maxWizardStep;
                                        return (
                                        <React.Fragment key={s.num}>
                                            {i > 0 && <div className={`w-5 h-0.5 rounded-full transition-all duration-300 ${isCompleted ? 'bg-white/70' : 'bg-white/15'}`} />}
                                            <button 
                                                onClick={() => isAllowed && setWizardStep(s.num as WizardStepNum)}
                                                disabled={!isAllowed}
                                                className={`group flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold transition-all duration-300 ${
                                                    isCurrent ? 'bg-white text-indigo-600 shadow-lg shadow-white/20 scale-105' :
                                                    isAllowed ? 'bg-white/20 text-white hover:bg-white/30 cursor-pointer' : 
                                                    'bg-white/10 text-white/50 cursor-not-allowed'
                                                }`}>
                                                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-black/10">
                                                    {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : s.num}
                                                </div>
                                                <span className="hidden lg:block whitespace-nowrap">{s.label}</span>
                                                <span className="lg:hidden">{s.num}</span>
                                            </button>
                                        </React.Fragment>
                                    )})}
                                </div>
                            </div>
                        </div>

                        {/* ═══ STEP 1: Database Setup ═══ */}
                        {wizardStep === 1 && (
                            <>
                                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                                    <div className="bg-indigo-50/60 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/40 rounded-lg px-3 py-2.5">
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-800/40 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Server className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-[12px] font-semibold text-indigo-800 dark:text-indigo-300">Database Setup</h3>
                                                <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/70 mt-0.5 leading-relaxed">Select a server, application type, and client name. A new database will be created from the template.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-3 py-2.5">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <h3 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Database Configuration</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2">
                                            <div className="space-y-1">
                                                <label className={labelCls}>Server *</label>
                                                <input type="text" list="server-list" value={wizardServer} onChange={e => setWizardServer(e.target.value)}
                                                    placeholder="Enter or select server (e.g. 13.200.122.70,1433)"
                                                    className={inputCls} />
                                                <datalist id="server-list">{serverList.map(s => <option key={s} value={s} />)}</datalist>
                                            </div>
                                            <div className="space-y-1">
                                                <label className={labelCls}>Application Name *</label>
                                                <select value={wizardAppName} onChange={e => { setWizardAppName(e.target.value); setWizardDbNameEdited(false); }}
                                                    className={`${inputCls} cursor-pointer`}>
                                                    {APPLICATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className={labelCls}>Backup Type *</label>
                                                <select value={wizardBackupType} onChange={e => setWizardBackupType(e.target.value)}
                                                    className={`${inputCls} cursor-pointer`}>
                                                    {['Offset', 'Flexo', 'Rotogravure'].map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className={labelCls}>Client Name *</label>
                                                <input type="text" value={wizardClientName} onChange={e => { setWizardClientName(e.target.value); if (wizardDbNameEdited) setWizardDbNameEdited(false); }}
                                                    placeholder="Enter client name" className={inputCls} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className={labelCls}>Database Name * <span className="ml-1 text-[10px] text-gray-400 font-normal normal-case">(auto-generated)</span></label>
                                                <input type="text" value={wizardDbName} onChange={e => { setWizardDbName(e.target.value); setWizardDbNameEdited(true); }}
                                                    placeholder="Database name" className={inputCls} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className={labelCls}>Backup Database Name</label>
                                                <input 
                                                    type="text" 
                                                    list="backup-db-list" 
                                                    value={wizardBackupDatabase} 
                                                    onChange={e => setWizardBackupDatabase(e.target.value)}
                                                    placeholder={backupDatabaseList.length === 0 ? "No backup database available" : "Select or type Database..."}
                                                    className={inputCls} 
                                                    disabled={backupDatabaseList.length === 0}
                                                />
                                                <datalist id="backup-db-list">
                                                    {backupDatabaseList.filter(db => db !== 'Select Database...').map(db => (
                                                        <option key={db} value={db} />
                                                    ))}
                                                </datalist>
                                            </div>
                                        </div>
                                        {wizardDbName && (
                                            <div className="mt-2.5 px-2.5 py-2 bg-indigo-50/60 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/40">
                                                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                                                    <strong>Preview:</strong> Database <code className="bg-indigo-100 dark:bg-indigo-800/50 px-1.5 py-0.5 rounded text-[11px] font-mono">{wizardDbName}</code> on <code className="bg-indigo-100 dark:bg-indigo-800/50 px-1.5 py-0.5 rounded text-[11px] font-mono">{wizardServer || '(select server)'}</code> restored from <code className="bg-indigo-100 dark:bg-indigo-800/50 px-1.5 py-0.5 rounded text-[11px] font-mono">{wizardBackupDatabase || '(select backup DB)'}</code>.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <WizardFooter onCancel={() => setShowWizard(false)} onNext={handleStep1Save} isSaving={isSettingUpDb}
                                    disableNext={!wizardBackupDatabase}
                                    nextLabel={isSettingUpDb ? 'Creating Database...' : 'Create Database & Continue'} nextIcon={<Database className="w-4 h-4" />} />
                            </>
                        )}

                        {/* ═══ STEP 2: Subscription Details ═══ */}
                        {wizardStep === 2 && (
                            <>
                                <div className="p-4 space-y-3">
                                    {/* DB Created Banner */}
                                    {setupResult && (
                                        <div className="flex items-center gap-2 bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40 rounded-lg px-3 py-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">DB: <strong>{setupResult.databaseName}</strong> on <strong>{setupResult.server}</strong></span>
                                        </div>
                                    )}

                                    {/* ── Row 1: Client Info (4 cols) ── */}
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Client Information</h3>
                                        </div>
                                        <div className="grid grid-cols-4 gap-x-3 gap-y-1.5">
                                            <FormField label="Client Code" name="companyUniqueCode" value={formData.companyUniqueCode || ''} onChange={handleFormChange} readOnly />
                                            <FormField label="Client Name *" name="companyName" value={formData.companyName} onChange={handleFormChange} />
                                            <FormField label="Company Code" name="companyCode" value={formData.companyCode || ''} onChange={handleFormChange} />
                                            <FormSelect label="Application Name *" name="applicationName" value={formData.applicationName || ''} onChange={handleFormChange} options={APPLICATION_OPTIONS} />
                                        </div>
                                    </div>

                                    {/* ── Row 2: Address + Contact (4 cols) ── */}
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Address & Contact</h3>
                                        </div>
                                        <div className="grid grid-cols-4 gap-x-3 gap-y-1.5">
                                            <FormField label="GSTIN *" name="gstin" value={formData.gstin || ''} onChange={handleFormChange} />
                                            <div className="col-span-3"><FormField label="Address *" name="address" value={formData.address || ''} onChange={handleFormChange} /></div>
                                            <FormField label="City *" name="city" value={formData.city || ''} onChange={handleFormChange} />
                                            <FormField label="State *" name="state" value={formData.state || ''} onChange={handleFormChange} />
                                            <FormField label="Country *" name="country" value={formData.country || ''} onChange={handleFormChange} />
                                            <FormField label="Email *" name="email" value={formData.email || ''} onChange={handleFormChange} type="email" />
                                            <FormField label="Mobile *" name="mobile" value={formData.mobile || ''} onChange={handleFormChange} />
                                        </div>
                                    </div>

                                    {/* ── Row 3: Subscription (4 cols) ── */}
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Subscription</h3>
                                        </div>
                                        <div className="grid grid-cols-4 gap-x-3 gap-y-1.5">
                                            <FormSelect label="Status *" name="subscriptionStatus" value={formData.subscriptionStatus || ''} onChange={handleFormChange} options={SUBSCRIPTION_STATUS_OPTIONS} />
                                            <FormField label="From Date" name="fromDate" value={formatDateForInput(formData.fromDate)} onChange={handleFormChange} type="date" />
                                            <FormField label="To Date" name="toDate" value={formatDateForInput(formData.toDate)} onChange={handleFormChange} type="date" />
                                            <FormField label="Payment Due Date" name="paymentDueDate" value={formatDateForInput(formData.paymentDueDate)} onChange={handleFormChange} type="date" />
                                            <FormField label="Status Description" name="statusDescription" value={formData.statusDescription || ''} onChange={handleFormChange} />
                                            <FormField label="ERP Message" name="subscriptionStatusMessage" value={formData.subscriptionStatusMessage || ''} onChange={handleFormChange} />
                                        </div>
                                    </div>

                                    {/* ── Row 4: Login & Access (4 cols) ── */}
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Login & Access</h3>
                                        </div>
                                        <div className="grid grid-cols-4 gap-x-3 gap-y-1.5">
                                            <FormField label="Company Login Name *" name="companyUserID" value={formData.companyUserID} onChange={handleFormChange} />
                                            <FormField label="Password *" name="password" value={formData.password} onChange={handleFormChange} />
                                            <FormField label="Connection String" name="conn_String" value={formData.conn_String || ''} onChange={handleFormChange} readOnly />
                                            <FormField label="Login Allowed" name="loginAllowed" value={String(formData.loginAllowed ?? '')} onChange={handleFormChange} type="number" />
                                        </div>
                                    </div>
                                </div>
                                <WizardFooter onBack={() => setWizardStep(1)} onCancel={() => setShowWizard(false)} onNext={handleStep2Save}
                                    isSaving={isSaving} nextLabel={isSaving ? 'Saving...' : 'Save & Continue'} />
                            </>
                        )}

                        {/* ═══ STEP 3: Company Master ═══ */}
                        {wizardStep === 3 && (
                            <>
                                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
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
                                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
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
                                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
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
                            <div className="flex-1 min-h-0 p-8 text-center">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                                    <PartyPopper className="w-7 h-7 text-white" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 tracking-tight">Congratulations!</h2>
                                <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">Setup complete. The client can now login with the credentials below.</p>

                                <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/50 p-4 max-w-sm mx-auto mb-5 relative">
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Company Name</span>
                                            <span className="text-[13px] font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wide">{companyMaster.companyName || formData.companyName}</span>
                                        </div>
                                        <div className="h-px bg-gray-200 dark:bg-gray-700" />
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Company Login Name</span>
                                            <span className="text-[12px] font-bold text-gray-900 dark:text-white bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">{setupComplete.companyUserID}</span>
                                        </div>
                                        <div className="h-px bg-gray-200 dark:bg-gray-700" />
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Password</span>
                                            <span className="text-[12px] font-bold text-gray-900 dark:text-white bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-lg pt-1 pb-1">{"*".repeat(setupComplete.password.length || 6)}</span>
                                        </div>
                                        {setupComplete.userName !== undefined && (
                                            <>
                                                <div className="h-px bg-gray-200 dark:bg-gray-700" />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">User Name</span>
                                                    <span className="text-[12px] font-bold text-gray-900 dark:text-white bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">{setupComplete.userName || 'Admin'}</span>
                                                </div>
                                                <div className="h-px bg-gray-200 dark:bg-gray-700" />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Password</span>
                                                    <span className="text-[12px] font-bold text-gray-900 dark:text-white bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-lg pt-1 pb-1">{"*".repeat((setupComplete.userPassword || '').length || 6)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-center">
                                        <button 
                                            onClick={() => {
                                                const text = `Company Name: ${companyMaster.companyName || formData.companyName}\nCompany Login Name: ${setupComplete.companyUserID}\nPassword: ${setupComplete.password}\nUser Name: ${setupComplete.userName || 'Admin'}\nPassword: ${setupComplete.userPassword || ''}`;
                                                navigator.clipboard.writeText(text);
                                                showMessage('success', 'Copied', 'Credentials copied successfully');
                                            }}
                                            className="flex items-center gap-1.5 h-8 px-4 text-[12px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-lg transition-all"
                                        >
                                            <Copy className="w-3.5 h-3.5" /> Copy Credentials
                                        </button>
                                    </div>
                                </div>

                                <button onClick={() => { setShowWizard(false); }}
                                    className="h-9 px-8 text-[13px] font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-150 shadow-sm hover:shadow-md">
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
                    <style>{`@keyframes editModalIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowForm(false)}>
                        <div className="w-full max-w-6xl mx-4 max-h-[92vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800"
                            onClick={e => e.stopPropagation()}
                            style={{ animation: 'editModalIn 0.2s ease-out' }}>

                            {/* Header */}
                            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 rounded-t-2xl">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <Edit2 className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-white tracking-tight">Edit Subscription</h2>
                                        <p className="text-[10px] text-amber-100/70 font-medium">{formData.companyName} {formData.companyUniqueCode ? `(${formData.companyUniqueCode})` : ''}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/15 transition-all duration-150" title="Close">
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>

                            {/* Tab Bar */}
                            <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/30 px-3">
                                {([
                                    { id: 1 as const, label: 'Company Detail', icon: <CreditCard className="w-3.5 h-3.5" /> },
                                    { id: 2 as const, label: 'Module Settings', icon: <Settings className="w-3.5 h-3.5" /> },
                                    { id: 3 as const, label: 'Module Group Authority', icon: <Layers className="w-3.5 h-3.5" /> },
                                ]).map(tab => (
                                    <button key={tab.id} onClick={() => setEditTab(tab.id)}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-all duration-150 ${editTab === tab.id
                                                ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-white dark:bg-gray-900'
                                                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                                            }`}>
                                        {tab.icon} {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content — scrollable */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-4">

                                {/* Tab 1: Company Detail — All fields in one view */}
                                {editTab === 1 && (
                                    <div className="space-y-3">
                                        {/* Row 1: Client & Login */}
                                        <div className="rounded-lg border border-indigo-100 dark:border-indigo-800/30 bg-white dark:bg-gray-900/30 px-3 py-2.5">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                <h3 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Client & Login</h3>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
                                                <FormField label="Client Code" name="companyUniqueCode" value={formData.companyUniqueCode || ''} onChange={handleFormChange} />
                                                <FormField label="Client Name *" name="companyName" value={formData.companyName} onChange={handleFormChange} />
                                                <FormField label="Company Login Name *" name="companyUserID" value={formData.companyUserID} onChange={handleFormChange} />
                                                <FormField label="Password" name="password" value={formData.password} onChange={handleFormChange} />
                                                <FormField label="Company Code" name="companyCode" value={formData.companyCode || ''} onChange={handleFormChange} />
                                                <FormSelect label="Application" name="applicationName" value={formData.applicationName || ''} onChange={handleFormChange} options={APPLICATION_OPTIONS} />
                                                <FormField label="Login Allowed" name="loginAllowed" value={String(formData.loginAllowed ?? '')} onChange={handleFormChange} type="number" />
                                                <FormField label="GSTIN" name="gstin" value={formData.gstin || ''} onChange={handleFormChange} />
                                            </div>
                                        </div>

                                        {/* Row 2: Address & Contact */}
                                        <div className="rounded-lg border border-emerald-100 dark:border-emerald-800/30 bg-white dark:bg-gray-900/30 px-3 py-2.5">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <h3 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Address & Contact</h3>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
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
                                        <div className="rounded-lg border border-purple-100 dark:border-purple-800/30 bg-white dark:bg-gray-900/30 px-3 py-2.5">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                <h3 className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Subscription</h3>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
                                                <FormSelect label="Status" name="subscriptionStatus" value={formData.subscriptionStatus || ''} onChange={handleFormChange} options={SUBSCRIPTION_STATUS_OPTIONS} />
                                                <FormField label="From Date" name="fromDate" value={formatDateForInput(formData.fromDate)} onChange={handleFormChange} type="date" />
                                                <FormField label="To Date" name="toDate" value={formatDateForInput(formData.toDate)} onChange={handleFormChange} type="date" />
                                                <FormField label="Payment Due" name="paymentDueDate" value={formatDateForInput(formData.paymentDueDate)} onChange={handleFormChange} type="date" />
                                                <div className="md:col-span-2">
                                                    <FormTextArea label="Status Description" name="statusDescription" value={formData.statusDescription || ''} onChange={handleFormChange} rows={2} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <FormTextArea label="ERP Message" name="subscriptionStatusMessage" value={formData.subscriptionStatusMessage || ''} onChange={handleFormChange} rows={2} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 2: Module Settings */}
                                {editTab === 2 && (
                                    <div className="flex flex-col" style={{ minHeight: '520px' }}>
                                        {/* Stats Bar + Copy As */}
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <div className="flex items-center gap-1.5 px-3 h-9 bg-amber-50/80 dark:bg-amber-900/15 border border-amber-200/80 dark:border-amber-700/40 rounded-lg">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                                                <span className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">
                                                    {moduleData.filter(r => r.status).length}<span className="font-normal text-gray-400 dark:text-gray-500">/{moduleData.length}</span>
                                                </span>
                                            </div>
                                            <div className="ml-auto">
                                                <button onClick={handleOpenCopyModal}
                                                    className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-150 shadow-sm hover:shadow-md shadow-indigo-600/20">
                                                    <Copy className="w-3.5 h-3.5" /> Copy As
                                                </button>
                                            </div>
                                        </div>

                                        {/* Grid or Loader */}
                                        {isModuleLoading ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                                                <span className="ml-2.5 text-[13px] text-gray-400">Loading modules...</span>
                                            </div>
                                        ) : !formData.conn_String ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                                <Settings className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                                                <p className="text-[13px] text-gray-400 dark:text-gray-500">No connection string available for this subscription.</p>
                                            </div>
                                        ) : (
                                            <DataGrid
                                                dataSource={moduleData}
                                                keyExpr="moduleName"
                                                showBorders={false}
                                                showRowLines={true}
                                                showColumnLines={false}
                                                rowAlternationEnabled={true}
                                                hoverStateEnabled={true}
                                                columnAutoWidth={true}
                                                height={460}
                                            >
                                                <Sorting mode="multiple" />
                                                <Paging defaultPageSize={500} />
                                                <Pager showPageSizeSelector={true} allowedPageSizes={[500, 1000, 2000]} showInfo={true} showNavigationButtons={true} displayMode="full" />
                                                <SearchPanel visible={true} width={250} placeholder="Search modules..." highlightSearchText={true} />
                                                <FilterRow visible={true} />
                                                <HeaderFilter visible={true} />

                                                <Column dataField="moduleHeadName" caption="Module Head Name" minWidth={250} />
                                                <Column dataField="moduleDisplayName" caption="Module Display Name" minWidth={250} />
                                                <Column caption="Status" width={120} alignment="center" allowFiltering={false} allowSorting={false}
                                                    cellRender={moduleStatusCellRender} />
                                            </DataGrid>
                                        )}
                                    </div>
                                )}

                                {/* Tab 3: Module Group Authority */}
                                {editTab === 3 && (
                                    <div className="space-y-3">
                                        {/* Top Controls */}
                                        <div className="flex items-center gap-3">
                                            {/* Application Name Dropdown */}
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                                    Application Name
                                                </label>
                                                <select
                                                    value={groupAppName}
                                                    onChange={(e) => setGroupAppName(e.target.value)}
                                                    className="w-full h-9 px-2.5 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="estimoprime">Estimoprime</option>
                                                    <option value="PrintudeERP">PrintudeERP</option>
                                                    <option value="MultiUnit">MultiUnit</option>
                                                </select>
                                            </div>

                                            {/* Module Group Dropdown */}
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                                    Module Group
                                                </label>
                                                <select
                                                    value={selectedGroup}
                                                    onChange={(e) => setSelectedGroup(e.target.value)}
                                                    className="w-full h-9 px-2.5 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                                    disabled={moduleGroups.length === 0}
                                                >
                                                    <option value="">Select Module Group</option>
                                                    {moduleGroups.map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Load Module Button */}
                                            <div className="pt-5">
                                                <button
                                                    onClick={handleLoadGroupModules}
                                                    disabled={!selectedGroup || isLoadingGroupModules}
                                                    className="h-9 px-4 text-[13px] font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md shadow-indigo-600/20"
                                                >
                                                    {isLoadingGroupModules ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Load Module'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Grid Section */}
                                        {isLoadingGroupModules ? (
                                            <div className="flex items-center justify-center py-20">
                                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                                <span className="ml-2.5 text-[13px] text-gray-400">Loading modules...</span>
                                            </div>
                                        ) : groupModules.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <Layers className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
                                                <p className="text-[13px] text-gray-400 dark:text-gray-500">Select a Module Group and click "Load Module" to view modules.</p>
                                            </div>
                                        ) : (
                                            <DataGrid
                                                dataSource={groupModules}
                                                keyExpr="moduleDisplayName"
                                                showBorders={true}
                                                showRowLines={true}
                                                showColumnLines={true}
                                                rowAlternationEnabled={true}
                                                hoverStateEnabled={true}
                                                columnAutoWidth={true}
                                                wordWrapEnabled={false}
                                                allowColumnResizing={true}
                                                columnResizingMode="widget"
                                                height={500}
                                            >
                                                <Sorting mode="multiple" />
                                                <Paging defaultPageSize={1000} />
                                                <Pager showPageSizeSelector={true} allowedPageSizes={[1000, 2000, 5000]} showInfo={true} />
                                                <SearchPanel visible={true} width={240} placeholder="Search..." />
                                                <FilterRow visible={true} />
                                                <HeaderFilter visible={true} />

                                                <Column dataField="moduleHeadName" caption="Module Head Name" />
                                                <Column dataField="moduleDisplayName" caption="Module Display Name" />
                                            </DataGrid>
                                        )}
                                    </div>
                                )}

                            </div>

                            {/* Footer - Dynamic buttons based on tab */}
                            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/30 rounded-b-2xl">
                                <button onClick={() => setShowForm(false)}
                                    className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150">
                                    <X className="w-3.5 h-3.5" /> Close
                                </button>
                                {editTab === 1 && (
                                    <button onClick={handleFormSubmit} disabled={isSaving}
                                        className="flex items-center gap-1.5 h-9 px-5 text-[13px] font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md shadow-amber-500/20">
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                                {editTab === 2 && formData.conn_String && (
                                    <button onClick={handleSaveModuleSettings} disabled={isModuleSaving}
                                        className="flex items-center gap-1.5 h-9 px-5 text-[13px] font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md shadow-amber-500/20">
                                        {isModuleSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        {isModuleSaving ? 'Saving...' : 'Save Module'}
                                    </button>
                                )}
                                {editTab === 3 && formData.conn_String && (
                                    <button onClick={handleApplyModuleGroupToClient} disabled={isModuleSaving || !selectedGroup || groupModules.length === 0}
                                        className="flex items-center gap-1.5 h-9 px-5 text-[13px] font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md shadow-indigo-600/20">
                                        {isModuleSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        {isModuleSaving ? 'Applying...' : 'Apply to Client'}
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
                    <style>{`@keyframes copyModalIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowCopyModal(false)}>
                        <div className="w-full max-w-[520px] mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800"
                            onClick={e => e.stopPropagation()}
                            style={{ animation: 'copyModalIn 0.2s ease-out' }}>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <Copy className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white tracking-tight">Copy Modules</h2>
                                        <p className="text-[11px] text-indigo-200/70 font-medium">Source: {formData.companyName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCopyModal(false)} className="p-1.5 rounded-lg hover:bg-white/15 transition-all duration-150" title="Close">
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5">
                                <label className={labelCls}>Target Client *</label>

                                {isClientListLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                        <span className="ml-2 text-[13px] text-gray-400">Loading clients...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Searchable input */}
                                        <div className="relative mb-3 mt-2">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                            <input type="text" placeholder="Search clients..."
                                                value={copyClientSearch} onChange={e => setCopyClientSearch(e.target.value)}
                                                className="w-full h-9 pl-9 pr-3 text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-150" />
                                        </div>

                                        {/* Client list */}
                                        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden" style={{ maxHeight: 260 }}>
                                            <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
                                                {filteredClientList.length === 0 ? (
                                                    <div className="py-8 text-center text-[13px] text-gray-400">No clients found</div>
                                                ) : filteredClientList.map(client => {
                                                    const isSelected = copyTargetUserID === client.companyUserID;
                                                    return (
                                                        <div key={client.companyUserID}
                                                            onClick={() => setCopyTargetUserID(client.companyUserID)}
                                                            className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b last:border-b-0 transition-all duration-150 ${isSelected
                                                                    ? 'bg-indigo-600 text-white border-b-indigo-700'
                                                                    : 'border-b-gray-100 dark:border-b-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                                                }`}>
                                                            <div>
                                                                <span className={`text-[13px] font-medium ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>{client.companyName}</span>
                                                                <span className={`ml-2 text-[11px] ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>({client.companyUserID})</span>
                                                            </div>
                                                            {isSelected && (
                                                                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {copyTargetUserID && (
                                            <div className="mt-3 px-3 py-2 bg-indigo-50/60 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/40 rounded-lg">
                                                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                                                    <strong>Selected:</strong> {clientList.find(c => c.companyUserID === copyTargetUserID)?.companyName} ({copyTargetUserID})
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/30 rounded-b-2xl">
                                <button onClick={() => setShowCopyModal(false)}
                                    className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150">
                                    <X className="w-3.5 h-3.5" /> Close
                                </button>
                                <button onClick={handleCopyModules} disabled={isCopying || !copyTargetUserID}
                                    className="flex items-center gap-1.5 h-9 px-5 text-[13px] font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md shadow-indigo-600/20">
                                    {isCopying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {isCopying ? 'Copying...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <>
                    <style>{`@keyframes deleteModalIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm mx-4 border border-gray-100 dark:border-gray-800 overflow-hidden"
                            style={{ animation: 'deleteModalIn 0.2s ease-out' }}>
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">Delete Subscription</h3>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">Are you sure you want to delete <strong className="text-gray-700 dark:text-gray-200">{selectedRow?.companyName}</strong>? This action cannot be undone.</p>
                            </div>
                            <div className="flex items-center gap-2.5 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/30">
                                <button onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 h-9 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150">
                                    Cancel
                                </button>
                                <button onClick={confirmDelete}
                                    className="flex-1 h-9 text-[13px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all duration-150 shadow-sm hover:shadow-md shadow-red-500/20">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Create Module Group Modal */}
            {showCreateGroupModal && (
                <>
                    <style>{`@keyframes groupModalIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowCreateGroupModal(false)}>
                        <div className="w-full max-w-3xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800"
                            onClick={e => e.stopPropagation()}
                            style={{ animation: 'groupModalIn 0.2s ease-out', maxHeight: '90vh' }}>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <Layers className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="text-base font-bold text-white tracking-tight">Create Module Group</h3>
                                </div>
                                <button onClick={() => setShowCreateGroupModal(false)}
                                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all backdrop-blur-sm">
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                                {/* Form Fields */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {/* Application Name */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                            Application Name <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={newGroupApp}
                                            onChange={(e) => setNewGroupApp(e.target.value)}
                                            className="w-full h-9 px-2.5 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="estimoprime">Estimoprime</option>
                                            <option value="PrintudeERP">PrintudeERP</option>
                                            <option value="MultiUnit">MultiUnit</option>
                                        </select>
                                    </div>

                                    {/* Module Group Name */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                            Module Group Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="Enter group name"
                                            className="w-full h-9 px-2.5 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Module Selection Grid */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        Select Modules <span className="text-red-500">*</span>
                                    </label>
                                    {availableModules.length === 0 ? (
                                        <div className="flex items-center justify-center py-12 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                            <span className="ml-2 text-[13px] text-gray-400">Loading modules...</span>
                                        </div>
                                    ) : (
                                        <DataGrid
                                            dataSource={availableModules}
                                            keyExpr="moduleDisplayName"
                                            showBorders={true}
                                            showRowLines={true}
                                            showColumnLines={true}
                                            rowAlternationEnabled={true}
                                            hoverStateEnabled={true}
                                            columnAutoWidth={true}
                                            height={400}
                                            selectedRowKeys={Array.from(selectedModulesForGroup)}
                                            onSelectionChanged={(e: any) => {
                                                const selected = new Set(e.selectedRowKeys as string[]);
                                                setSelectedModulesForGroup(selected);
                                            }}
                                        >
                                            <Sorting mode="multiple" />
                                            <Paging defaultPageSize={1000} />
                                            <SearchPanel visible={true} width={240} placeholder="Search modules..." />
                                            <FilterRow visible={true} />
                                            <HeaderFilter visible={true} />

                                            <Column type="selection" width={50} />
                                            <Column dataField="moduleHeadName" caption="Module Head Name" />
                                            <Column dataField="moduleDisplayName" caption="Module Display Name" />
                                        </DataGrid>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/30 rounded-b-2xl">
                                <button onClick={() => setShowCreateGroupModal(false)}
                                    disabled={isCreatingGroup}
                                    className="h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150 disabled:opacity-50">
                                    <X className="w-3.5 h-3.5 inline mr-1" /> Cancel
                                </button>
                                <button
                                    onClick={handleCreateGroup}
                                    disabled={!newGroupName.trim() || selectedModulesForGroup.size === 0 || isCreatingGroup}
                                    className="h-9 px-4 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md shadow-emerald-600/20">
                                    {isCreatingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : <Save className="w-3.5 h-3.5 inline mr-1" />}
                                    {isCreatingGroup ? 'Creating...' : 'Create Group'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Design System ────────────────────────────────────────────────────
// Unified design tokens for consistency across all components

const inputCls = "w-full h-9 px-3 text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-150";
const labelCls = "block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5";

// ─── Reusable Components ──────────────────────────────────────────────

interface FormFieldProps {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string; placeholder?: string; readOnly?: boolean;
}
const FormField: React.FC<FormFieldProps> = ({ label, name, value, onChange, type = 'text', placeholder, readOnly }) => (
    <div className="space-y-1">
        <label className={labelCls}>{label}</label>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder || label.replace(' *', '')}
            readOnly={readOnly}
            className={`${inputCls}${readOnly ? ' !bg-gray-50 dark:!bg-gray-800/60 !text-gray-400 dark:!text-gray-500 cursor-not-allowed !border-dashed' : ''}`} />
    </div>
);

interface FormTextAreaProps {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string; rows?: number;
}
const FormTextArea: React.FC<FormTextAreaProps> = ({ label, name, value, onChange, placeholder, rows = 2 }) => (
    <div className="space-y-1">
        <label className={labelCls}>{label}</label>
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder || label}
            rows={rows}
            className={`${inputCls} !h-auto resize-none`}
            style={{ minHeight: '56px', maxHeight: '90px' }} />
    </div>
);

interface FormSelectProps {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: string[];
}
const FormSelect: React.FC<FormSelectProps> = ({ label, name, value, onChange, options }) => (
    <div className="space-y-1">
        <label className={labelCls}>{label}</label>
        <select name={name} value={value} onChange={onChange} className={`${inputCls} cursor-pointer`}>
            <option value="">Select...</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

// Step field (controlled by value/onChange string)
interface StepFieldProps {
    label: string; value: string; onChange: (v: string) => void; type?: string;
}
const StepField: React.FC<StepFieldProps> = ({ label, value, onChange, type = 'text' }) => (
    <div className="space-y-1">
        <label className={labelCls}>{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={label.replace(' *', '')} className={inputCls} />
    </div>
);

// Card Section wrapper
const sectionColorMap: Record<string, { text: string; border: string; dot: string }> = {
    indigo: { text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500' },
    emerald: { text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
    amber: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
    purple: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
    red: { text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
};
const CardSection: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => {
    const c = sectionColorMap[color] || sectionColorMap.indigo;
    return (
        <div className={`rounded-lg border ${c.border} bg-white dark:bg-gray-900/50 px-3 py-2.5`}>
            <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                <h3 className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>{title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">{children}</div>
        </div>
    );
};

// Wizard Footer
interface WizardFooterProps {
    onBack?: () => void; onCancel: () => void; onNext: () => void;
    isSaving: boolean; nextLabel: string; nextIcon?: React.ReactNode;
    nextColor?: string; disableNext?: boolean;
}
const WizardFooter: React.FC<WizardFooterProps> = ({ onBack, onCancel, onNext, isSaving, nextLabel, nextIcon, nextColor, disableNext }) => (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 rounded-b-2xl">
        <div>
            {onBack && (
                <button onClick={onBack} className="flex items-center gap-2 h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
            )}
        </div>
        <div className="flex items-center gap-2.5">
            <button onClick={onCancel} className="flex items-center gap-2 h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150">
                <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={onNext} disabled={isSaving || disableNext}
                className={`flex items-center gap-2 h-9 px-5 text-[13px] font-semibold text-white rounded-lg transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md ${nextColor || 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (nextIcon || <ChevronRight className="w-3.5 h-3.5" />)}
                {nextLabel}
            </button>
        </div>
    </div>
);

export default CompanySubscription;
