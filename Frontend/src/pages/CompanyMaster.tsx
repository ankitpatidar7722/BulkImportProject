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
        { id: 0, label: '🏢 Basic Info', icon: '🏢' },
        { id: 1, label: '🧾 Tax & Statutory', icon: '🧾' },
        { id: 2, label: '🏦 Bank Details', icon: '🏦' },
        { id: 3, label: '🔐 Approvals', icon: '🔐' },
        { id: 4, label: '⚙️ Domain Settings', icon: '⚙️' },
        { id: 5, label: '🧮 Estimation', icon: '🧮' },
        { id: 6, label: '🖨️ Printing/RDLC', icon: '🖨️' },
        { id: 7, label: '🏭 Production', icon: '🏭' },
        { id: 8, label: '🌐 API/Integration', icon: '🌐' },
        { id: 9, label: '🕒 Time Settings', icon: '🕒' },
        { id: 10, label: '🔐 Security/OTP', icon: '🔐' },
        { id: 11, label: '🏷️ References', icon: '🏷️' },
        { id: 12, label: '💱 Currency', icon: '💱' },
        { id: 13, label: '📝 Miscellaneous', icon: '📝' },
    ];

    const renderField = (label: string, name: keyof CompanyDto, type: 'text' | 'email' | 'number' | 'date' | 'checkbox' | 'textarea' = 'text', options?: { trueLabel?: string; falseLabel?: string }) => {
        const value = formData[name];
        const displayValue = company[name];

        if (type === 'checkbox') {
            return (
                <div className="flex items-center space-x-3 p-4 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-lg">
                    {isEditing ? (
                        <input
                            type="checkbox"
                            name={name}
                            checked={!!value}
                            onChange={handleChange}
                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                    ) : (
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${value ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            {value && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                    )}
                    <label className="text-sm font-medium text-gray-900 dark:text-white">{label}</label>
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                {isEditing ? (
                    type === 'textarea' ? (
                        <textarea
                            name={name}
                            value={value as string || ''}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                        />
                    ) : (
                        <input
                            type={type}
                            name={name}
                            value={value as string || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                        />
                    )
                ) : (
                    <p className="text-gray-900 dark:text-white">{displayValue ? String(displayValue) : '-'}</p>
                )}
            </div>
        );
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 dark:bg-[#020617] min-h-screen">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Master</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage comprehensive company configuration across all modules</p>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1e293b]/30 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Configuration</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{company.companyName}</p>
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

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-800">
                    <div className="flex overflow-x-auto scrollbar-thin">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-8">
                    {/* Tab 0: Basic Information */}
                    {activeTab === 0 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Company Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('Company Name', 'companyName')}
                                {renderField('Tally Company Name', 'tallyCompanyName')}
                                {renderField('Production Unit Name', 'productionUnitName')}
                                {renderField('Production Unit Address', 'productionUnitAddress', 'textarea')}
                                {renderField('Address', 'address', 'textarea')}
                                {renderField('Address Line 1', 'address1')}
                                {renderField('Address Line 2', 'address2')}
                                {renderField('Address Line 3', 'address3')}
                                {renderField('City', 'city')}
                                {renderField('State', 'state')}
                                {renderField('Country', 'country')}
                                {renderField('Pincode', 'pincode')}
                                {renderField('Contact Number', 'contactNO')}
                                {renderField('Mobile Number', 'mobileNO')}
                                {renderField('Phone', 'phone')}
                                {renderField('Email', 'email', 'email')}
                                {renderField('Website', 'website')}
                                {renderField('Concerning Person', 'concerningPerson')}
                                {renderField('Company Start Date', 'companyStartDate', 'date')}
                                {renderField('Last Invoice Date', 'lastInvoiceDate', 'date')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                {renderField('Is Active', 'isActive', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 1: Tax & Statutory */}
                    {activeTab === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statutory & Tax Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('GSTIN', 'gstin')}
                                {renderField('PAN', 'pan')}
                                {renderField('CIN Number', 'cinNo')}
                                {renderField('IEC Number', 'iecNo')}
                                {renderField('Import Export Code', 'importExportCode')}
                                {renderField('State TIN Number', 'stateTinNo')}
                                {renderField('MSME Number', 'msmeno')}
                                {renderField('Default Tax Ledger Type', 'defaultTaxLedgerTypeName')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                {renderField('Sales Tax', 'isSalesTax', 'checkbox')}
                                {renderField('GST Applicable', 'isGstApplicable', 'checkbox')}
                                {renderField('VAT Applicable', 'isVatApplicable', 'checkbox')}
                                {renderField('E-Invoice Applicable', 'isEinvoiceApplicable', 'checkbox')}
                                {renderField('Tax Applicable Branch Wise', 'taxApplicableBranchWise', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Bank Details */}
                    {activeTab === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bank & Payment Information</h3>
                            <div className="grid grid-cols-1 gap-6">
                                {renderField('Bank Details', 'bankDetails', 'textarea')}
                                {renderField('Cash Against Documents Bank Details', 'cashAgainstDocumentsBankDetails', 'textarea')}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Approvals & Workflow */}
                    {activeTab === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Approval & Workflow Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('Requisition Approval', 'isRequisitionApproval', 'checkbox')}
                                {renderField('PO Approval Required', 'isPOApprovalRequired', 'checkbox')}
                                {renderField('Invoice Approval Required', 'isInvoiceApprovalRequired', 'checkbox')}
                                {renderField('GRN Approval Required', 'isGRNApprovalRequired', 'checkbox')}
                                {renderField('Sales Order Approval Required', 'isSalesOrderApprovalRequired', 'checkbox')}
                                {renderField('Job Release Feature Required', 'isJobReleaseFeatureRequired', 'checkbox')}
                                {renderField('Internal Approval Required', 'isInternalApprovalRequired', 'checkbox')}
                                {renderField('Bypass Cost Approval', 'byPassCostApproval', 'checkbox')}
                                {renderField('Bypass Inventory For Production', 'byPassInventoryForProduction', 'checkbox')}
                                {renderField('Job Released Checklist Feature', 'jobReleasedChecklistFeature', 'checkbox')}
                                {renderField('Job Schedule Release Required', 'jobScheduleReleaseRequired', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Domain Settings */}
                    {activeTab === 4 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Domain / Module Enable Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('Flexo Domain Enable', 'flexoDomainEnable', 'checkbox')}
                                {renderField('Offset Domain Enable', 'offsetDomainEnable', 'checkbox')}
                                {renderField('Corrugation Domain Enable', 'corrugationDomainEnable', 'checkbox')}
                                {renderField('Roto Domain Enable', 'rotoDomainEnable', 'checkbox')}
                                {renderField('Book Planning Feature Enable', 'bookPlanningFeatureEnable', 'checkbox')}
                                {renderField('Rigid Box Planning Feature Enable', 'rigidBoxPlanningFeatureEnable', 'checkbox')}
                                {renderField('Shipper Planning Feature Enable', 'shipperPlanningFeatureEnable', 'checkbox')}
                                {renderField('Product Catalog Created', 'isProductCatalogCreated', 'checkbox')}
                                {renderField('Supplier Item Allocation Required', 'isSupplierItemAllocationRequired', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Estimation Settings */}
                    {activeTab === 5 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estimation & Calculation Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('Cost Estimation Method Type', 'costEstimationMethodType')}
                                {renderField('Estimation RoundOff Decimal Place', 'estimationRoundOffDecimalPlace', 'number')}
                                {renderField('Purchase RoundOff Decimal Place', 'purchaseRoundOffDecimalPlace', 'number')}
                                {renderField('Invoice RoundOff Decimal Place', 'invoiceRoundOffDecimalPlace', 'number')}
                                {renderField('Estimation Per Unit Cost Decimal Place', 'estimationPerUnitCostDecimalPlace', 'number')}
                                {renderField('RoundOff Impression Value', 'roundOffImpressionValue', 'number')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                {renderField('Auto RoundOff Not Applicable', 'autoRoundOffNotApplicable', 'checkbox')}
                                {renderField('Weight Calculate On Estimation', 'wtCalculateOnEstimation', 'checkbox')}
                                {renderField('Show Plan Upto Wastage Percentage', 'showPlanUptoWastagePerc', 'checkbox')}
                                {renderField('Wastage Add In Printing Rate', 'isWastageAddInPrintingRate', 'checkbox')}
                                {renderField('Book Half Form Wastage', 'is_Book_Half_Form_Wastage', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 6: Printing/RDLC */}
                    {activeTab === 6 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Printing / RDLC Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                {renderField('Unitwise Printout Setting', 'unitwisePrintoutSetting', 'checkbox')}
                                {renderField('Fast Invoice Print', 'fastInvoicePrint', 'checkbox')}
                                {renderField('Fast E-Invoice Print', 'fastEInvoicePrint', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 7: Production */}
                    {activeTab === 7 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Production Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('Manual Production Entry Time', 'manualProductionEntryTime')}
                                {renderField('Production Entry Back Days', 'productionEntryBackDay', 'number')}
                                {renderField('Production Unit ID', 'productionUnitID', 'number')}
                                {renderField('Buffer GSM Minus', 'bufferGSMMinus', 'number')}
                                {renderField('Buffer GSM Plus', 'bufferGSMPlus', 'number')}
                                {renderField('Buffer Size Minus', 'bufferSizeMinus', 'number')}
                                {renderField('Buffer Size Plus', 'bufferSizePlus', 'number')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                {renderField('Generate Voucher No By Production Unit', 'generateVoucherNoByProductionUnit', 'checkbox')}
                                {renderField('Material Consumption Details Flag', 'materialConsumptionDetailsFlage', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 8: API & Integration */}
                    {activeTab === 8 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API & Integration Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderField('API Base URL', 'apiBaseURL')}
                                {renderField('API Authentication URL', 'apiAuthenticationURL')}
                                {renderField('API Client ID', 'apiClientID')}
                                {renderField('API Client Secret ID', 'apiClientSecretID')}
                                {renderField('Indus API Auth Token', 'indusAPIAuthToken')}
                                {renderField('Client API Auth Token', 'clientAPIAuthToken')}
                                {renderField('Indus API Base URL', 'indusAPIBaseUrl')}
                                {renderField('Client API Base URL', 'clientAPIBaseUrl')}
                                {renderField('Indus Token Auth API', 'indusTokenAuthAPI')}
                                {renderField('Client Token Auth API', 'clientTokenAuthAPI')}
                                {renderField('Indus Mail API Base URL', 'indusMailAPIBaseUrl')}
                                {renderField('API Basic Auth Username', 'apiBasicAuthUserName')}
                                {renderField('API Basic Auth Password', 'apiBasicAuthPassword')}
                                {renderField('Integration Type', 'integrationType')}
                                {renderField('Logout Page', 'logoutPage')}
                                {renderField('Desktop Connection String', 'desktopConnString', 'textarea')}
                                {renderField('Application Configuration', 'applicationConfiguration', 'textarea')}
                                {renderField('Company Static IP', 'companyStaticIP')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                {renderField('API Integration Required', 'apiIntegrationRequired', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 9: Time Settings */}
                    {activeTab === 9 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time & System Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('Time Zone', 'timeZone')}
                                {renderField('Duration', 'duration')}
                                {renderField('End Time', 'end_time')}
                                {renderField('Last Shown Time', 'lastShownTime')}
                                {renderField('Time', 'time')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                {renderField('Message Show', 'messageShow', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 10: Security & OTP */}
                    {activeTab === 10 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security & OTP Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderField('OTP Verification Excluded Devices', 'otpVerificationExcludedDevices', 'textarea')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                {renderField('OTP Verification Feature Enabled', 'otpVerificationFeatureEnabled', 'checkbox')}
                                {renderField('Multiple FYear Not Required', 'multipleFYearNotRequired', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 11: Prefix & References */}
                    {activeTab === 11 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Prefix & Reference Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('Reference Company Code', 'refCompanyCode')}
                                {renderField('Reference Sales Office Code', 'refSalesOfficeCode')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                {renderField('ISOTP Required', 'isotpRequired', 'checkbox')}
                            </div>
                        </div>
                    )}

                    {/* Tab 12: Currency */}
                    {activeTab === 12 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Currency Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('Currency Head Name', 'currencyHeadName')}
                                {renderField('Currency Child Name', 'currencyChildName')}
                                {renderField('Currency Code', 'currencyCode')}
                                {renderField('Currency Symbolic Reference', 'currencySymboliconRef')}
                            </div>
                        </div>
                    )}

                    {/* Tab 13: Miscellaneous */}
                    {activeTab === 13 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Miscellaneous / Other Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {renderField('FAX', 'fax')}
                                {renderField('Backup Path', 'backupPath')}
                                {renderField('Description', 'description', 'textarea')}
                                {renderField('Purchase Tolerance', 'purchaseTolerance', 'number')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                {renderField('Invoice Print Product Wise', 'isInvoicePrintProductWise', 'checkbox')}
                                {renderField('Invoice Block Feature Required', 'isInvoiceBlockFeatureRequired', 'checkbox')}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyMaster;
