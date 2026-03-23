import React, { useState, useCallback, useRef } from 'react';
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
    ColumnChooser
} from 'devextreme-react/data-grid';
import { getModuleAuthorityData, saveModuleAuthority, ModuleAuthorityRowDto, ModuleAuthoritySaveDto } from '../services/api';
import { useMessageModal } from '../components/MessageModal';
import 'devextreme/dist/css/dx.light.css';

interface ModuleRow extends ModuleAuthorityRowDto {
    _status: boolean;
    _id: number;
}

const DynamicModule: React.FC = () => {
    const { showMessage, ModalRenderer } = useMessageModal();
    const gridRef = useRef<DataGrid>(null);

    // State
    const [product, setProduct] = useState('Estimoprime');
    const [modules, setModules] = useState<ModuleRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    // Fetch modules
    const handleShowModules = async () => {
        setLoading(true);
        setHasFetched(false);
        try {
            const data = await getModuleAuthorityData(product);
            setModules(data.map((d, i) => ({ ...d, _status: d.status, _id: i })));
            setHasFetched(true);
        } catch (error: any) {
            console.error(error);
            showMessage('error', 'Fetch Error', error?.response?.data?.error || 'Failed to fetch modules from source database.');
        } finally {
            setLoading(false);
        }
    };

    // Toggle individual checkbox
    const handleToggle = useCallback((rowId: number) => {
        setModules(prev => prev.map(m => m._id === rowId ? { ...m, _status: !m._status } : m));
    }, []);

    // Select all / Deselect all
    const handleSelectAll = useCallback(() => {
        setModules(prev => {
            const allChecked = prev.every(m => m._status);
            return prev.map(m => ({ ...m, _status: !allChecked }));
        });
    }, []);

    // Save
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: ModuleAuthoritySaveDto[] = modules.map(m => ({
                moduleHeadName: m.moduleHeadName,
                moduleDisplayName: m.moduleDisplayName,
                status: m._status
            }));

            const result = await saveModuleAuthority(product, payload);
            showMessage(
                'success',
                'Saved Successfully',
                `Inserted: ${result.inserted} | Enabled: ${result.enabled} | Disabled: ${result.disabled}`
            );

            await handleShowModules();
        } catch (error: any) {
            console.error(error);
            showMessage('error', 'Save Error', error?.response?.data?.error || 'Failed to save module authority changes.');
        } finally {
            setSaving(false);
        }
    };

    const changeCount = modules.filter(m => m._status !== m.status).length;
    const checkedCount = modules.filter(m => m._status).length;
    const allChecked = modules.length > 0 && modules.every(m => m._status);

    // Custom cell render for Status checkbox
    const statusCellRender = useCallback((cellData: any) => {
        const row = cellData.data as ModuleRow;
        const isChanged = row._status !== row.status;
        return (
            <div className="flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={row._status}
                    onChange={() => handleToggle(row._id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                {isChanged && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Changed"></span>
                )}
            </div>
        );
    }, [handleToggle]);

    // Custom header for Status column with Select All
    const statusHeaderRender = useCallback(() => {
        return (
            <div className="flex items-center justify-center gap-2">
                <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span>Status</span>
            </div>
        );
    }, [allChecked, handleSelectAll]);

    // Row styling for changed rows
    const onRowPrepared = useCallback((e: any) => {
        if (e.rowType === 'data') {
            const row = e.data as ModuleRow;
            if (row._status !== row.status) {
                e.rowElement.style.backgroundColor = '#fffbeb';
            }
        }
    }, []);

    return (
        <div className="p-6 md:p-8 space-y-6 bg-gray-50 dark:bg-[#020617] min-h-screen">
            {ModalRenderer}

            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                    Module Authority
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                    Sync modules from the source database. Compare, enable, disable, or insert modules into your current login database.
                </p>
            </div>

            {/* Controls Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    {/* Product Dropdown */}
                    <div className="w-full sm:w-64">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Product
                        </label>
                        <select
                            value={product}
                            onChange={e => setProduct(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                        >
                            <option value="Estimoprime">Estimoprime</option>
                            <option value="Printude">Printude</option>
                        </select>
                    </div>

                    {/* Show Module Button */}
                    <button
                        onClick={handleShowModules}
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-2 shadow-sm"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Loading...
                            </>
                        ) : (
                            'Show Module'
                        )}
                    </button>
                </div>
            </div>

            {/* Grid Section */}
            {hasFetched && (
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {/* Stats Bar */}
                    <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Total: <span className="font-semibold text-gray-900 dark:text-white">{modules.length}</span>
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Active: <span className="font-semibold text-green-600">{checkedCount}</span>
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Inactive: <span className="font-semibold text-red-500">{modules.length - checkedCount}</span>
                        </span>
                        {changeCount > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                {changeCount} change{changeCount > 1 ? 's' : ''} pending
                            </span>
                        )}
                    </div>

                    {/* DevExtreme DataGrid */}
                    <DataGrid
                        ref={gridRef}
                        dataSource={modules}
                        keyExpr="_id"
                        showBorders={false}
                        showRowLines={true}
                        showColumnLines={false}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        columnAutoWidth={true}
                        wordWrapEnabled={true}
                        onRowPrepared={onRowPrepared}
                        height="calc(100vh - 380px)"
                    >
                        <Sorting mode="multiple" />
                        <Paging defaultPageSize={500} />
                        <Pager
                            showPageSizeSelector={true}
                            allowedPageSizes={[100, 250, 500, 1000]}
                            showInfo={true}
                            showNavigationButtons={true}
                            displayMode="full"
                        />

                        <SearchPanel visible={true} width={280} placeholder="Search modules..." highlightSearchText={true} />
                        <FilterRow visible={true} />
                        <HeaderFilter visible={true} />

                        <Grouping autoExpandAll={false} contextMenuEnabled={true} expandMode="rowClick" />
                        <GroupPanel visible={true} emptyPanelText="Drag a column header here to group" />
                        <ColumnChooser enabled={true} mode="select" />

                        <Column
                            dataField="_id"
                            caption="#"
                            width={60}
                            alignment="center"
                            allowFiltering={false}
                            allowSorting={false}
                            allowGrouping={false}
                            cellRender={(cellData: any) => (
                                <span className="text-gray-400 font-mono text-xs">{cellData.rowIndex + 1}</span>
                            )}
                        />
                        <Column
                            dataField="moduleHeadName"
                            caption="Module Head Name"
                            minWidth={250}
                            cellRender={(cellData: any) => (
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{cellData.value}</span>
                                </div>
                            )}
                        />
                        <Column
                            dataField="moduleDisplayName"
                            caption="Module Display Name"
                            minWidth={250}
                        />
                        <Column
                            caption="Status"
                            width={120}
                            alignment="center"
                            allowFiltering={false}
                            allowSorting={false}
                            allowGrouping={false}
                            cellRender={statusCellRender}
                            headerCellRender={statusHeaderRender}
                        />
                    </DataGrid>
                </div>
            )}

            {/* Save Button */}
            {hasFetched && modules.length > 0 && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving || changeCount === 0}
                        className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-2 shadow-sm"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            `Save Module${changeCount > 0 ? ` (${changeCount} change${changeCount > 1 ? 's' : ''})` : ''}`
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DynamicModule;
