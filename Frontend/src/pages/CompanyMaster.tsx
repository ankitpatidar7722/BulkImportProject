import React, { useState, useEffect } from 'react';
import { Building2, Save, Edit2, Loader2 } from 'lucide-react';
import { getCompany, updateCompany, CompanyDto } from '../services/api';
import toast from 'react-hot-toast';

const CompanyMaster: React.FC = () => {
    const [company, setCompany] = useState<CompanyDto | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState<CompanyDto | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        try {
            const data = await getCompany();
            console.log('API Response:', data); // DEBUG
            setCompany(data);
            setFormData(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load company details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setFormData({ ...company! });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({ ...company! });
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            await updateCompany(formData);
            setCompany(formData);
            setIsEditing(false);
            toast.success('Company details saved successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => {
            if (!prev) return null;
            let finalValue: any = value;
            if (type === 'checkbox') {
                // In case we used checkbox, but requirement says Dropdown for boolean
            }
            if (name === 'isActive') {
                finalValue = value === 'true';
            }
            return { ...prev, [name]: finalValue };
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!company || !formData) return null;

    return (
        <div className="p-8 space-y-8 bg-gray-50 dark:bg-[#020617] min-h-screen transition-colors duration-200">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Master</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage system-wide company profile.</p>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1e293b]/30 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Information</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">View and edit organization details</p>
                        </div>
                    </div>
                    <div>
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Details
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Company Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white font-medium text-lg">{company.companyName}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Address</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{company.email}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{company.phone || '-'}</p>
                            )}
                        </div>

                        {/* Website */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{company.website || '-'}</p>
                            )}
                        </div>

                        {/* GSTIN */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">GSTIN</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="gstin"
                                    value={formData.gstin}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{company.gstin || '-'}</p>
                            )}
                        </div>

                        {/* Status (Boolean Dropdown) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                            {isEditing ? (
                                <select
                                    name="isActive"
                                    value={formData.isActive ? 'true' : 'false'}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            ) : (
                                <div>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${company.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {company.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Address (Full Width) */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white leading-relaxed">{company.address}</p>
                            )}
                        </div>
                    </div>

                    {isEditing && (
                        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Configuration Settings</h3>
                            <p className="text-xs text-gray-400 mb-4">Editing Company ID: {company.companyId}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { key: 'isGstApplicable', label: 'GST Applicable' },
                                    { key: 'isEinvoiceApplicable', label: 'E-Invoice Applicable' },
                                    { key: 'isInternalApprovalRequired', label: 'Internal Approval Required' },
                                    { key: 'isRequisitionApproval', label: 'Requisition Approval' },
                                    { key: 'isPOApprovalRequired', label: 'PO Approval Required' },
                                    { key: 'isInvoiceApprovalRequired', label: 'Invoice Approval Required' },
                                    { key: 'isGRNApprovalRequired', label: 'GRN Approval Required' },
                                    { key: 'jobScheduleReleaseRequired', label: 'Job Schedule Release Required' },
                                    { key: 'isSalesOrderApprovalRequired', label: 'Sales Order Approval Required' },
                                    { key: 'isJobReleaseFeatureRequired', label: 'Job Release Feature Required' },
                                    { key: 'showPlanUptoWastagePerc', label: 'Show Plan Upto Wastage Perc' },
                                    { key: 'byPassCostApproval', label: 'By Pass Cost Approval' },
                                ].map((field) => {
                                    // Helper to get value handling both camelCase and PascalCase
                                    const pascalKey = field.key.charAt(0).toUpperCase() + field.key.slice(1);
                                    const rawValue = (formData as any)[field.key] ?? (formData as any)[pascalKey];
                                    const isActive = rawValue === true || rawValue === "true" || rawValue === 1;

                                    const checked = isActive;

                                    return (
                                        <div key={field.key} className="flex items-center space-x-3 p-4 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors">
                                            <div className="flex-shrink-0">
                                                {isEditing ? (
                                                    <input
                                                        type="checkbox"
                                                        name={field.key}
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            setFormData(prev => prev ? { ...prev, [field.key]: isChecked } : null);
                                                        }}
                                                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                                    />
                                                ) : (
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${checked ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                                        {checked && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer select-none">
                                                    {field.label}
                                                </label>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {checked ? 'Enabled' : 'Disabled'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyMaster;
