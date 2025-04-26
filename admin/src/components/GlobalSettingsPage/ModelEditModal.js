import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch, message } from 'antd';

const ModelEditModal = ({ visible, onCancel, onSave, initialData }) => {
    const [form] = Form.useForm();

    // 使用 useEffect 来监听 initialData 的变化，并在 Modal 首次打开或编辑数据变化时设置表单值
    useEffect(() => {
        if (visible) { // 仅在 Modal 可见时设置值
            if (initialData) {
                // 编辑模式：设置表单值
                form.setFieldsValue({
                    name: initialData.name,
                    apiKey: initialData.apiKey,
                    isDefault: initialData.isDefault || false, // 确保 isDefault 有值
                });
            } else {
                // 添加模式：重置表单（包括 isDefault）
                form.resetFields();
                form.setFieldsValue({ isDefault: false }); // 明确设置 isDefault 为 false
            }
        }
    }, [visible, initialData, form]);

    const handleOk = () => {
        form.validateFields()
            .then(values => {
                // 确保 isDefault 是布尔值
                const finalValues = {
                    ...values,
                    isDefault: !!values.isDefault, // 转换为布尔值
                };
                // 调用父组件传递的 onSave 函数，并传递表单数据
                onSave(finalValues);
            })
            .catch(info => {
                console.log('Validate Failed:', info);
                message.error('请检查表单输入项！');
            });
    };

    return (
        <Modal
            title={initialData ? "编辑模型" : "添加新模型"}
            open={visible} // 使用 open 代替 visible
            onCancel={onCancel}
            onOk={handleOk}
            destroyOnClose // 关闭时销毁内部元素，确保下次打开是干净的
            confirmLoading={false} // TODO: 可以从父组件传入 loading 状态
        >
            <Form form={form} layout="vertical" name="modelEditForm">
                <Form.Item
                    name="name"
                    label="模型名称"
                    rules={[{ required: true, message: '请输入模型名称!' }]}
                    tooltip="用户将在前端看到的模型名称，例如：GPT-4o"
                >
                    <Input placeholder="例如：GPT-4o" />
                </Form.Item>
                <Form.Item
                    name="apiKey"
                    label="API Key"
                    rules={[{ required: true, message: '请输入模型的 API Key!' }]}
                    tooltip="用于调用该模型服务的 Dify API Key (app-开头的密钥)"
                >
                    <Input.Password placeholder="输入 app-xxxx 密钥" />
                </Form.Item>
                <Form.Item
                    name="isDefault"
                    label="设为默认模型"
                    valuePropName="checked" // Switch 组件需要这个 prop
                    tooltip="全局聊天默认使用的模型，只能有一个默认模型。"
                >
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ModelEditModal; 