import React, { useEffect, useState } from 'react';
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
    Toolbar,
    Item
} from 'devextreme-react/data-grid';
import { Popup } from 'devextreme-react/popup';
import { Button } from 'devextreme-react/button';
import { Form, SimpleItem, Label } from 'devextreme-react/form';
import SelectBox from 'devextreme-react/select-box';
import { getAllModules, createModule, updateModule, deleteModule, getModuleHeads, ModuleDto } from '../services/api';
import toast from 'react-hot-toast';
import 'devextreme/dist/css/dx.light.css';

const ModuleAuthority: React.FC = () => {
    const [modules, setModules] = useState<ModuleDto[]>([]);
    const [moduleHeads, setModuleHeads] = useState<string[]>([]);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [formData, setFormData] = useState<ModuleDto>({} as ModuleDto);
    const [isNewRecord, setIsNewRecord] = useState(true);

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
            toast.error('Failed to load data');
        }
    };

    const handleToolbarPreparing = (e: any) => {
        e.toolbarOptions.items.unshift({
            location: 'after',
            widget: 'dxButton',
            options: {
                icon: 'add',
                text: 'Create Module',
                onClick: () => {
                    setFormData({} as ModuleDto);
                    setIsNewRecord(true);
                    setIsPopupVisible(true);
                }
            }
        });
    };

    const onRowInserting = async (e: any) => {
        // Prevent default grid insertion, handle via Popup
        e.cancel = true;
    };

    // We use the grid's built-in edit button to trigger our custom popup
    const onEditingStart = (e: any) => {
        e.cancel = true; // Cancel internal edit mode
        setFormData({ ...e.data });
        setIsNewRecord(false);
        setIsPopupVisible(true);
    };

    const onRowRemoving = async (e: any) => {
        e.cancel = true; // Handle async
        try {
            await deleteModule(e.data.moduleId);
            toast.success('Module deleted');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete module');
        }
    };

    const handleSave = async () => {
        try {
            if (isNewRecord) {
                await createModule(formData);
                toast.success('Module created successfully');
            } else {
                await updateModule(formData);
                toast.success('Module updated successfully');
            }
            setIsPopupVisible(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save module');
        }
    };

    const handleFieldChange = (field: keyof ModuleDto, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 dark:bg-[#020617] min-h-screen">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Module Authority</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage system modules and hierarchy.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                <DataGrid
                    dataSource={modules}
                    showBorders={true}
                    rowAlternationEnabled={true}
                    onToolbarPreparing={handleToolbarPreparing}
                    onEditingStart={onEditingStart}
                    onRowRemoving={onRowRemoving}
                >
                    <Paging defaultPageSize={10} />
                    <Pager showPageSizeSelector={true} allowedPageSizes={[10, 25, 50, 100]} showInfo={true} />
                    <SearchPanel visible={true} highlightCaseSensitive={true} />
                    <FilterRow visible={true} />
                    <HeaderFilter visible={true} />
                    <Grouping autoExpandAll={false} />
                    <GroupPanel visible={true} />
                    <ColumnChooser enabled={true} />
                    <Editing
                        mode="popup"
                        allowUpdating={true}
                        allowDeleting={true}
                        allowAdding={false} // We typically use toolbar button for Add
                    />

                    <Column dataField="moduleName" caption="Module Name" />
                    <Column dataField="moduleDisplayName" caption="Display Name" />
                    <Column dataField="moduleHeadName" caption="Head Name" groupIndex={0} />
                    <Column dataField="setGroupIndex" caption="Group Index" />

                    {/* Hidden columns available in chooser */}
                    <Column dataField="moduleHeadDisplayName" caption="Head Display Name" visible={false} />
                    <Column dataField="moduleDisplayOrder" caption="Display Order" visible={false} />
                </DataGrid>
            </div>

            <Popup
                visible={isPopupVisible}
                onHiding={() => setIsPopupVisible(false)}
                dragEnabled={true}
                closeOnOutsideClick={false}
                showTitle={true}
                title={isNewRecord ? "Create Module" : "Edit Module"}
                width={700}
                height={600}
            >
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Module Name */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Module Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg"
                                value={formData.moduleName || ''}
                                onChange={(e) => handleFieldChange('moduleName', e.target.value)}
                            />
                        </div>

                        {/* Module Display Name */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Module Display Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg"
                                value={formData.moduleDisplayName || ''}
                                onChange={(e) => handleFieldChange('moduleDisplayName', e.target.value)}
                            />
                        </div>

                        {/* Module Head Name (Dropdown + Custom) */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Module Head Name</label>
                            <SelectBox
                                items={moduleHeads}
                                value={formData.moduleHeadName}
                                onValueChanged={(e) => {
                                    const selectedHeadName = e.value;
                                    handleFieldChange('moduleHeadName', selectedHeadName);

                                    // Logic to auto-populate and disable SetGroupIndex
                                    const existingModule = modules.find(m => m.moduleHeadName === selectedHeadName);
                                    if (existingModule && existingModule.setGroupIndex !== undefined) {
                                        handleFieldChange('setGroupIndex', existingModule.setGroupIndex);
                                        // We can't easily lock a single field via state if not tracked separately, 
                                        // but we can check existence during render or use a new state variable.
                                        // For simplicity in this `replace_file_content`, I'll assume we add the state logic next/simultaneously 
                                        // or handle it via a derived property if possible. 
                                        // ACTUALLY, I should have added the state in `onEditingStart` or `useEffect`.
                                        // Let's do it properly by updating the `handleFieldChange` to logic inside the component body 
                                        // but since this is a specific handler, let's keep it here.
                                    } else {
                                        // New head name, clear setGroupIndex and allow edit
                                        handleFieldChange('setGroupIndex', 0); // Or undefined/null
                                    }
                                }}
                                acceptCustomValue={true}
                                searchEnabled={true}
                                placeholder="Select or type..."
                            />
                        </div>

                        {/* Module Head Display Name (Dropdown + Custom - assuming similar to HeadName) */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Module Head Display Name</label>
                            <SelectBox
                                items={moduleHeads} // Usually correlated, but reusing heads list or plain text
                                value={formData.moduleHeadDisplayName}
                                onValueChanged={(e) => handleFieldChange('moduleHeadDisplayName', e.value)}
                                acceptCustomValue={true}
                                searchEnabled={true}
                                placeholder="Select or type..."
                            />
                        </div>

                        {/* Module Head Display Order */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Module Head Display Order</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg"
                                value={formData.moduleHeadDisplayOrder || ''}
                                onChange={(e) => handleFieldChange('moduleHeadDisplayOrder', parseInt(e.target.value))}
                            />
                        </div>

                        {/* Module Display Order */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Module Display Order</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg"
                                value={formData.moduleDisplayOrder || ''}
                                onChange={(e) => handleFieldChange('moduleDisplayOrder', parseInt(e.target.value))}
                            />
                        </div>

                        {/* Set Group Index */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Set Group Index</label>
                            <input
                                type="number"
                                className={`w-full px-3 py-2 border rounded-lg ${modules.some(m => m.moduleHeadName === formData.moduleHeadName)
                                    ? 'bg-gray-100 cursor-not-allowed'
                                    : ''
                                    }`}
                                value={formData.setGroupIndex || ''}
                                onChange={(e) => handleFieldChange('setGroupIndex', parseInt(e.target.value))}
                                disabled={modules.some(m => m.moduleHeadName === formData.moduleHeadName)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <button
                            onClick={() => setIsPopupVisible(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

export default ModuleAuthority;
