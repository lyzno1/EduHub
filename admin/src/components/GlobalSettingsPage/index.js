import React, { useState, useEffect } from 'react';
import { Card, Spin, Form, Input, Button, message, Row, Col, Divider, Table, Tag, Popconfirm, Typography, Switch } from 'antd';
import { API_URL } from '../../config/config';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
// 导入模态框组件
import ModelEditModal from './ModelEditModal';

const { Title } = Typography;

const GlobalSettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [globalConfig, setGlobalConfig] = useState({ displayName: '', apiUrl: '', models: [] });
    const [form] = Form.useForm();
    
    // 新增：模型模态框状态
    const [isModelModalVisible, setIsModelModalVisible] = useState(false);
    const [editingModel, setEditingModel] = useState(null); // 用于区分添加/编辑模式，并存储正在编辑的模型数据

    const fetchGlobalData = () => {
        setLoading(true);
        fetch(`${API_URL}/getDify_keys`)
            .then(response => response.json())
            .then(data => {
                if (data && data.global) {
                    setGlobalConfig({
                        displayName: data.global.displayName || '全局默认配置',
                        apiUrl: data.global.apiUrl || '',
                        models: Array.isArray(data.global.models) ? data.global.models.map((model, index) => ({ ...model, key: model.name || index })) : []
                    });
                    form.setFieldsValue({
                        displayName: data.global.displayName || '全局默认配置',
                        apiUrl: data.global.apiUrl || ''
                    });
                } else {
                    message.error('未能加载全局配置数据');
                    // 设置默认值以避免表单和表格出错
                     setGlobalConfig({ displayName: '全局默认配置', apiUrl: '', models: [] });
                     form.setFieldsValue({ displayName: '全局默认配置', apiUrl: '' });
                }
            })
            .catch(error => {
                console.error('获取全局配置失败:', error);
                message.error('获取全局配置失败，请查看控制台信息。');
                // 设置默认值以避免表单和表格出错
                setGlobalConfig({ displayName: '全局默认配置', apiUrl: '', models: [] });
                form.setFieldsValue({ displayName: '全局默认配置', apiUrl: '' });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchGlobalData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSaveGeneralSettings = (values) => {
        console.log('Saving general settings:', values);
        setLoading(true);
        fetch(`${API_URL}/updateFolder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                originalKey: 'global',
                displayName: values.displayName,
                apiUrl: values.apiUrl // 直接传递 apiUrl
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                message.success('全局常规设置已更新');
                // 更新本地状态以反映更改
                setGlobalConfig(prev => ({
                    ...prev,
                    displayName: values.displayName,
                    apiUrl: values.apiUrl
                }));
            } else {
                message.error(data.message || '更新全局常规设置失败');
            }
        })
        .catch(error => {
            console.error('更新全局常规设置失败:', error);
            message.error('更新全局常规设置失败，请查看控制台信息。');
        })
        .finally(() => {
            setLoading(false);
        });
    };

    // 新增：处理打开添加模型模态框
    const handleAddModel = () => {
        setEditingModel(null); // 清空编辑状态，表示是添加模式
        setIsModelModalVisible(true);
    };

    // 新增：处理打开编辑模型模态框
    const handleEditModel = (modelRecord) => {
        setEditingModel(modelRecord); // 设置正在编辑的模型数据
        setIsModelModalVisible(true);
    };

    // 新增：处理关闭模型模态框
    const handleCancelModelModal = () => {
        setIsModelModalVisible(false);
        setEditingModel(null); // 清空编辑状态
    };

    // 更新：处理保存模型（添加/更新） - 连接后端
    const handleSaveModel = (modelData) => {
        setLoading(true);
        console.log("Saving model:", modelData, "Editing model:", editingModel);
        
        const isEditing = !!editingModel;
        const apiEndpoint = isEditing ? `${API_URL}/updateGlobalModel` : `${API_URL}/addGlobalModel`;
        
        let requestBody;
        if (isEditing) {
            // 编辑模式：发送原始名称用于查找，发送新数据用于更新
            requestBody = {
                originalName: editingModel.name, // 原始名称
                newData: { // 新数据 (可能包含修改后的名称)
                    name: modelData.name,       
                    apiKey: modelData.apiKey,
                    isDefault: modelData.isDefault
                }
            };
        } else {
            // 添加模式：直接发送新模型数据
             requestBody = {
                 name: modelData.name,
                 apiKey: modelData.apiKey,
                 isDefault: modelData.isDefault
             };
        }

        fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        })
        .then(response => {
            // 检查状态码，如果不是 2xx，则尝试解析错误信息
            if (!response.ok) {
                return response.text().then(text => { 
                    let errorMsg = text;
                    try {
                        // 尝试解析 JSON 错误信息
                        const errorJson = JSON.parse(text);
                        errorMsg = errorJson.message || errorJson.error || text;
                    } catch (e) { /* 忽略解析错误，使用原始文本 */ }
                    throw new Error(errorMsg || (editingModel ? '更新模型失败' : '添加模型失败'));
                });
            }
            return response.json(); // 解析成功的 JSON 响应
        })
        .then(data => {
            // 检查后端返回的 success 标志 (如果后端有返回的话)
            if (data && data.success) {
                message.success(editingModel ? '模型更新成功' : '模型添加成功');
                setIsModelModalVisible(false);
                fetchGlobalData(); // 刷新列表
            } else {
                // 如果后端没有返回 success: true 或 data 为空
                 message.error(data.message || (editingModel ? '更新模型时发生未知错误' : '添加模型时发生未知错误'));
            }
        })
        .catch(error => {
            console.error('Save model failed:', error);
            message.error(`操作失败: ${error.message}`);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    // 新增：处理删除模型
    const handleDeleteModel = (modelName) => {
        setLoading(true);
        fetch(`${API_URL}/deleteGlobalModel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName }),
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text || '删除模型失败'); });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                message.success('模型删除成功');
                fetchGlobalData(); // 刷新列表
            } else {
                 message.error(data.message || '删除模型失败');
            }
        })
        .catch(error => {
            console.error('Delete model failed:', error);
            message.error(`删除失败: ${error.message}`);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    // 新增：处理设置默认模型
    const handleSetDefault = (modelName) => {
        setLoading(true);
        fetch(`${API_URL}/setGlobalDefaultModel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName }),
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text || '设置默认模型失败'); });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                message.success(`模型 '${modelName}' 已设为默认`);
                fetchGlobalData(); // 刷新列表以更新 Switch 状态
            } else {
                 message.error(data.message || '设置默认模型失败');
            }
        })
        .catch(error => {
            console.error('Set default model failed:', error);
            message.error(`设置失败: ${error.message}`);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    const modelColumns = [
        {
            title: '模型名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'API Key',
            dataIndex: 'apiKey',
            key: 'apiKey',
            render: (text) => text ? <Tag color="blue">已配置</Tag> : <Tag color="red">未配置</Tag>
        },
        {
            title: '默认模型',
            dataIndex: 'isDefault',
            key: 'isDefault',
            render: (isDefault, record) => (
                <Switch 
                    checked={isDefault} 
                    onChange={() => handleSetDefault(record.name)} 
                    disabled={isDefault}
                /> 
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <>
                    <Button type="link" onClick={() => handleEditModel(record)}>编辑</Button>
                    <Popconfirm 
                        title="确定删除此模型吗?" 
                        onConfirm={() => handleDeleteModel(record.name)}
                        disabled={record.isDefault}
                    >
                         <Button type="link" danger disabled={record.isDefault} title={record.isDefault ? "默认模型不能删除" : ""}>
                             删除
                         </Button> 
                    </Popconfirm>
                </>
            ),
        },
    ];

    return (
        <Spin spinning={loading}>
            <Card>
                <Title level={4}>全局设置</Title>
                <p>管理 EduHub 的全局默认聊天设置和可用的大语言模型。</p>

                <Title level={5} style={{ marginTop: '20px' }}>常规设置</Title>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSaveGeneralSettings}
                    initialValues={{
                        displayName: globalConfig.displayName,
                        apiUrl: globalConfig.apiUrl
                    }}
                >
                    <Form.Item
                        name="displayName"
                        label="显示名称"
                        rules={[{ required: true, message: '请输入全局配置的显示名称!' }]}
                    >
                        <Input placeholder="例如：EduHub 全局聊天" />
                    </Form.Item>
                    <Form.Item
                        name="apiUrl"
                        label="基础 API URL (可选)"
                        tooltip="dify后端apiUrl"
                    >
                        <Input placeholder="例如：http://api.dify.ai/v1" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            保存常规设置
                        </Button>
                    </Form.Item>
                </Form>

                <Title level={5} style={{ marginTop: '40px' }}>全局模型管理</Title>
                <Button type="primary" style={{ marginBottom: 16 }} onClick={handleAddModel}> 
                    添加模型
                </Button>
                <Table
                    columns={modelColumns}
                    dataSource={globalConfig.models}
                    pagination={false}
                    bordered
                />
                
                {/* 渲染模型编辑/添加模态框 */}
                {isModelModalVisible && (
                    <ModelEditModal 
                        visible={isModelModalVisible}
                        onCancel={handleCancelModelModal}
                        onSave={handleSaveModel}
                        initialData={editingModel} // 传入初始数据用于编辑
                    />
                )}

            </Card>
        </Spin>
    );
};

export default GlobalSettingsPage; 