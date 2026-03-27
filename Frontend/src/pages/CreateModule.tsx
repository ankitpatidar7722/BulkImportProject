import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getIndusModuleNames,
    getIndusModuleInfo,
    getModuleSystemDefaults,
    checkModuleExists,
    checkDisplayOrderExists,
    createModule,
    updateModule,
    ModuleDto,
} from '../services/api';
import { useMessageModal } from '../components/MessageModal';

// ─── Types ─────────────────────────────────────────────────────────
interface FormState {
    moduleName: string;
    moduleDisplayName: string;
    moduleHeadName: string;
    moduleHeadDisplayName: string;
    moduleHeadDisplayOrder: string;
    moduleDisplayOrder: string;
    setGroupIndex: string;
    printDocumentWebPage: string;
    printDocumentName: string;
    printDocumentWebPage1: string;
    printDocumentName1: string;
    companyID: string;
    userID: string;
    fYear: string;
}

interface FieldErrors {
    moduleName?: string;
    moduleHeadDisplayOrder?: string;
    moduleDisplayOrder?: string;
    setGroupIndex?: string;
}

const initialForm: FormState = {
    moduleName: '',
    moduleDisplayName: '',
    moduleHeadName: '',
    moduleHeadDisplayName: '',
    moduleHeadDisplayOrder: '',
    moduleDisplayOrder: '',
    setGroupIndex: '',
    printDocumentWebPage: '',
    printDocumentName: '',
    printDocumentWebPage1: '',
    printDocumentName1: '',
    companyID: '',
    userID: '',
    fYear: '',
};

// ─── Helpers ────────────────────────────────────────────────────────
function SectionCard({ icon, title, subtitle, children }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <div className="cm-section-card">
            <div className="cm-section-header">
                <div className="cm-section-icon">{icon}</div>
                <div>
                    <h3 className="cm-section-title">{title}</h3>
                    <p className="cm-section-subtitle">{subtitle}</p>
                </div>
            </div>
            <div className="cm-section-body">{children}</div>
        </div>
    );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
    return <div className="cm-field-group">{children}</div>;
}

