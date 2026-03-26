import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Search, Plus, Check, Trash2 } from 'lucide-react';
import {
    getMessageFormats,
    createMessageFormat,
    deleteMessageFormat,
    MessageFormatDto,
} from '../services/api';

import DataGrid, {
    Column,
    Paging,
    SearchPanel,
    Selection,
    Sorting,
} from 'devextreme-react/data-grid';
import 'devextreme/dist/css/dx.light.css';

interface MessageFormatPopupProps {
    visible: boolean;
    onClose: () => void;
    onLoadMessage: (messageContent: string) => void;
}

const MessageFormatPopup: React.FC<MessageFormatPopupProps> = ({ visible, onClose, onLoadMessage }) => {
    const [messages, setMessages] = useState<MessageFormatDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<MessageFormatDto | null>(null);
    const [previewMessage, setPreviewMessage] = useState<string>('');

    // Add new template state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const fetchMessages = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getMessageFormats();
            if (response.success) {
                setMessages(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch message formats:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            fetchMessages();
            setSelectedMessage(null);
            setPreviewMessage('');
            setShowAddForm(false);
        }
    }, [visible, fetchMessages]);

    const handleRowClick = (e: any) => {
        const data = e.data as MessageFormatDto;
        setSelectedMessage(data);
        setPreviewMessage(data.messageContent);
    };

    const handleRowDblClick = (e: any) => {
        const data = e.data as MessageFormatDto;
        onLoadMessage(data.messageContent);
        onClose();
    };

    const handleLoadMessage = () => {
        if (selectedMessage) {
            onLoadMessage(selectedMessage.messageContent);
            onClose();
        }
    };

    const handleAddTemplate = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        setIsAdding(true);
        try {
            const response = await createMessageFormat({
                messageTitle: newTitle.trim(),
                messageContent: newContent.trim(),
                isActive: true,
            });
            if (response.success) {
                setNewTitle('');
                setNewContent('');
                setShowAddForm(false);
                await fetchMessages();
            }
        } catch (error) {
            console.error('Failed to create message template:', error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteTemplate = async (messageId: number) => {
        try {
            const response = await deleteMessageFormat(messageId);
            if (response.success) {
                if (selectedMessage?.messageID === messageId) {
                    setSelectedMessage(null);
                    setPreviewMessage('');
                }
                await fetchMessages();
            }
        } catch (error) {
            console.error('Failed to delete message template:', error);
        }
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
            style={{ animation: 'fadeIn 0.15s ease-out' }}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col"
                style={{ maxHeight: '80vh' }}>

                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-white">Select Message Format</h2>
                        <p className="text-[11px] text-amber-100 mt-0.5">Choose a predefined message template</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleLoadMessage}
                            disabled={!selectedMessage}
                            className={`flex items-center gap-1.5 h-8 px-4 text-[12px] font-semibold rounded-lg transition-all duration-150 ${selectedMessage
                                ? 'bg-white text-amber-700 hover:bg-amber-50 shadow-sm'
                                : 'bg-white/30 text-white/60 cursor-not-allowed'
                                }`}
                        >
                            <Check className="w-3.5 h-3.5" /> Load Message
                        </button>
                        <button onClick={onClose}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col p-4 gap-3">
                    {/* Action bar */}
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
                            {messages.length} template{messages.length !== 1 ? 's' : ''} available
                        </span>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Template
                        </button>
                    </div>

                    {/* Add form */}
                    {showAddForm && (
                        <div className="border border-amber-200 dark:border-amber-700/40 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2">
                            <input
                                type="text"
                                placeholder="Message Title"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                className="w-full h-8 px-3 text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                            />
                            <textarea
                                placeholder="Message Content"
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => { setShowAddForm(false); setNewTitle(''); setNewContent(''); }}
                                    className="h-8 px-3 text-[12px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleAddTemplate}
                                    disabled={!newTitle.trim() || !newContent.trim() || isAdding}
                                    className="flex items-center gap-1 h-8 px-3 text-[12px] font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                    Save
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                            <span className="ml-2.5 text-[13px] text-gray-400">Loading templates...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                            <Search className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                            <p className="text-[13px] text-gray-400 dark:text-gray-500">No message templates found.</p>
                            <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">Click "Add Template" to create one.</p>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-auto">
                            <DataGrid
                                dataSource={messages}
                                keyExpr="messageID"
                                showBorders={false}
                                showRowLines={true}
                                showColumnLines={false}
                                rowAlternationEnabled={true}
                                hoverStateEnabled={true}
                                onRowClick={handleRowClick}
                                onRowDblClick={handleRowDblClick}
                                height="100%"
                                columnAutoWidth={true}
                                selectedRowKeys={selectedMessage ? [selectedMessage.messageID] : []}
                            >
                                <SearchPanel visible={true} placeholder="Search templates..." width={220} />
                                <Selection mode="single" />
                                <Sorting mode="single" />
                                <Paging enabled={true} pageSize={10} />

                                <Column dataField="messageTitle" caption="Message Title" width={200} />
                                <Column dataField="messageContent" caption="Message Content" />
                                <Column
                                    width={50}
                                    alignment="center"
                                    cellRender={(cellData: any) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTemplate(cellData.data.messageID);
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete template"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                />
                            </DataGrid>
                        </div>
                    )}

                    {/* Preview */}
                    {previewMessage && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Preview</p>
                            <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default MessageFormatPopup;
