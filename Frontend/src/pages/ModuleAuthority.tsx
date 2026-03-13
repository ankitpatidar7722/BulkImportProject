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
    ColumnChooser
} from 'devextreme-react/data-grid';
import { Popup } from 'devextreme-react/popup';
import SelectBox from 'devextreme-react/select-box';
import { getAllModules, createModule, updateModule, deleteModule, getModuleHeads, ModuleDto } from '../services/api';
import { useMessageModal } from '../components/MessageModal';
import 'devextreme/dist/css/dx.light.css';

const ModuleAuthority: React.FC = () => {
    const navigate = useNavigate();
    const { showMessage, ModalRenderer } = useMessageModal();
    const [modules, setModules] = useState<ModuleDto[]>([]);
    const [moduleHeads, setModuleHeads] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [data, heads] = await Promise.all([getAllModules(), getModuleHeads()]);
            setModules(data);
            setModuleHeads(heads);
        } catch (error) {
            console.error(error);
            showMessage('error', 'Load Error', 'Failed to load module data. Please try refreshing the page.');
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
                    className="custom-datagrid"
                >
                    <Paging defaultPageSize={15} />
                    <Pager 
                        showPageSizeSelector={true} 
                        allowedPageSizes={[10, 15, 25, 50, 100]} 
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
                        dataField="moduleName" 
                        caption="Module Name" 
                        minWidth={250}
                        cellRender={(config) => (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="font-medium text-gray-800 dark:text-gray-200">{config.value}</span>
                            </div>
                        )}
                    />
                    <Column dataField="moduleDisplayName" caption="Display Name" minWidth={200} />
                    <Column 
                        dataField="moduleHeadName" 
                        caption="Head Name" 
                        groupIndex={0} 
                        minWidth={200} 
                    />
                    <Column 
                        dataField="setGroupIndex" 
                        caption="Group Index" 
                        alignment="center"
                        width={120}
                        cellRender={(config) => (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                {config.value ?? '—'}
                            </span>
                        )}
                    />

                    {/* Hidden columns available in chooser */}
                    <Column dataField="moduleHeadDisplayName" caption="Head Display Name" visible={false} />
                    <Column dataField="moduleDisplayOrder" caption="Display Order" visible={false} />
                    <Column dataField="moduleHeadDisplayOrder" caption="Head Display Order" visible={false} />
                </DataGrid>
            </div>
        </div>
    );
};

export default ModuleAuthority;
