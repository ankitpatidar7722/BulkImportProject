import React, { useState, useEffect } from 'react';
import { Building2, Save, Edit2, Loader2 } from 'lucide-react';
import { getCompany, updateCompany, CompanyDto } from '../services/api';
import { useMessageModal } from '../components/MessageModal';

const CompanyMaster: React.FC = () => {
    const { showMessage, ModalRenderer } = useMessageModal();
    const [company, setCompany] = useState<CompanyDto | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState<CompanyDto | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        try {
            const data = await getCompany();
            setCompany(data);
            setFormData(data);
        } catch (error) {
            console.error(error);
            showMessage('error', 'Load Error', 'Failed to load company details. Please try refreshing the page.');
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
            showMessage('success', 'Saved Successfully', 'Company details have been updated successfully.');
        } catch (error) {
            console.error(error);
            showMessage('error', 'Save Failed', 'Failed to save company changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => {
            if (!prev) return null;
            let finalValue: any = value;

            if (type === 'checkbox') {
                finalValue = (e.target as HTMLInputElement).checked;
            } else if (type === 'number') {
                finalValue = value === '' ? null : parseFloat(value);
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

    const tabs = [
        { id: 0, label: 'Basic Info', icon: '🏢', color: 'blue' },
        { id: 1, label: 'Tax & Statutory', icon: '🧾', color: 'green' },
        { id: 2, label: 'Bank Details', icon: '🏦', color: 'purple' },
        { id: 3, label: 'Approvals', icon: '✅', color: 'orange' },
        { id: 4, label: 'Domain Settings', icon: '⚙️', color: 'indigo' },
        { id: 5, label: 'Estimation', icon: '🧮', color: 'pink' },
        { id: 6, label: 'Printing/RDLC', icon: '🖨️', color: 'cyan' },
        { id: 7, label: 'Production', icon: '🏭', color: 'red' },
        { id: 8, label: 'API/Integration', icon: '🌐', color: 'teal' },
        { id: 9, label: 'Time Settings', icon: '🕒', color: 'amber' },
        { id: 10, label: 'Security/OTP', icon: '🔐', color: 'violet' },
        { id: 11, label: 'References', icon: '🏷️', color: 'lime' },
        { id: 12, label: 'Currency', icon: '💱', color: 'emerald' },
        { id: 13, label: 'Miscellaneous', icon: '📝', color: 'slate' },
    ];

    const renderField = (label: string, name: keyof CompanyDto, type: 'text' | 'email' | 'number' | 'date' | 'checkbox' | 'textarea' = 'text') => {
        const value = formData[name];
        const displayValue = company[name];

        if (type === 'checkbox') {
            return (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">{label}</label>
                    {isEditing ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name={name}
                                checked={!!value}
                                onChange={handleChange}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    ) : (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${value ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                            {value ? '✓ Enabled' : '✗ Disabled'}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</label>
                {isEditing ? (
                    type === 'textarea' ? (
                        <textarea
                            name={name}
                            value={value as string || ''}
                            onChange={handleChange}
                            rows={2}
                            placeholder={`Enter ${label.toLowerCase()}`}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all"
                        />
                    ) : (
                        <input
                            type={type}
                            name={name}
                            value={value as string || ''}
                            onChange={handleChange}
                            placeholder={`Enter ${label.toLowerCase()}`}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all"
                        />
                    )
                ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-[#1e293b] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[38px] flex items-center">
                        {displayValue ? String(displayValue) : <span className="text-gray-400 italic">Not set</span>}
                    </p>
                )}
            </div>
        );
    };

    const renderSection = (title: string, children: React.ReactNode, icon?: string) => {
        return (
            <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                    {icon && <span className="text-xl">{icon}</span>}
                    <h4 className="text-base font-bold text-gray-800 dark:text-white">{title}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {children}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#020617] dark:to-[#0f172a]">
            {ModalRenderer}
            {/* Fixed Header */}
            <div className="sticky top-0 z-20 bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Company Configuration</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{company.companyName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!isEditing ? (
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit Details
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancel}
                                        disabled={isSaving}
                                        className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 transform hover:scale-105"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 overflow-x-auto scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
                    <div className="flex gap-2 min-w-max pb-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-6 pb-6">
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    {/* Tab 0: Basic Info */}
                    {activeTab === 0 && (
                        <div className="space-y-5">
                            {renderSection('Company Information', <>
                                {renderField('Company Name', 'companyName')}
                                {renderField('Tally Company Name', 'tallyCompanyName')}
                                {renderField('Production Unit Name', 'productionUnitName')}
                                {renderField('Concerning Person', 'concerningPerson')}
                                {renderField('Company Start Date', 'companyStartDate', 'date')}
                                {renderField('Last Invoice Date', 'lastInvoiceDate', 'date')}
                            </>, '🏢')}

                            {renderSection('Contact Information', <>
                                {renderField('Email', 'email', 'email')}
                                {renderField('Contact Number', 'contactNO')}
                                {renderField('Mobile Number', 'mobileNO')}
                                {renderField('Phone', 'phone')}
                                {renderField('Website', 'website')}
                                {renderField('FAX', 'fax')}
                            </>, '📞')}

                            {renderSection('Address Details', <>
                                {renderField('Address', 'address', 'textarea')}
                                {renderField('Address Line 1', 'address1')}
                                {renderField('Address Line 2', 'address2')}
                                {renderField('Address Line 3', 'address3')}
                                {renderField('City', 'city')}
                                {renderField('State', 'state')}
                                {renderField('Country', 'country')}
                                {renderField('Pincode', 'pincode')}
                                {renderField('Production Unit Address', 'productionUnitAddress', 'textarea')}
                            </>, '📍')}

                            {renderSection('Status', <>
                                {renderField('Is Active', 'isActive', 'checkbox')}
                            </>, '⚡')}
                        </div>
                    )}

                    {/* Tab 1: Tax & Statutory */}
                    {activeTab === 1 && (
                        <div className="space-y-5">
                            {renderSection('Tax Registration', <>
                                {renderField('GSTIN', 'gstin')}
                                {renderField('PAN', 'pan')}
                                {renderField('CIN Number', 'cinNo')}
                                {renderField('IEC Number', 'iecNo')}
                                {renderField('Import Export Code', 'importExportCode')}
                                {renderField('State TIN Number', 'stateTinNo')}
                                {renderField('MSME Number', 'msmeno')}
                                {renderField('Default Tax Ledger Type', 'defaultTaxLedgerTypeName')}
                            </>, '🧾')}

                            {renderSection('Tax Settings', <>
                                {renderField('Sales Tax', 'isSalesTax', 'checkbox')}
                                {renderField('GST Applicable', 'isGstApplicable', 'checkbox')}
                                {renderField('VAT Applicable', 'isVatApplicable', 'checkbox')}
                                {renderField('E-Invoice Applicable', 'isEinvoiceApplicable', 'checkbox')}
                                {renderField('Tax Applicable Branch Wise', 'taxApplicableBranchWise', 'checkbox')}
                            </>, '⚙️')}
                        </div>
                    )}

                    {/* Tab 2: Bank Details */}
                    {activeTab === 2 && (
                        <div className="space-y-5">
                            {renderSection('Banking Information', <>
                                {renderField('Bank Details', 'bankDetails', 'textarea')}
                                {renderField('Cash Against Documents Bank Details', 'cashAgainstDocumentsBankDetails', 'textarea')}
                            </>, '🏦')}
                        </div>
                    )}

                    {/* Tab 3: Approvals */}
                    {activeTab === 3 && (
                        <div className="space-y-5">
                            {renderSection('Approval Workflows', <>
                                {renderField('Requisition Approval', 'isRequisitionApproval', 'checkbox')}
                                {renderField('PO Approval Required', 'isPOApprovalRequired', 'checkbox')}
                                {renderField('Invoice Approval Required', 'isInvoiceApprovalRequired', 'checkbox')}
                                {renderField('GRN Approval Required', 'isGRNApprovalRequired', 'checkbox')}
                                {renderField('Sales Order Approval Required', 'isSalesOrderApprovalRequired', 'checkbox')}
                                {renderField('Internal Approval Required', 'isInternalApprovalRequired', 'checkbox')}
                            </>, '✅')}

                            {renderSection('Job & Production Approvals', <>
                                {renderField('Job Release Feature Required', 'isJobReleaseFeatureRequired', 'checkbox')}
                                {renderField('Job Released Checklist Feature', 'jobReleasedChecklistFeature', 'checkbox')}
                                {renderField('Job Schedule Release Required', 'jobScheduleReleaseRequired', 'checkbox')}
                            </>, '🏭')}

                            {renderSection('Bypass Settings', <>
                                {renderField('Bypass Cost Approval', 'byPassCostApproval', 'checkbox')}
                                {renderField('Bypass Inventory For Production', 'byPassInventoryForProduction', 'checkbox')}
                            </>, '⚡')}
                        </div>
                    )}

                    {/* Tab 4: Domain Settings */}
                    {activeTab === 4 && (
                        <div className="space-y-5">
                            {renderSection('Domain Modules', <>
                                {renderField('Flexo Domain Enable', 'flexoDomainEnable', 'checkbox')}
                                {renderField('Offset Domain Enable', 'offsetDomainEnable', 'checkbox')}
                                {renderField('Corrugation Domain Enable', 'corrugationDomainEnable', 'checkbox')}
                                {renderField('Roto Domain Enable', 'rotoDomainEnable', 'checkbox')}
                            </>, '⚙️')}

                            {renderSection('Planning Features', <>
                                {renderField('Book Planning Feature Enable', 'bookPlanningFeatureEnable', 'checkbox')}
                                {renderField('Rigid Box Planning Feature Enable', 'rigidBoxPlanningFeatureEnable', 'checkbox')}
                                {renderField('Shipper Planning Feature Enable', 'shipperPlanningFeatureEnable', 'checkbox')}
                            </>, '📋')}

                            {renderSection('Other Settings', <>
                                {renderField('Product Catalog Created', 'isProductCatalogCreated', 'checkbox')}
                                {renderField('Supplier Item Allocation Required', 'isSupplierItemAllocationRequired', 'checkbox')}
                            </>, '🔧')}
                        </div>
                    )}

                    {/* Tab 5: Estimation */}
                    {activeTab === 5 && (
                        <div className="space-y-5">
                            {renderSection('Estimation Configuration', <>
                                {renderField('Cost Estimation Method Type', 'costEstimationMethodType')}
                                {renderField('Estimation RoundOff Decimal Place', 'estimationRoundOffDecimalPlace', 'number')}
                                {renderField('Purchase RoundOff Decimal Place', 'purchaseRoundOffDecimalPlace', 'number')}
                                {renderField('Invoice RoundOff Decimal Place', 'invoiceRoundOffDecimalPlace', 'number')}
                                {renderField('Estimation Per Unit Cost Decimal Place', 'estimationPerUnitCostDecimalPlace', 'number')}
                                {renderField('RoundOff Impression Value', 'roundOffImpressionValue', 'number')}
                            </>, '🧮')}

                            {renderSection('Calculation Settings', <>
                                {renderField('Auto RoundOff Not Applicable', 'autoRoundOffNotApplicable', 'checkbox')}
                                {renderField('Weight Calculate On Estimation', 'wtCalculateOnEstimation', 'checkbox')}
                                {renderField('Show Plan Upto Wastage Percentage', 'showPlanUptoWastagePerc', 'checkbox')}
                                {renderField('Wastage Add In Printing Rate', 'isWastageAddInPrintingRate', 'checkbox')}
                                {renderField('Book Half Form Wastage', 'is_Book_Half_Form_Wastage', 'checkbox')}
                            </>, '⚙️')}
                        </div>
                    )}

                    {/* Tab 6: Printing/RDLC */}
                    {activeTab === 6 && (
                        <div className="space-y-5">
                            {renderSection('Print Templates', <>
                                {renderField('Invoice Print RDLC', 'invoicePrintRDLC')}
                                {renderField('Packing Slip Print RDLC', 'packingSlipPrintRDLC')}
                                {renderField('Challan Print RDLC', 'challanPrintRDLC')}
                                {renderField('PWO Print RDLC', 'pwoPrintRDLC')}
                                {renderField('Sales Return Print RDLC', 'salesReturnPrintRDLC')}
                                {renderField('COA Print RDLC', 'coaPrintRDLC')}
                                {renderField('OutSource Challan RDLC', 'outSourceChallanRDLC')}
                                {renderField('PWO Flexo Print RDLC', 'pwoFlexoPrintRDLC')}
                                {renderField('PWO Gang Print RDLC', 'pwoGangPrintRDLC')}
                                {renderField('QC And Packing Slip', 'qcAndPackingSlip')}
                                {renderField('Item Sales Order Booking Print', 'itemSalesOrderBookingPrint')}
                            </>, '🖨️')}

                            {renderSection('Print Settings', <>
                                {renderField('Unitwise Printout Setting', 'unitwisePrintoutSetting', 'checkbox')}
                                {renderField('Fast Invoice Print', 'fastInvoicePrint', 'checkbox')}
                                {renderField('Fast E-Invoice Print', 'fastEInvoicePrint', 'checkbox')}
                            </>, '⚙️')}
                        </div>
                    )}

                    {/* Tab 7: Production */}
                    {activeTab === 7 && (
                        <div className="space-y-5">
                            {renderSection('Production Configuration', <>
                                {renderField('Manual Production Entry Time', 'manualProductionEntryTime')}
                                {renderField('Production Entry Back Days', 'productionEntryBackDay', 'number')}
                                {renderField('Production Unit ID', 'productionUnitID', 'number')}
                            </>, '🏭')}

                            {renderSection('Buffer Settings', <>
                                {renderField('Buffer GSM Minus', 'bufferGSMMinus', 'number')}
                                {renderField('Buffer GSM Plus', 'bufferGSMPlus', 'number')}
                                {renderField('Buffer Size Minus', 'bufferSizeMinus', 'number')}
                                {renderField('Buffer Size Plus', 'bufferSizePlus', 'number')}
                            </>, '📊')}

                            {renderSection('Production Features', <>
                                {renderField('Generate Voucher No By Production Unit', 'generateVoucherNoByProductionUnit', 'checkbox')}
                                {renderField('Material Consumption Details Flag', 'materialConsumptionDetailsFlage', 'checkbox')}
                            </>, '⚙️')}
                        </div>
                    )}

                    {/* Tab 8: API/Integration */}
                    {activeTab === 8 && (
                        <div className="space-y-5">
                            {renderSection('API Configuration', <>
                                {renderField('API Base URL', 'apiBaseURL')}
                                {renderField('API Authentication URL', 'apiAuthenticationURL')}
                                {renderField('API Client ID', 'apiClientID')}
                                {renderField('API Client Secret ID', 'apiClientSecretID')}
                                {renderField('API Basic Auth Username', 'apiBasicAuthUserName')}
                                {renderField('API Basic Auth Password', 'apiBasicAuthPassword')}
                            </>, '🌐')}

                            {renderSection('Indus Integration', <>
                                {renderField('Indus API Base URL', 'indusAPIBaseUrl')}
                                {renderField('Indus API Auth Token', 'indusAPIAuthToken')}
                                {renderField('Indus Token Auth API', 'indusTokenAuthAPI')}
                                {renderField('Indus Mail API Base URL', 'indusMailAPIBaseUrl')}
                            </>, '🔗')}

                            {renderSection('Client Integration', <>
                                {renderField('Client API Base URL', 'clientAPIBaseUrl')}
                                {renderField('Client API Auth Token', 'clientAPIAuthToken')}
                                {renderField('Client Token Auth API', 'clientTokenAuthAPI')}
                            </>, '🔗')}

                            {renderSection('Other Settings', <>
                                {renderField('Integration Type', 'integrationType')}
                                {renderField('Logout Page', 'logoutPage')}
                                {renderField('Desktop Connection String', 'desktopConnString', 'textarea')}
                                {renderField('Application Configuration', 'applicationConfiguration', 'textarea')}
                                {renderField('Company Static IP', 'companyStaticIP')}
                                {renderField('API Integration Required', 'apiIntegrationRequired', 'checkbox')}
                            </>, '⚙️')}
                        </div>
                    )}

                    {/* Tab 9: Time Settings */}
                    {activeTab === 9 && (
                        <div className="space-y-5">
                            {renderSection('Time Configuration', <>
                                {renderField('Time Zone', 'timeZone')}
                                {renderField('Duration', 'duration')}
                                {renderField('End Time', 'end_time')}
                                {renderField('Last Shown Time', 'lastShownTime')}
                                {renderField('Time', 'time')}
                            </>, '🕒')}

                            {renderSection('Message Settings', <>
                                {renderField('Message Show', 'messageShow', 'checkbox')}
                            </>, '💬')}
                        </div>
                    )}

                    {/* Tab 10: Security/OTP */}
                    {activeTab === 10 && (
                        <div className="space-y-5">
                            {renderSection('Security Configuration', <>
                                {renderField('OTP Verification Excluded Devices', 'otpVerificationExcludedDevices', 'textarea')}
                            </>, '🔐')}

                            {renderSection('Security Features', <>
                                {renderField('OTP Verification Feature Enabled', 'otpVerificationFeatureEnabled', 'checkbox')}
                                {renderField('Multiple FYear Not Required', 'multipleFYearNotRequired', 'checkbox')}
                            </>, '⚙️')}
                        </div>
                    )}

                    {/* Tab 11: References */}
                    {activeTab === 11 && (
                        <div className="space-y-5">
                            {renderSection('Reference Codes', <>
                                {renderField('Reference Company Code', 'refCompanyCode')}
                                {renderField('Reference Sales Office Code', 'refSalesOfficeCode')}
                            </>, '🏷️')}

                            {renderSection('Reference Settings', <>
                                {renderField('ISOTP Required', 'isotpRequired', 'checkbox')}
                            </>, '⚙️')}
                        </div>
                    )}

                    {/* Tab 12: Currency */}
                    {activeTab === 12 && (
                        <div className="space-y-5">
                            {renderSection('Currency Configuration', <>
                                {renderField('Currency Head Name', 'currencyHeadName')}
                                {renderField('Currency Child Name', 'currencyChildName')}
                                {renderField('Currency Code', 'currencyCode')}
                                {renderField('Currency Symbolic Reference', 'currencySymboliconRef')}
                            </>, '💱')}
                        </div>
                    )}

                    {/* Tab 13: Miscellaneous */}
                    {activeTab === 13 && (
                        <div className="space-y-5">
                            {renderSection('Miscellaneous Settings', <>
                                {renderField('Backup Path', 'backupPath')}
                                {renderField('Description', 'description', 'textarea')}
                                {renderField('Purchase Tolerance', 'purchaseTolerance', 'number')}
                            </>, '📝')}

                            {renderSection('Invoice Settings', <>
                                {renderField('Invoice Print Product Wise', 'isInvoicePrintProductWise', 'checkbox')}
                                {renderField('Invoice Block Feature Required', 'isInvoiceBlockFeatureRequired', 'checkbox')}
                            </>, '🧾')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyMaster;
