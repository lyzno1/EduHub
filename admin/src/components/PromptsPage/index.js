import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Switch, Tabs, Card, Col, Row, Popconfirm, Tooltip, Space } from 'antd';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { PlusOutlined, EditOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { API_URL } from '../../config/config';

const { TabPane } = Tabs;

const PromptsPage = () => {
    // State for General Prompts (Function Cards)
    const [generalPromptFolders, setGeneralPromptFolders] = useState([]);
    const [isGeneralPromptFolderModalVisible, setIsGeneralPromptFolderModalVisible] = useState(false);
    const [editingGeneralPromptFolder, setEditingGeneralPromptFolder] = useState(null);
    const [generalPromptFolderForm] = Form.useForm();

    const [isGeneralPromptItemModalVisible, setIsGeneralPromptItemModalVisible] = useState(false);
    const [editingGeneralPromptItem, setEditingGeneralPromptItem] = useState(null);
    const [currentGeneralPromptParentFolderId, setCurrentGeneralPromptParentFolderId] = useState(null);
    const [generalPromptItemForm] = Form.useForm();
    
    // State for AppCard Prompts
    const [appCardPrompts, setAppCardPrompts] = useState({});
    const [isAppCardAppModalVisible, setIsAppCardAppModalVisible] = useState(false);
    const [editingAppCardAppKey, setEditingAppCardAppKey] = useState(null); 
    const [appCardAppForm] = Form.useForm();

    const [isAppCardPromptItemModalVisible, setIsAppCardPromptItemModalVisible] = useState(false);
    const [currentEditingAppCardAppKey, setCurrentEditingAppCardAppKey] = useState(null);
    const [editingAppCardPromptItem, setEditingAppCardPromptItem] = useState(null); 
    const [appCardPromptItemForm] = Form.useForm();

    // Common state
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    const fetchAllPromptsData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/getPrompts`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setGeneralPromptFolders(Array.isArray(data.generalPrompts) ? data.generalPrompts : []);
            setAppCardPrompts(typeof data.appCardPrompts === 'object' && data.appCardPrompts !== null ? data.appCardPrompts : {});
        } catch (error) {
            console.error('Failed to fetch prompts data:', error);
            message.error('获取提示词数据失败: ' + error.message);
            setGeneralPromptFolders([]);
            setAppCardPrompts({});
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllPromptsData();
    }, [fetchAllPromptsData]);

    // --- General Prompts (Function Cards) Folder Management ---
    const reorderGeneralPromptFoldersList = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };
    
    const handleGeneralPromptFolderDragEnd = async (result) => {
        const { source, destination } = result;
        if (!destination || (source.index === destination.index && source.droppableId === destination.droppableId)) {
            return;
        }
        const reorderedFolders = reorderGeneralPromptFoldersList(generalPromptFolders, source.index, destination.index);
        setGeneralPromptFolders(reorderedFolders); 

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/general-prompts/folders/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedFolders: reorderedFolders }),
            });
            if (!response.ok) throw new Error('Failed to update folder order on server');
            message.success('功能卡片组顺序更新成功');
        } catch (error) {
            console.error('Failed to update folder order:', error);
            message.error('更新功能卡片组顺序失败');
            fetchAllPromptsData(); 
        } finally {
            setLoading(false);
        }
    };

    const showAddGeneralPromptFolderModal = () => {
        setEditingGeneralPromptFolder(null);
        generalPromptFolderForm.resetFields();
        setIsGeneralPromptFolderModalVisible(true);
    };

    const showEditGeneralPromptFolderModal = (folder) => {
        setEditingGeneralPromptFolder(folder);
        generalPromptFolderForm.setFieldsValue(folder);
        setIsGeneralPromptFolderModalVisible(true);
    };

    const handleGeneralPromptFolderFormSubmit = async (values) => {
        setLoading(true);
        const url = editingGeneralPromptFolder
            ? `${API_URL}/api/general-prompts/folders/${editingGeneralPromptFolder.id}`
            : `${API_URL}/api/general-prompts/folders`;
        const method = editingGeneralPromptFolder ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || `Failed to ${editingGeneralPromptFolder ? 'update' : 'add'} folder`);
            }
            message.success(`功能卡片组 ${editingGeneralPromptFolder ? '更新' : '添加'}成功`);
            setIsGeneralPromptFolderModalVisible(false);
            fetchAllPromptsData();
        } catch (error) {
            console.error(`Failed to ${editingGeneralPromptFolder ? 'update' : 'add'} folder:`, error);
            message.error(error.message || `操作失败`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteGeneralPromptFolder = async (folderId) => {
        const folderToDelete = generalPromptFolders.find(f => f.id === folderId);
        if (folderToDelete && folderToDelete.children && folderToDelete.children.length > 0) {
            message.error('无法删除：请先清空此功能卡片组内的所有提示词条目。');
            return;
        }
        Modal.confirm({
            title: '确定删除此功能卡片组吗?',
            content: '此操作不可撤销。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                setLoading(true);
                try {
                    const response = await fetch(`${API_URL}/api/general-prompts/folders/${folderId}`, {
                        method: 'DELETE',
                    });
                     if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || '删除失败');
                    }
                    message.success('功能卡片组删除成功');
                    fetchAllPromptsData();
                } catch (error) {
                    console.error('Failed to delete folder:', error);
                    message.error(`删除失败: ${error.message}`);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    // --- General Prompts (Function Cards) Child Item Management ---
    const showAddGeneralPromptItemModal = (folderId) => {
        setCurrentGeneralPromptParentFolderId(folderId);
        setEditingGeneralPromptItem(null);
        generalPromptItemForm.resetFields();
        setIsGeneralPromptItemModalVisible(true);
    };

    const showEditGeneralPromptItemModal = (promptItem, parentFolderId) => {
        setEditingGeneralPromptItem(promptItem);
        setCurrentGeneralPromptParentFolderId(parentFolderId);
        generalPromptItemForm.setFieldsValue({name: promptItem.name, content: promptItem.prompt });
        setIsGeneralPromptItemModalVisible(true);
    };

    const handleGeneralPromptItemFormSubmit = async (values) => {
        setLoading(true);
        const { name, content } = values;
        const promptData = { name, prompt: content }; 

        let url;
        let method;

        if (editingGeneralPromptItem) {
            url = `${API_URL}/api/general-prompts/prompts/${editingGeneralPromptItem.id}`;
            method = 'PUT';
            promptData.folderId = currentGeneralPromptParentFolderId;
        } else {
            url = `${API_URL}/api/general-prompts/folders/${currentGeneralPromptParentFolderId}/prompts`;
            method = 'POST';
        }

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promptData),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Failed to ${editingGeneralPromptItem ? 'update' : 'add'} prompt item`);
            }
            message.success(`提示词条目 ${editingGeneralPromptItem ? '更新' : '添加'}成功`);
            setIsGeneralPromptItemModalVisible(false);
            fetchAllPromptsData(); 
        } catch (error) {
            console.error(`Failed to ${editingGeneralPromptItem ? 'update' : 'add'} prompt item:`, error);
            message.error(error.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGeneralPromptItem = async (promptId, folderId) => {
        Modal.confirm({
            title: '确定删除此提示词条目吗?',
            content: '此操作不可撤销。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                setLoading(true);
                try {
                    const response = await fetch(`${API_URL}/api/general-prompts/folders/${folderId}/prompts/${promptId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || '删除失败');
                    }
                    message.success('提示词条目删除成功');
                    fetchAllPromptsData();
                } catch (error) {
                    console.error('Failed to delete prompt item:', error);
                    message.error(`删除失败: ${error.message}`);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    // --- AppCard Prompts App Group Management ---
    const showAddAppCardAppGroupModal = () => {
        setEditingAppCardAppKey(null);
        appCardAppForm.setFieldsValue({ appKey: '', prompts: JSON.stringify({}, null, 2) });
        setIsAppCardAppModalVisible(true);
    };

    const showEditAppCardAppGroupModal = (appKeyToEdit) => {
        setEditingAppCardAppKey(appKeyToEdit);
        appCardAppForm.setFieldsValue({ 
            appKey: appKeyToEdit, 
            prompts: JSON.stringify(appCardPrompts[appKeyToEdit] || {}, null, 2) 
        });
        setIsAppCardAppModalVisible(true);
    };
    
    const handleAppCardAppGroupFormSubmit = async (values) => {
        setLoading(true);
        const { appKey } = values; 
        let promptsObject;
        try {
            promptsObject = JSON.parse(values.prompts);
            if (typeof promptsObject !== 'object' || promptsObject === null) {
                throw new Error("Prompts must be a valid JSON object.");
            }
        } catch (e) {
            message.error("提示词内容不是有效的 JSON 对象格式！");
            setLoading(false);
            return;
        }

        const targetAppKey = editingAppCardAppKey || appKey; 

        try {
            const response = await fetch(`${API_URL}/api/app-card-prompts/${targetAppKey}`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promptsObject),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Failed to save AppCard prompts for ${targetAppKey}`);
            }
            message.success(`应用 "${targetAppKey}" 的提示词组保存成功`);
            setIsAppCardAppModalVisible(false);
            fetchAllPromptsData();
        } catch (error) {
            console.error(`Failed to save AppCard prompts for ${targetAppKey}:`, error);
            message.error(error.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAppCardAppGroup = async (appKeyToDelete) => {
        Modal.confirm({
            title: `确定删除应用 "${appKeyToDelete}" 的所有提示词吗?`,
            content: '此操作不可撤销。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                setLoading(true);
                try {
                    const response = await fetch(`${API_URL}/api/app-card-prompts/${appKeyToDelete}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || '删除失败');
                    }
                    message.success(`应用 "${appKeyToDelete}" 的提示词组已删除`);
                    fetchAllPromptsData();
                } catch (error) {
                    console.error(`Failed to delete AppCard app ${appKeyToDelete}:`, error);
                    message.error(`删除失败: ${error.message}`);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    // --- AppCard Prompt Item Management ---
    const showAddAppCardPromptItemModal = (appKey) => {
        setCurrentEditingAppCardAppKey(appKey);
        setEditingAppCardPromptItem(null); 
        appCardPromptItemForm.resetFields();
        setIsAppCardPromptItemModalVisible(true);
    };

    const showEditAppCardPromptItemModal = (appKey, promptKey, content) => {
        setCurrentEditingAppCardAppKey(appKey);
        setEditingAppCardPromptItem({ promptKey, content }); 
        appCardPromptItemForm.setFieldsValue({ promptKey, content });
        setIsAppCardPromptItemModalVisible(true);
    };

    const handleAppCardPromptItemFormSubmit = async (values) => {
        setLoading(true);
        const { promptKey: newPromptKey, content } = values;
        const appKey = currentEditingAppCardAppKey;
        const originalPromptKey = editingAppCardPromptItem?.promptKey;

        try {
            if (originalPromptKey && originalPromptKey !== newPromptKey) {
                const deleteResponse = await fetch(`${API_URL}/api/app-card-prompts/${appKey}/prompts/${originalPromptKey}`, { method: 'DELETE' });
                if (!deleteResponse.ok && deleteResponse.status !== 404) { 
                    const errorText = await deleteResponse.text();
                    throw new Error(`Failed to delete old prompt key "${originalPromptKey}": ${errorText}`);
                }
            }

            const response = await fetch(`${API_URL}/api/app-card-prompts/${appKey}/prompts/${newPromptKey}`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Failed to save prompt "${newPromptKey}" for app "${appKey}"`);
            }
            message.success(`应用 "${appKey}" 内的提示词 "${newPromptKey}" 保存成功`);
            setIsAppCardPromptItemModalVisible(false);
            fetchAllPromptsData();
        } catch (error) {
            console.error(`Failed to save prompt item for ${appKey}:`, error);
            message.error(error.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteAppCardPromptItem = async (appKey, promptKeyToDelete) => {
         Modal.confirm({
            title: `确定删除应用 "${appKey}" 下的提示词 "${promptKeyToDelete}" 吗?`,
            content: '此操作不可撤销。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                setLoading(true);
                try {
                    const response = await fetch(`${API_URL}/api/app-card-prompts/${appKey}/prompts/${promptKeyToDelete}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || '删除失败');
                    }
                    message.success(`提示词 "${promptKeyToDelete}" 已从应用 "${appKey}" 删除`);
                    fetchAllPromptsData();
                } catch (error) {
                    console.error(`Failed to delete prompt item ${promptKeyToDelete} from ${appKey}:`, error);
                    message.error(`删除失败: ${error.message}`);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    // --- Render Methods ---
    const generalPromptItemTableColumns = (folderId) => [
        { title: '条目名称', dataIndex: 'name', key: 'name', width: '30%' },
        { title: '提示词内容 (Prompt)', dataIndex: 'prompt', key: 'prompt', ellipsis: true },
        {
            title: '操作',
            key: 'action',
            width: 120, 
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="编辑条目">
                        <Button size="small" icon={<EditOutlined />} onClick={() => showEditGeneralPromptItemModal(record, folderId)} />
                    </Tooltip>
                    <Tooltip title="删除条目">
                        <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeleteGeneralPromptItem(record.id, folderId)} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const generalPromptFolderTableColumns = [
        { title: '卡片组名称', dataIndex: 'name', key: 'name', width: '25%' },
        { title: '图标', dataIndex: 'icon', key: 'icon', width: '15%' },
        { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
        {
            title: '操作',
            key: 'action',
            width: 200, 
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="编辑卡片组信息">
                        <Button size="small" icon={<EditOutlined />} onClick={() => showEditGeneralPromptFolderModal(record)} />
                    </Tooltip>
                    <Tooltip title="删除卡片组">
                        <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeleteGeneralPromptFolder(record.id)} />
                    </Tooltip>
                    <Button size="small" onClick={() => showAddGeneralPromptItemModal(record.id)} icon={<PlusOutlined />}>提示词</Button>
                </Space>
            ),
        },
    ];
    
    const renderGeneralPromptsManagement = () => {
        return (
            <Card title="通用提示词 / 功能卡片组管理">
                <p>管理通用的提示词集合，这些通常以功能卡片组的形式展示。您可以创建、编辑、删除和排序这些卡片组，并管理组内的提示词条目。</p>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showAddGeneralPromptFolderModal}
                    style={{ marginBottom: 16 }}
                >
                    新增功能卡片组
                </Button>
                <DragDropContext onDragEnd={handleGeneralPromptFolderDragEnd}>
                    <Droppable droppableId="generalPromptFoldersDroppableTable">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                <Table
                                    loading={loading}
                                    dataSource={generalPromptFolders}
                                    columns={generalPromptFolderTableColumns}
                                    rowKey="id"
                                    pagination={false}
                                    expandable={{
                                        expandedRowRender: folder => (
                                            <Table
                                                columns={generalPromptItemTableColumns(folder.id)}
                                                dataSource={folder.children || []}
                                                rowKey="id"
                                                pagination={false}
                                                size="small"
                                                locale={{ emptyText: '此卡片组内暂无提示词条目' }}
                                            />
                                        ),
                                        rowExpandable: folder => true, 
                                    }}
                                    components={{
                                        body: {
                                            row: (props) => {
                                                const index = generalPromptFolders.findIndex(item => item.id === props['data-row-key']);
                                                if (index < 0) return <tr {...props} />; 
                                                return (
                                                    <Draggable key={props['data-row-key']} draggableId={String(props['data-row-key'])} index={index}>
                                                        {(providedDrag, snapshot) => (
                                                            <tr
                                                                ref={providedDrag.innerRef}
                                                                {...providedDrag.draggableProps}
                                                                {...providedDrag.dragHandleProps}
                                                                style={{
                                                                    ...props.style,
                                                                    ...providedDrag.draggableProps.style,
                                                                    backgroundColor: snapshot.isDragging ? 'aliceblue' : '',
                                                                    cursor: 'move',
                                                                }}
                                                                className={props.className}
                                                            >
                                                                {props.children}
                                                            </tr>
                                                        )}
                                                    </Draggable>
                                                );
                                            },
                                        },
                                    }}
                                />
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </Card>
        );
    };

    const renderAppCardPromptsManagement = () => {
        return (
            <Card title="应用内快捷提示词管理">
                 <p>此区域用于管理各个应用内嵌的快捷提示词。例如，为 "DeepSeek" 应用配置特定的搜索或知识库查询提示。</p>
                 <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showAddAppCardAppGroupModal}
                    style={{ marginBottom: 16 }}
                >
                    新增应用提示词组
                </Button>
                <Row gutter={[16, 16]}>
                    {Object.entries(appCardPrompts).map(([appKey, prompts]) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={appKey}>
                            <Card 
                                title={`应用: ${appKey}`} 
                                actions={[
                                    <Tooltip title="编辑此应用组的所有提示词 (JSON 编辑)"><EditOutlined key="edit-app" onClick={() => showEditAppCardAppGroupModal(appKey)} /></Tooltip>,
                                    <Tooltip title="删除此应用组及其所有提示词"><DeleteOutlined key="delete-app" onClick={() => handleDeleteAppCardAppGroup(appKey)} /></Tooltip>,
                                    <Tooltip title="为此应用新增单个提示词"><PlusOutlined key="add-prompt" onClick={() => showAddAppCardPromptItemModal(appKey)} /></Tooltip>
                                ]}
                            >
                                {Object.entries(prompts).map(([promptKey, content]) => (
                                    <div key={promptKey} style={{ marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f0f0f0' }}>
                                        <Row justify="space-between" align="middle">
                                            <Col><strong>{promptKey}</strong></Col>
                                            <Col>
                                                <Space size="small">
                                                    <Tooltip title="编辑此提示词"><Button size="small" icon={<EditOutlined />} onClick={() => showEditAppCardPromptItemModal(appKey, promptKey, content)} /></Tooltip>
                                                    <Tooltip title="删除此提示词"><Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeleteAppCardPromptItem(appKey, promptKey)} /></Tooltip>
                                                </Space>
                                            </Col>
                                        </Row>
                                        <div style={{ color: '#555', fontSize: '0.9em', marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</div>
                                    </div>
                                ))}
                                {Object.keys(prompts).length === 0 && <p>此应用暂无提示词。</p>}
                            </Card>
                        </Col>
                    ))}
                     {Object.keys(appCardPrompts).length === 0 && <Col span={24}><p>暂无应用提示词组。</p></Col>}
                </Row>
            </Card>
        );
    };

    return (
        <div style={{ padding: '20px' }}>
            <Tabs activeKey={activeTab} onChange={setActiveTab} destroyInactiveTabPane>
                <TabPane tab="通用提示词管理 (功能卡片)" key="general">
                    {renderGeneralPromptsManagement()}
                </TabPane>
                <TabPane tab="应用提示词管理 (AppCards)" key="appCard">
                    {renderAppCardPromptsManagement()}
                </TabPane>
            </Tabs>

            <Modal
                title={editingGeneralPromptFolder ? "编辑功能卡片组" : "新增功能卡片组"}
                visible={isGeneralPromptFolderModalVisible}
                onCancel={() => setIsGeneralPromptFolderModalVisible(false)}
                onOk={() => generalPromptFolderForm.submit()}
                confirmLoading={loading}
                destroyOnClose
            >
                <Form form={generalPromptFolderForm} layout="vertical" onFinish={handleGeneralPromptFolderFormSubmit} initialValues={editingGeneralPromptFolder || { name: '', icon: '', description: ''}}>
                    <Form.Item name="name" label="卡片组名称" rules={[{ required: true, message: '请输入名称!' }]}><Input placeholder="例如：教师助手"/></Form.Item>
                    <Form.Item name="icon" label="图标 (Ant Design Icon 名称)" tooltip="请填写 Ant Design 图标库中的图标名称，例如 user, school, book 等。"><Input placeholder="例如: user"/></Form.Item>
                    <Form.Item name="description" label="描述"><Input.TextArea rows={3} placeholder="对此卡片组的简短描述"/></Form.Item>
                </Form>
            </Modal>

            <Modal
                title={editingGeneralPromptItem ? "编辑提示词条目" : "新增提示词条目"}
                visible={isGeneralPromptItemModalVisible}
                onCancel={() => setIsGeneralPromptItemModalVisible(false)}
                onOk={() => generalPromptItemForm.submit()}
                confirmLoading={loading}
                destroyOnClose
                width={600}
            >
                <Form form={generalPromptItemForm} layout="vertical" onFinish={handleGeneralPromptItemFormSubmit} initialValues={editingGeneralPromptItem ? { name: editingGeneralPromptItem.name, content: editingGeneralPromptItem.prompt } : { name: '', content: '' }}>
                    <Form.Item name="name" label="条目名称" rules={[{ required: true, message: '请输入条目名称!' }]}><Input placeholder="例如：课程规划"/></Form.Item>
                    <Form.Item name="content" label="提示词内容 (Prompt)" rules={[{ required: true, message: '请输入提示词内容!' }]}><Input.TextArea rows={6} placeholder="请输入具体的提示词内容..."/></Form.Item>
                </Form>
            </Modal>

            <Modal
                title={editingAppCardAppKey ? `编辑应用 "${editingAppCardAppKey}" 的提示词组` : "新增应用提示词组"}
                visible={isAppCardAppModalVisible}
                onCancel={() => setIsAppCardAppModalVisible(false)}
                onOk={() => appCardAppForm.submit()}
                confirmLoading={loading}
                destroyOnClose
                width={700}
            >
                <Form form={appCardAppForm} layout="vertical" onFinish={handleAppCardAppGroupFormSubmit}>
                    <Form.Item name="appKey" label="应用标识 (App Key)" rules={[{ required: true, message: '请输入应用标识!' }]} tooltip="例如: deepseek, courseHelper。创建后不可修改。">
                        <Input placeholder="例如: myCustomApp" disabled={!!editingAppCardAppKey} />
                    </Form.Item>
                    <Form.Item name="prompts" label="提示词 (JSON格式)" rules={[{ required: true, message: '请输入JSON格式的提示词!' }]} tooltip='请输入键值对形式的JSON，例如：{ "search_food": "帮我搜索附近的美食", "ask_weather": "今天天气怎么样？" }'>
                        <Input.TextArea rows={10} placeholder='{ "prompt_key_1": "Prompt content 1", "prompt_key_2": "Prompt content 2" }'/>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={editingAppCardPromptItem?.promptKey ? `编辑应用 "${currentEditingAppCardAppKey}" 下的提示词 "${editingAppCardPromptItem?.promptKey}"` : `为应用 "${currentEditingAppCardAppKey}" 新增提示词`}
                visible={isAppCardPromptItemModalVisible}
                onCancel={() => setIsAppCardPromptItemModalVisible(false)}
                onOk={() => appCardPromptItemForm.submit()}
                confirmLoading={loading}
                destroyOnClose
                width={600}
            >
                <Form form={appCardPromptItemForm} layout="vertical" onFinish={handleAppCardPromptItemFormSubmit} 
                      initialValues={editingAppCardPromptItem ? { promptKey: editingAppCardPromptItem.promptKey, content: editingAppCardPromptItem.content } : { promptKey: '', content: ''}}>
                    <Form.Item name="promptKey" label="提示词标识 (Prompt Key)" rules={[{ required: true, message: '请输入提示词标识!' }]}>
                        <Input placeholder="例如: search_books" />
                    </Form.Item>
                    <Form.Item name="content" label="提示词内容" rules={[{ required: true, message: '请输入提示词内容!' }]}>
                        <Input.TextArea rows={5} placeholder="请输入具体的提示词..."/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default PromptsPage;
