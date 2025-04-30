import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin, DatePicker, Space, List } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';
import { API_URL } from '../../config/config';
const { TextArea } = Input;

const UpdateInfoPage = () => {
    const [loading, setLoading] = useState(true);
    const [updateInfo, setUpdateInfo] = useState({
        version: '',
        title: '',
        date: '',
        content: []
    });
    const [form] = Form.useForm();

    // 获取更新信息
    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/getUpdateInfo`)
            .then(response => response.json())
            .then(data => {
                // 确保数据结构完整
                const saneData = {
                    version: data?.version || '',
                    title: data?.title || '',
                    date: data?.date || '',
                    content: Array.isArray(data?.content) ? data.content : []
                };
                setUpdateInfo(saneData);
                
                // 设置表单字段值
                form.setFieldsValue({
                    version: saneData.version,
                    title: saneData.title,
                    date: saneData.date ? moment(saneData.date) : null,
                    content: saneData.content
                });
            })
            .catch(error => {
                console.error('获取更新信息失败:', error);
                message.error('加载更新信息失败');
            })
            .finally(() => setLoading(false));
    }, [form]);

    // 保存更新信息
    const handleSaveUpdateInfo = (values) => {
        setLoading(true);
        
        // 准备要保存的数据
        const dataToSave = {
            version: values.version,
            title: values.title,
            date: values.date ? values.date.format('YYYY-MM-DD') : '',
            content: values.content
        };

        fetch(`${API_URL}/updateUpdateInfo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSave),
        })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                message.success(data.message || '更新信息保存成功');
                // 更新本地状态
                if (data.data) {
                    const updatedInfo = {
                        ...updateInfo,
                        ...data.data
                    };
                    setUpdateInfo(updatedInfo);
                    // 更新表单值，确保显示最新数据
                    form.setFieldsValue({
                        version: updatedInfo.version,
                        title: updatedInfo.title,
                        date: updatedInfo.date ? moment(updatedInfo.date) : null,
                        content: updatedInfo.content
                    });
                }
            } else {
                message.error(data.message || '保存更新信息失败');
            }
        })
        .catch(error => {
            console.error('保存更新信息失败:', error);
            message.error('保存更新信息失败，请查看控制台日志');
        })
        .finally(() => setLoading(false));
    };

    return (
        <Spin spinning={loading}>
            <Card title="更新信息管理">
                <p style={{ marginBottom: '16px', color: 'gray' }}>
                    此处编辑的内容将在用户首次打开应用或刷新页面时显示在右上角的更新通知框中。
                </p>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSaveUpdateInfo}
                    initialValues={updateInfo}
                >
                    <Form.Item
                        name="version"
                        label="版本号"
                        rules={[{ required: true, message: '请输入版本号' }]}
                    >
                        <Input placeholder="例如: 1.0.0" />
                    </Form.Item>
                    
                    <Form.Item
                        name="title"
                        label="更新标题"
                        rules={[{ required: true, message: '请输入更新标题' }]}
                    >
                        <Input placeholder="例如: 最新功能更新" />
                    </Form.Item>
                    
                    <Form.Item
                        name="date"
                        label="更新日期"
                    >
                        <DatePicker format="YYYY-MM-DD" placeholder="选择日期" style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.List name="content">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={name}
                                            rules={[{ required: true, message: '请输入更新内容条目' }]}
                                            style={{ width: '100%', marginBottom: 0 }}
                                        >
                                            <Input placeholder="更新内容条目" />
                                        </Form.Item>
                                        <DeleteOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button 
                                        type="dashed" 
                                        onClick={() => add()} 
                                        block 
                                        icon={<PlusOutlined />}
                                    >
                                        添加更新内容条目
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            保存更新信息
                        </Button>
                    </Form.Item>
                </Form>

                <Card title="预览" style={{ marginTop: '24px' }}>
                    <h3>{updateInfo.title} {updateInfo.version && `(v${updateInfo.version})`}</h3>
                    {updateInfo.date && <p style={{ color: '#888' }}>{updateInfo.date}</p>}
                    <List
                        size="small"
                        bordered
                        dataSource={updateInfo.content}
                        renderItem={item => <List.Item>{item}</List.Item>}
                    />
                </Card>
            </Card>
        </Spin>
    );
};

export default UpdateInfoPage; 