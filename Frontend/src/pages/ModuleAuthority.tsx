import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataGrid, {
    Column,
    Paging,
    Pager,
    SearchPanel,
    FilterRow,
    HeaderFilter,
    Grouping,
    GroupPanel,
    Editing,
    ColumnChooser,
    Scrolling,
    Button,
    LoadPanel
} from 'devextreme-react/data-grid';
import { 
    getAllModules, 
    deleteModule, 
    ModuleDto, 
    getItemGroupComparison, 
    ItemGroupComparisonDto,
    syncItemGroups
} from '../services/api';
import { useMessageModal } from '../components/MessageModal';
import { Popup } from 'devextreme-react/popup';
import 'devextreme/dist/css/dx.light.css';

const ModuleAuthority: React.FC = () => {
    const navigate = useNavigate();
    const { showMessage, ModalRenderer } = useMessageModal();
    const [modules, setModules] = useState<ModuleDto[]>([]);
    
    // Group Management Popup State
    const [isGroupPopupVisible, setIsGroupPopupVisible] = useState(false);
    const [groupComparisonData, setGroupComparisonData] = useState<ItemGroupComparisonDto[]>([]);
    const [isGroupLoading, setIsGroupLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeGroupType, setActiveGroupType] = useState<'Item' | 'Ledger' | 'Tool'>('Item');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getAllModules();
            setModules(data);
        } catch (error) {
            console.error(error);
            showMessage('error', 'Load Error', 'Failed to load module data. Please try refreshing the page.');
        }
    };

    const handleManageGroupsClick = async (type: 'Item' | 'Ledger' | 'Tool') => {
        setActiveGroupType(type);
        setIsGroupPopupVisible(true);
        setIsGroupLoading(true);
        try {
            const data = await getItemGroupComparison(type);
            setGroupComparisonData(data);
        } catch (error) {
            console.error(error);
            showMessage('error', 'Error', `Failed to fetch ${type} comparison data.`);
        } finally {
            setIsGroupLoading(false);
        }
    };

    const handleSaveSync = async () => {
        setIsSaving(true);
        try {
            await syncItemGroups(groupComparisonData, activeGroupType);
            showMessage('success', 'Success', `${activeGroupType} groups synchronized successfully!`);
            handleManageGroupsClick(activeGroupType);
        } catch (error) {
            console.error(error);
            showMessage('error', 'Sync Failed', `Failed to synchronize ${activeGroupType} groups.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToolbarPreparing = (e: any) => {
        e.toolbarOptions.items.unshift({
            location: 'after',
            widget: 'dxButton',
            options: {
                icon: 'add',
                text: 'Create Module',
                type: 'success',
                onClick: () => navigate('/create-module'),
            }
        });
    };

    const onEditingStart = (e: any) => {
        e.cancel = true; // Cancel internal edit mode
        navigate('/create-module', { state: { moduleData: e.data } });
    };

    const onRowRemoving = async (e: any) => {
        e.cancel = true; // Handle async
        try {
            await deleteModule(e.data.moduleId);
            showMessage('success', 'Module Deleted', 'The module has been successfully deleted.');
            loadData();
        } catch (error) {
            console.error(error);
            showMessage('error', 'Delete Failed', 'Failed to delete the module. Please try again.');
        }
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 dark:bg-[#020617] min-h-screen">
            {ModalRenderer}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">Active Modules</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                    View, manage, and arrange all system modules. Drag headers to group, or use the toolbar to find specific entries.
                </p>
            </div>

            <div className="bg-white dark:bg-[#0f172a] p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <DataGrid
                    dataSource={modules}
                    keyExpr="moduleId"
                    showBorders={false}
                    showRowLines={true}
                    showColumnLines={false}
                    rowAlternationEnabled={true}
                    hoverStateEnabled={true}
                    focusedRowEnabled={true}
                    columnAutoWidth={false}
                    wordWrapEnabled={true}
                    onToolbarPreparing={handleToolbarPreparing}
                    onEditingStart={onEditingStart}
                    onRowRemoving={onRowRemoving}
                    height="calc(100vh - 280px)"
                    className="custom-datagrid"
                >
                    <Scrolling mode="virtual" rowRenderingMode="virtual" />
                    <Paging defaultPageSize={50} />
                    <Pager 
                        showPageSizeSelector={true} 
                        allowedPageSizes={[50, 100, 200, 500, 1000]} 
                        showInfo={true} 
                        showNavigationButtons={true} 
                    />
                    
                    <SearchPanel visible={true} width={280} placeholder="Search modules..." />
                    <FilterRow visible={true} />
                    <HeaderFilter visible={true} />
                    
                    <Grouping autoExpandAll={false} contextMenuEnabled={true} expandMode="rowClick" />
                    <GroupPanel visible={true} emptyPanelText="Drag a column header here to group modules" />
                    <ColumnChooser enabled={true} mode="select" />
                    
                    <Editing
                        mode="popup"
                        allowUpdating={true}
                        allowDeleting={true}
                        allowAdding={false}
                        useIcons={true}
                    />

                    <Column 
                        dataField="moduleHeadName" 
                        caption="Module Head Name" 
                        minWidth={200}
                        allowGrouping={true}
                    />
                    <Column 
                        dataField="moduleName" 
                        caption="Module Name" 
                        minWidth={200}
                        cellRender={(config) => (
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                <span className="font-medium text-gray-800 dark:text-gray-200">{config.value}</span>
                            </div>
                        )}
                    />
                    <Column dataField="moduleDisplayName" caption="Module Display Name" minWidth={220} />
                    
                    <Column 
                        dataField="setGroupIndex" 
                        caption="Group Index" 
                        alignment="center"
                        width={120}
                    />

                    {/* Action Buttons Column */}
                    <Column type="buttons" width={120}>
                        <Button
                            icon="group"
                            hint="Manage Groups"
                            visible={(e: any) => 
                                e.row.data.moduleName === 'Masters.aspx' || 
                                e.row.data.moduleName === 'LedgerMaster.aspx' ||
                                e.row.data.moduleName === 'ToolMaster.aspx'
                            }
                            onClick={(e: any) => {
                                let type: 'Item' | 'Ledger' | 'Tool' = 'Item';
                                if (e.row.data.moduleName === 'LedgerMaster.aspx') type = 'Ledger';
                                else if (e.row.data.moduleName === 'ToolMaster.aspx') type = 'Tool';
                                
                                handleManageGroupsClick(type);
                            }}
                        />
                        <Button name="edit" />
                        <Button name="delete" />
                    </Column>

                    <Column dataField="moduleHeadDisplayName" caption="Head Display Name" visible={false} />
                    <Column dataField="moduleDisplayOrder" caption="Display Order" visible={false} />
                    <Column dataField="moduleHeadDisplayOrder" caption="Head Display Order" visible={false} />
                </DataGrid>
            </div>

            {/* Group Management Popup */}
            <Popup
                visible={isGroupPopupVisible}
                onHiding={() => setIsGroupPopupVisible(false)}
                dragEnabled={false}
                hideOnOutsideClick={false}
                showTitle={true}
                title={`${activeGroupType} Group Sync Status`}
                width={800}
                height={600}
            >
                <div className="p-4 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-gray-500">
                            Syncing {activeGroupType} groups from Source to Client database.
                        </p>
                        <button 
                            onClick={() => handleManageGroupsClick(activeGroupType)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100"
                        >
                            Refresh
                        </button>
                    </div>
                    <div className="flex-grow border rounded-lg overflow-hidden">
                        <DataGrid
                            dataSource={groupComparisonData}
                            keyExpr="itemGroupId"
                            showBorders={false}
                            height="100%"
                        >
                            <LoadPanel enabled={isGroupLoading} />
                            <Editing mode="cell" allowUpdating={true} />
                            
                            <Column dataField="itemGroupId" caption="ID" width={60} allowEditing={false} />
                            <Column dataField="itemGroupName" caption={`${activeGroupType} Group Name`} allowEditing={false} />
                            <Column 
                                dataField="status" 
                                caption="Status" 
                                alignment="center" 
                                width={100}
                                dataType="boolean"
                            />
                            <Column 
                                caption="Details" 
                                allowEditing={false}
                                cellRender={(data: any) => {
                                    const row = data.data;
                                    if (!row.existsInClient) return <span className="text-xs text-red-500 font-medium">Inactive</span>;
                                    if (row.isDeletedInClient) return <span className="text-xs text-orange-500 font-medium">Inactive</span>;
                                    return <span className="text-xs text-green-600 font-medium">Active</span>;
                                }}
                            />
                        </DataGrid>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                        <button 
                            onClick={() => setIsGroupPopupVisible(false)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                        <button 
                            onClick={handleSaveSync}
                            disabled={isSaving}
                            className={`px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

export default ModuleAuthority;
