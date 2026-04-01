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
    Scrolling
} from 'devextreme-react/data-grid';
import { getAllModules, deleteModule, ModuleDto } from '../services/api';
import { useMessageModal } from '../components/MessageModal';
import 'devextreme/dist/css/dx.light.css';

const ModuleAuthority: React.FC = () => {
    const navigate = useNavigate();
    const { showMessage, ModalRenderer } = useMessageModal();
    const [modules, setModules] = useState<ModuleDto[]>([]);

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