function FormField({
    id, label, required, readOnly, error, hint, children,
}: {
    id: string;
    label: string;
    required?: boolean;
    readOnly?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="cm-field">
            <label htmlFor={id} className="cm-label">
                {label}
                {required && <span className="cm-required">*</span>}
                {readOnly && <span className="cm-readonly-badge">Auto</span>}
            </label>
            {children}
            {error && (
                <p className="cm-field-error" role="alert">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                    </svg>
                    {error}
                </p>
            )}
            {hint && !error && <p className="cm-field-hint">{hint}</p>}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────
const CreateModule: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showMessage, ModalRenderer } = useMessageModal();

    // Check if we are in edit mode
    const editData = location.state?.moduleData as ModuleDto | undefined;
    const isEditMode = !!editData;

    // Form state
    const [form, setForm] = useState<FormState>(() => {
        if (editData) {
            return {
                moduleName: editData.moduleName || '',
                moduleDisplayName: editData.moduleDisplayName || '',
                moduleHeadName: editData.moduleHeadName || '',
                moduleHeadDisplayName: editData.moduleHeadDisplayName || '',
                moduleHeadDisplayOrder: editData.moduleHeadDisplayOrder != null ? String(editData.moduleHeadDisplayOrder) : '',
                moduleDisplayOrder: editData.moduleDisplayOrder != null ? String(editData.moduleDisplayOrder) : '',
                setGroupIndex: editData.setGroupIndex != null ? String(editData.setGroupIndex) : '',
                printDocumentWebPage: editData.printDocumentWebPage || '',
                printDocumentName: editData.printDocumentName || '',
                printDocumentWebPage1: editData.printDocumentWebPage1 || '',
                printDocumentName1: editData.printDocumentName1 || '',
                companyID: editData.companyID != null ? String(editData.companyID) : '',
                userID: editData.userID != null ? String(editData.userID) : '',
                fYear: editData.fYear || '',
            };
        }
        return initialForm;
    });

    const [errors, setErrors] = useState<FieldErrors>({});
    const [isSetGroupLocked, setIsSetGroupLocked] = useState(isEditMode && form.setGroupIndex !== '');

    // Module name dropdown
    const [moduleNames, setModuleNames] = useState<string[]>([]);
    const [searchText, setSearchText] = useState(form.moduleName || '');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [moduleNamesLoading, setModuleNamesLoading] = useState(false);

    // Loading states
    const [autoFillLoading, setAutoFillLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Validation debounce refs
    const moduleNameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const orderCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ── On mount: load Indus module names + system defaults ──────────
    useEffect(() => {
        loadIndusModuleNames();
        if (!isEditMode) {
            loadSystemDefaults();
        }
    }, [isEditMode]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const loadIndusModuleNames = async () => {
        setModuleNamesLoading(true);
        try {
            const names = await getIndusModuleNames();
            setModuleNames(names);
        } catch {
            // silent – user can still type manually
        } finally {
            setModuleNamesLoading(false);
        }
    };

    const loadSystemDefaults = async () => {
        try {
            const defaults = await getModuleSystemDefaults();
            setForm(prev => ({
                ...prev,
                companyID: String(defaults.companyID || ''),
                userID: String(defaults.userID || ''),
                fYear: defaults.fYear || '',
            }));
        } catch {
            // Use today's financial year as fallback
            const now = new Date();
            const fYear = now.getMonth() >= 3
                ? `${now.getFullYear()}-${now.getFullYear() + 1}`
                : `${now.getFullYear() - 1}-${now.getFullYear()}`;
            setForm(prev => ({ ...prev, fYear }));
        }
    };

    // ── Smart auto-fill when module name is selected ─────────────────
    const handleModuleNameSelect = async (name: string) => {
        setSearchText(name);
        setDropdownOpen(false);
        setForm(prev => ({ ...prev, moduleName: name }));
        setErrors(prev => ({ ...prev, moduleName: undefined }));

        setAutoFillLoading(true);
        try {
            const info = await getIndusModuleInfo(name);
            const suggestedOrder = info.suggestedHeadDisplayOrder ?? 1;

            setForm(prev => ({
                ...prev,
                moduleName: info.moduleName,
                moduleDisplayName: info.moduleDisplayName ?? '',
                moduleHeadName: info.moduleHeadName ?? '',
                moduleHeadDisplayName: info.moduleHeadDisplayName ?? '',
                setGroupIndex: info.setGroupIndex != null ? String(info.setGroupIndex) : prev.setGroupIndex,
                moduleHeadDisplayOrder: String(suggestedOrder),
                moduleDisplayOrder: String(suggestedOrder),
            }));

            setIsSetGroupLocked(info.setGroupIndex != null);

            // Real-time check: does this module already exist?
            triggerModuleExistsCheck(name);
        } catch {
            // Info not found – clear auto-fill fields
            setForm(prev => ({
                ...prev,
                moduleName: name,
                moduleDisplayName: '',
                moduleHeadName: '',
                moduleHeadDisplayName: '',
            }));
            setIsSetGroupLocked(false);
        } finally {
            setAutoFillLoading(false);
        }
    };

    const triggerModuleExistsCheck = useCallback((name: string) => {
        if (moduleNameCheckTimer.current) clearTimeout(moduleNameCheckTimer.current);
        moduleNameCheckTimer.current = setTimeout(async () => {
            if (!name.trim()) return;
            try {
                // If editing and didn't change the name, don't flag as already exists
                if (isEditMode && editData?.moduleName === name.trim()) {
                    setErrors(prev => ({ ...prev, moduleName: undefined }));
                    return;
                }

                const exists = await checkModuleExists(name);
                if (exists) {
                    setErrors(prev => ({ ...prev, moduleName: 'Module already exists in this database.' }));
                } else {
                    setErrors(prev => ({ ...prev, moduleName: undefined }));
                }
            } catch { /* ignore */ }
        }, 600);
    }, []);

    const triggerOrderCheck = useCallback((order: string, setGroupIndex: string) => {
        if (orderCheckTimer.current) clearTimeout(orderCheckTimer.current);
        orderCheckTimer.current = setTimeout(async () => {
            const o = parseInt(order);
            const sg = parseInt(setGroupIndex);
            if (isNaN(o) || isNaN(sg)) return;
            try {
                // If editing and same order/group index unchanged, skip existing check
                if (isEditMode && editData?.moduleHeadDisplayOrder === o && editData?.setGroupIndex === sg) {
                    setErrors(prev => ({ ...prev, moduleHeadDisplayOrder: undefined }));
                    return;
                }

                const exists = await checkDisplayOrderExists(o, sg);
                if (exists) {
                    setErrors(prev => ({
                        ...prev,
                        moduleHeadDisplayOrder: 'Display order already used — existing entries will be shifted by +1 on save.',
                    }));
                } else {
                    setErrors(prev => ({ ...prev, moduleHeadDisplayOrder: undefined }));
                }
            } catch { /* ignore */ }
        }, 600);
    }, []);

    // ── Generic field change handler ─────────────────────────────────
    const handleChange = (field: keyof FormState, value: string) => {
        setForm(prev => {
            const updated = { ...prev, [field]: value };

            // Mirror display order
            if (field === 'moduleHeadDisplayOrder') {
                updated.moduleDisplayOrder = value;
            }

            // Trigger order conflict check
            if (field === 'moduleHeadDisplayOrder' || field === 'setGroupIndex') {
                triggerOrderCheck(
                    field === 'moduleHeadDisplayOrder' ? value : updated.moduleHeadDisplayOrder,
                    field === 'setGroupIndex' ? value : updated.setGroupIndex,
                );
            }

            // Trigger module name check on manual entry
            if (field === 'moduleName') {
                setSearchText(value);
                triggerModuleExistsCheck(value);
            }

            return updated;
        });
    };

    // ── Filtered suggestions ─────────────────────────────────────────
    const filteredNames = moduleNames.filter(n =>
        n.toLowerCase().includes(searchText.toLowerCase())
    ).slice(0, 50);

    // ── Validation ───────────────────────────────────────────────────
    const validate = (): boolean => {
        const newErrors: FieldErrors = {};

        if (!form.moduleName.trim()) {
            newErrors.moduleName = 'Module Name is required.';
        }
        if (!form.setGroupIndex) {
            newErrors.setGroupIndex = 'Group Index is required.';
        } else if (isNaN(parseInt(form.setGroupIndex))) {
            newErrors.setGroupIndex = 'Must be a valid number.';
        }
        if (!form.moduleHeadDisplayOrder) {
            newErrors.moduleHeadDisplayOrder = 'Display Order is required.';
        } else if (isNaN(parseInt(form.moduleHeadDisplayOrder))) {
            newErrors.moduleHeadDisplayOrder = 'Must be a valid number.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ── Save ─────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!validate()) return;

        // Warn if module already exists but let user confirm
        if (errors.moduleName?.includes('already exists')) {
            showMessage('warning', 'Module Already Exists', 
                `A module named "${form.moduleName}" already exists in the database. Do you want to continue?`, {
                onConfirm: () => doSave(),
                confirmLabel: 'Continue',
                cancelLabel: 'Go Back',
            });
            return;
        }

        await doSave();
    };

    const doSave = async () => {
        setSaving(true);
        try {
            const payload: ModuleDto = {
                moduleId: editData?.moduleId || 0,
                moduleName: form.moduleName.trim(),
                moduleDisplayName: form.moduleDisplayName.trim() || form.moduleName.trim(),
                moduleHeadName: form.moduleHeadName.trim() || undefined,
                moduleHeadDisplayName: form.moduleHeadDisplayName.trim() || undefined,
                moduleHeadDisplayOrder: form.moduleHeadDisplayOrder ? parseInt(form.moduleHeadDisplayOrder) : undefined,
                moduleDisplayOrder: form.moduleDisplayOrder ? parseInt(form.moduleDisplayOrder) : undefined,
                setGroupIndex: form.setGroupIndex ? parseInt(form.setGroupIndex) : undefined,
                printDocumentWebPage: form.printDocumentWebPage.trim() || undefined,
                printDocumentName: form.printDocumentName.trim() || undefined,
                printDocumentWebPage1: form.printDocumentWebPage1.trim() || undefined,
                printDocumentName1: form.printDocumentName1.trim() || undefined,
                companyID: form.companyID ? parseInt(form.companyID) : undefined,
                userID: form.userID ? parseInt(form.userID) : undefined,
                fYear: form.fYear.trim() || undefined,
            };

            if (isEditMode) {
                await updateModule(payload);
                showMessage('success', 'Module Updated!',
                    `"${form.moduleName}" has been successfully updated.`,
                    { onConfirm: () => navigate('/module-authority'), okLabel: 'View Modules' }
                );
            } else {
                await createModule(payload);
                showMessage('success', 'Module Created!',
                    `"${form.moduleName}" has been successfully added to the system.\n\nDisplay Order: ${form.moduleHeadDisplayOrder || 'Auto'}\nGroup Index: ${form.setGroupIndex || 'New'}`,
                    { onConfirm: () => navigate('/module-authority'), okLabel: 'View Modules' }
                );
                handleReset();
            }
        } catch (err: any) {
            showMessage('error', 'Save Failed',
                err?.response?.data?.error || 'An unexpected error occurred. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setForm(prev => ({
            ...initialForm,
            companyID: prev.companyID,
            userID: prev.userID,
            fYear: prev.fYear,
        }));
        setSearchText('');
        setErrors({});
        setIsSetGroupLocked(false);
    };

    // ── Render ───────────────────────────────────────────────────────
    return (
        <>
            {ModalRenderer}
            <style>{cssStyles}</style>

            <div className="cm-page">
                {/* Page Header */}
                <div className="cm-page-header">
                    <button className="cm-back-btn" onClick={() => navigate('/module-authority')} title="Back to Module Authority">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 12H5M5 12l7 7M5 12l7-7" />
                        </svg>
                    </button>
                    <div>
                        <div className="cm-breadcrumb">Module Authority &rsaquo; {isEditMode ? 'Edit Module' : 'Create Module'}</div>
                        <h1 className="cm-page-title">{isEditMode ? 'Edit Module' : 'Create New Module'}</h1>
                        <p className="cm-page-desc">
                            {isEditMode 
                                ? 'Modify existing module properties for the system.'
                                : 'Add a new module to the system by selecting from the Indus Enterprise database.'
                            }
                        </p>
                    </div>
                    <div className="cm-header-badge">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                        </svg>
                        {isEditMode ? 'Edit Mode' : 'New Module'}
                    </div>
                </div>

                {/* Auto-fill loading bar */}
                {autoFillLoading && <div className="cm-loading-bar"><div className="cm-loading-bar-inner" /></div>}

                <div className="cm-form-container">

                    {/* ── Section 1: Module Information ───────────────── */}
                    <SectionCard
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 9h6M9 12h6M9 15h4" /></svg>}
                        title="Module Information"
                        subtitle="Core identity fields — select a module to auto-fill related details"
                    >
                        <FieldGroup>
                            {/* Module Name Dropdown */}
                            <FormField
                                id="moduleName"
                                label="Module Name"
                                required
                                error={errors.moduleName}
                                hint="Search and select from IndusEnterpriseDemo"
                            >
                                <div className="cm-search-dropdown" ref={dropdownRef}>
                                    <div className="cm-search-input-wrap">
                                        <svg className="cm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                                        </svg>
                                        <input
                                            id="moduleName"
                                            type="text"
                                            className={`cm-input cm-search-input ${errors.moduleName ? 'cm-input--error' : ''}`}
                                            placeholder="Select Module..."
                                            value={searchText}
                                            onChange={e => {
                                                setSearchText(e.target.value);
                                                setDropdownOpen(true);
                                                handleChange('moduleName', e.target.value);
                                            }}
                                            onFocus={() => setDropdownOpen(true)}
                                            autoComplete="off"
                                        />
                                        {autoFillLoading && (
                                            <svg className="cm-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-9-9" />
                                            </svg>
                                        )}
                                        <svg
                                            className={`cm-chevron ${dropdownOpen ? 'cm-chevron--open' : ''}`}
                                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                            onClick={() => setDropdownOpen(v => !v)}
                                        >
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </div>

                                    {dropdownOpen && (
                                        <div className="cm-dropdown-list" role="listbox">
                                            {moduleNamesLoading ? (
                                                <div className="cm-dropdown-status">
                                                    <svg className="cm-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-9-9" /></svg>
                                                    Loading modules…
                                                </div>
                                            ) : filteredNames.length === 0 ? (
                                                <div className="cm-dropdown-status">No matches found</div>
                                            ) : (
                                                filteredNames.map(name => (
                                                    <button
                                                        key={name}
                                                        role="option"
                                                        className={`cm-dropdown-item ${form.moduleName === name ? 'cm-dropdown-item--active' : ''}`}
                                                        onMouseDown={e => { e.preventDefault(); handleModuleNameSelect(name); }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                        </svg>
                                                        {name}
                                                        {form.moduleName === name && (
                                                            <svg className="cm-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                <path d="M20 6L9 17l-5-5" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </FormField>

                            {/* Module Display Name */}
                            <FormField id="moduleDisplayName" label="Module Display Name" readOnly={!!form.moduleName}
                                hint="Auto-populated from IndusEnterpriseDemo">
                                <input
                                    id="moduleDisplayName"
                                    type="text"
                                    className={`cm-input ${form.moduleName ? 'cm-input--readonly' : ''}`}
                                    placeholder="Auto populated after module selection"
                                    value={form.moduleDisplayName}
                                    onChange={e => handleChange('moduleDisplayName', e.target.value)}
                                    readOnly={!!form.moduleName && !!form.moduleDisplayName}
                                />
                            </FormField>
                        </FieldGroup>

                        <FieldGroup>
                            {/* Module Head Name */}
                            <FormField id="moduleHeadName" label="Module Head Name" readOnly={!!form.moduleName}>
                                <input
                                    id="moduleHeadName"
                                    type="text"
                                    className={`cm-input ${form.moduleName ? 'cm-input--readonly' : ''}`}
                                    placeholder="Auto populated after module selection"
                                    value={form.moduleHeadName}
                                    onChange={e => handleChange('moduleHeadName', e.target.value)}
                                    readOnly={!!form.moduleName && !!form.moduleHeadName}
                                />
                            </FormField>

                            {/* Module Head Display Name */}
                            <FormField id="moduleHeadDisplayName" label="Module Head Display Name" readOnly={!!form.moduleName}>
                                <input
                                    id="moduleHeadDisplayName"
                                    type="text"
                                    className={`cm-input ${form.moduleName ? 'cm-input--readonly' : ''}`}
                                    placeholder="Auto populated after module selection"
                                    value={form.moduleHeadDisplayName}
                                    onChange={e => handleChange('moduleHeadDisplayName', e.target.value)}
                                    readOnly={!!form.moduleName && !!form.moduleHeadDisplayName}
                                />
                            </FormField>
                        </FieldGroup>
                    </SectionCard>

                    {/* ── Section 2: Display Settings ──────────────────── */}
                    <SectionCard
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>}
                        title="Display Settings"
                        subtitle="Control ordering and group placement of this module"
                    >
                        <FieldGroup>
                            {/* Head Display Order */}
                            <FormField
                                id="moduleHeadDisplayOrder"
                                label="Module Head Display Order"
                                required
                                error={errors.moduleHeadDisplayOrder}
                                hint="Auto-set to MAX + 1. If taken, existing entries shift by +1."
                            >
                                <input
                                    id="moduleHeadDisplayOrder"
                                    type="number"
                                    className={`cm-input ${errors.moduleHeadDisplayOrder?.includes('shifted') ? 'cm-input--warning' : ''}`}
                                    placeholder="Auto calculated"
                                    min={1}
                                    value={form.moduleHeadDisplayOrder}
                                    onChange={e => handleChange('moduleHeadDisplayOrder', e.target.value)}
                                />
                            </FormField>

                            {/* Display Order (mirrors Head Display Order) */}
                            <FormField
                                id="moduleDisplayOrder"
                                label="Module Display Order"
                                readOnly
                                hint="Mirrors Module Head Display Order automatically"
                            >
                                <input
                                    id="moduleDisplayOrder"
                                    type="number"
                                    className="cm-input cm-input--readonly"
                                    placeholder="Same as Head Display Order"
                                    value={form.moduleDisplayOrder}
                                    readOnly
                                />
                            </FormField>
                        </FieldGroup>

                        <FieldGroup>
                            {/* Set Group Index */}
                            <FormField
                                id="setGroupIndex"
                                label="Set Group Index"
                                required
                                error={errors.setGroupIndex}
                                readOnly={isSetGroupLocked}
                                hint={isSetGroupLocked
                                    ? 'Locked — fetched from existing head group in current database'
                                    : 'Enter a group index for new module head'}
                            >
                                <input
                                    id="setGroupIndex"
                                    type="number"
                                    className={`cm-input ${isSetGroupLocked ? 'cm-input--readonly' : ''} ${errors.setGroupIndex ? 'cm-input--error' : ''}`}
                                    placeholder={isSetGroupLocked ? 'Auto-fetched from DB' : 'Enter group index'}
                                    min={0}
                                    value={form.setGroupIndex}
                                    onChange={e => handleChange('setGroupIndex', e.target.value)}
                                    readOnly={isSetGroupLocked}
                                />
                            </FormField>
                            <div className="cm-field" /> {/* spacer */}
                        </FieldGroup>
                    </SectionCard>

                    {/* ── Section 3: Print Settings ────────────────────── */}
                    <SectionCard
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>}
                        title="Print Settings"
                        subtitle="Optional print document URLs and names for this module"
                    >
                        <FieldGroup>
                            <FormField id="printDocumentWebPage" label="Print Document Web Page">
                                <input
                                    id="printDocumentWebPage"
                                    type="text"
                                    className="cm-input"
                                    placeholder="Enter Web Page URL"
                                    value={form.printDocumentWebPage}
                                    onChange={e => handleChange('printDocumentWebPage', e.target.value)}
                                />
                            </FormField>
                            <FormField id="printDocumentName" label="Print Document Name">
                                <input
                                    id="printDocumentName"
                                    type="text"
                                    className="cm-input"
                                    placeholder="Enter Document Name"
                                    value={form.printDocumentName}
                                    onChange={e => handleChange('printDocumentName', e.target.value)}
                                />
                            </FormField>
                        </FieldGroup>
                        <FieldGroup>
                            <FormField id="printDocumentWebPage1" label="Print Document Web Page 1">
                                <input
                                    id="printDocumentWebPage1"
                                    type="text"
                                    className="cm-input"
                                    placeholder="Enter Web Page URL"
                                    value={form.printDocumentWebPage1}
                                    onChange={e => handleChange('printDocumentWebPage1', e.target.value)}
                                />
                            </FormField>
                            <FormField id="printDocumentName1" label="Print Document Name 1">
                                <input
                                    id="printDocumentName1"
                                    type="text"
                                    className="cm-input"
                                    placeholder="Enter Document Name"
                                    value={form.printDocumentName1}
                                    onChange={e => handleChange('printDocumentName1', e.target.value)}
                                />
                            </FormField>
                        </FieldGroup>
                    </SectionCard>

                    {/* ── Section 4: System Information (Hidden in UI) ── */}

                    {/* ── Action Buttons ───────────────────────────────── */}
                    <div className="cm-actions">
                        <button
                            type="button"
                            id="btn-cancel-module"
                            className="cm-btn cm-btn--ghost"
                            onClick={() => navigate('/module-authority')}
                            disabled={saving}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 12H5M5 12l7 7M5 12l7-7" />
                            </svg>
                            Cancel
                        </button>

                        {!isEditMode && (
                            <button
                                type="button"
                                id="btn-reset-module"
                                className="cm-btn cm-btn--secondary"
                                onClick={handleReset}
                                disabled={saving}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M3 12a9 9 0 109-9 9 9 0 00-6.906 3.25M3 3v5h5" />
                                </svg>
                                Reset
                            </button>
                        )}

                        <button
                            type="button"
                            id="btn-save-module"
                            className="cm-btn cm-btn--primary"
                            onClick={handleSave}
                            disabled={saving || autoFillLoading}
                        >
                            {saving ? (
                                <>
                                    <svg className="cm-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M21 12a9 9 0 11-9-9" />
                                    </svg>
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                        <path d="M17 21v-8H7v8M7 3v5h8" />
                                    </svg>
                                    {isEditMode ? 'Update Module' : 'Save Module'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── Scoped CSS ─────────────────────────────────────────────────────
const cssStyles = `
/* ── Page Layout ───────────────────────────────────────── */
.cm-page {
    min-height: 100vh;
    padding: 1.5rem 1rem 3rem;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

@media (min-width: 768px) { .cm-page { padding: 2rem 2rem 3rem; } }
@media (min-width: 1024px) { .cm-page { padding: 2rem 3rem 4rem; } }

/* ── Page Header ───────────────────────────────────────── */
.cm-page-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.cm-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid var(--border, #e5e7eb);
    background: var(--bg-card, #fff);
    color: var(--text-muted, #6b7280);
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 0.2rem;
    transition: all 0.15s ease;
}
.cm-back-btn:hover { background: #f3f4f6; color: #111827; transform: translateX(-2px); }
.dark .cm-back-btn { background: #1f2937; border-color: #374151; color: #9ca3af; }
.dark .cm-back-btn:hover { background: #374151; color: #f9fafb; }

.cm-breadcrumb { font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; letter-spacing: 0.02em; }
.dark .cm-breadcrumb { color: #6b7280; }

.cm-page-title {
    font-size: 1.6rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 0.2rem;
    line-height: 1.2;
}
.dark .cm-page-title { color: #f1f5f9; }

.cm-page-desc { font-size: 0.875rem; color: #6b7280; margin: 0; }
.dark .cm-page-desc { color: #94a3b8; }

.cm-header-badge {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
}

/* ── Loading Bar ───────────────────────────────────────── */
.cm-loading-bar {
    height: 3px;
    background: #e5e7eb;
    border-radius: 2px;
    margin-bottom: 1.5rem;
    overflow: hidden;
}
.cm-loading-bar-inner {
    height: 100%;
    width: 40%;
    background: linear-gradient(90deg, #667eea, #764ba2, #667eea);
    background-size: 200% 100%;
    border-radius: 2px;
    animation: cmBarSlide 1.2s ease-in-out infinite;
}
@keyframes cmBarSlide {
    0%   { transform: translateX(-150%); }
    100% { transform: translateX(400%); }
}

/* ── Form Container ────────────────────────────────────── */
.cm-form-container {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ── Section Cards ─────────────────────────────────────── */
.cm-section-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    overflow: visible;
    box-shadow: 0 1px 6px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.04);
    transition: box-shadow 0.2s ease;
}
.cm-section-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,.08), 0 6px 24px rgba(0,0,0,.06); }
.dark .cm-section-card { background: #1e293b; border-color: #334155; }

.cm-section-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #e5e7eb;
}
.dark .cm-section-header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-color: #334155; }

.cm-section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 3px 8px rgba(102, 126, 234, 0.35);
}

.cm-section-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
.dark .cm-section-title { color: #f1f5f9; }
.cm-section-subtitle { font-size: 0.78rem; color: #6b7280; margin: 0.1rem 0 0; }
.dark .cm-section-subtitle { color: #7c8d9e; }

.cm-section-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

/* ── Field Groups ──────────────────────────────────────── */
.cm-field-group {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}
@media (min-width: 640px) { .cm-field-group { grid-template-columns: 1fr 1fr; } }

/* ── Fields ────────────────────────────────────────────── */
.cm-field { display: flex; flex-direction: column; gap: 0.35rem; }

.cm-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.dark .cm-label { color: #cbd5e1; }

.cm-required { color: #ef4444; font-size: 0.85rem; }

.cm-readonly-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.45rem;
    border-radius: 20px;
    background: linear-gradient(135deg, #dbeafe, #ede9fe);
    color: #4f46e5;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.cm-input {
    width: 100%;
    padding: 0.6rem 0.875rem;
    border: 1.5px solid #d1d5db;
    border-radius: 10px;
    font-size: 0.875rem;
    color: #111827;
    background: #fff;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;
    font-family: inherit;
}
.cm-input:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}
.cm-input::placeholder { color: #9ca3af; }
.dark .cm-input {
    background: #0f172a;
    border-color: #334155;
    color: #e2e8f0;
}
.dark .cm-input:focus { border-color: #667eea; }

.cm-input--readonly {
    background: #f8fafc;
    color: #6b7280;
    cursor: default;
}
.dark .cm-input--readonly { background: #1a2538; color: #64748b; }

.cm-input--error { border-color: #ef4444 !important; }
.cm-input--error:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important; }

.cm-input--warning { border-color: #f59e0b !important; }
.cm-input--warning:focus { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15) !important; }

.cm-field-error {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    color: #ef4444;
    margin: 0;
    padding: 0.35rem 0.5rem;
    background: #fef2f2;
    border-radius: 6px;
    border-left: 3px solid #ef4444;
    animation: cmSlideIn 0.2s ease;
}
.dark .cm-field-error { background: rgba(239, 68, 68, 0.1); }

.cm-field-hint {
    font-size: 0.75rem;
    color: #9ca3af;
    margin: 0;
    padding-left: 0.25rem;
}
.dark .cm-field-hint { color: #64748b; }

@keyframes cmSlideIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ── Module Name Search Dropdown ───────────────────────── */
.cm-search-dropdown { position: relative; }

.cm-search-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.cm-search-icon {
    position: absolute;
    left: 0.75rem;
    color: #9ca3af;
    pointer-events: none;
    z-index: 1;
}

.cm-search-input {
    padding-left: 2.25rem !important;
    padding-right: 3.5rem !important;
}

.cm-chevron {
    position: absolute;
    right: 0.75rem;
    color: #9ca3af;
    cursor: pointer;
    transition: transform 0.2s ease, color 0.15s ease;
}
.cm-chevron:hover { color: #667eea; }
.cm-chevron--open { transform: rotate(180deg); color: #667eea; }

.cm-spin {
    position: absolute;
    right: 2.25rem;
    color: #667eea;
    animation: cmSpin 0.8s linear infinite;
}
.cm-field .cm-spin { position: static; }
@keyframes cmSpin { to { transform: rotate(360deg); } }

.cm-dropdown-list {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: #fff;
    border: 1.5px solid #e0e7ff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
    z-index: 100;
    max-height: 450px;
    overflow-y: auto;
    animation: cmDropIn 0.15s ease;
    scrollbar-width: thin;
    scrollbar-color: #c7d2fe #f5f3ff;
}
.dark .cm-dropdown-list { background: #1e293b; border-color: #4f46e5; }

@keyframes cmDropIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}

.cm-dropdown-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    font-size: 0.84rem;
    color: #6b7280;
    justify-content: center;
}
.dark .cm-dropdown-status { color: #94a3b8; }

.cm-dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.65rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    color: #374151;
    text-align: left;
    transition: background 0.1s ease, color 0.1s ease;
    font-family: inherit;
    white-space: normal;
    word-break: break-word;
}
.cm-dropdown-item:hover { background: #f5f3ff; color: #4f46e5; }
.cm-dropdown-item--active { background: #ede9fe; color: #4f46e5; font-weight: 600; }
.dark .cm-dropdown-item { color: #e2e8f0; }
.dark .cm-dropdown-item:hover { background: #2d3748; color: #a78bfa; }
.dark .cm-dropdown-item--active { background: #1e1b4b; color: #a78bfa; }

.cm-dropdown-check { margin-left: auto; color: #7c3aed; }

/* ── Action Buttons ────────────────────────────────────── */
.cm-actions {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    justify-content: flex-end;
    flex-wrap: wrap;
    padding: 1.5rem 0 0.5rem;
}

.cm-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.5rem;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    font-family: inherit;
    white-space: nowrap;
}
.cm-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.cm-btn--ghost {
    background: transparent;
    color: #6b7280;
    border: 1.5px solid #e5e7eb;
}
.cm-btn--ghost:hover:not(:disabled) { background: #f9fafb; color: #374151; border-color: #d1d5db; }
.dark .cm-btn--ghost { color: #94a3b8; border-color: #334155; }
.dark .cm-btn--ghost:hover:not(:disabled) { background: #1e293b; color: #e2e8f0; }

.cm-btn--secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1.5px solid #e5e7eb;
}
.cm-btn--secondary:hover:not(:disabled) { background: #e5e7eb; color: #111827; }
.dark .cm-btn--secondary { background: #334155; color: #e2e8f0; border-color: #475569; }
.dark .cm-btn--secondary:hover:not(:disabled) { background: #475569; }

.cm-btn--primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(102, 126, 234, 0.35);
    min-width: 150px;
    justify-content: center;
}
.cm-btn--primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.45);
}
.cm-btn--primary:active:not(:disabled) { transform: translateY(0); }
`;

export default CreateModule;
