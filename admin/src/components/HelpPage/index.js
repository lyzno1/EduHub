import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin } from 'antd';
import { API_URL } from '../../config/config';
const { TextArea } = Input;

const HelpPage = () => {
    const [loading, setLoading] = useState(true);
    // State to hold the full metadata object
    const [metadata, setMetadata] = useState({ // 确保初始状态包含所有后端期望的字段
        title: '',
        subtitle: '',
        pageTitle: '', // 添加 pageTitle 初始值
        aboutContent: '',
        version: '',
        copyright: '',
        additionalInfo: { developer: '', website: '' }
    });
    const [aboutForm] = Form.useForm(); // Form instance for this page

    // Fetch metadata on component mount
    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/getMetadata`)
            .then(response => response.json())
            .then(data => {
                // Ensure data structure is sound
                const saneData = {
                    title: data?.title ?? '', // 使用 ?? 运算符处理 null 和 undefined
                    subtitle: data?.subtitle ?? '',
                    pageTitle: data?.pageTitle ?? 'BistuCopilot', // 确保从后端获取或设置默认值
                    aboutContent: data?.aboutContent ?? '',
                    version: data?.version ?? '',
                    copyright: data?.copyright ?? '',
                    additionalInfo: {
                        developer: data?.additionalInfo?.developer ?? '',
                        website: data?.additionalInfo?.website ?? ''
                    }
                };
                setMetadata(saneData);
                // Set only the aboutContent field in the form
                aboutForm.setFieldsValue({ aboutContent: saneData.aboutContent });
            })
            .catch(error => {
                 console.error('获取元数据失败:', error);
                 message.error('加载元数据失败');
             })
            .finally(() => setLoading(false));
    }, [aboutForm]);

    // Handle saving the aboutContent
    const handleSaveAboutContent = (values) => {
        setLoading(true);
        // Prepare the full metadata object to send, updated with the new aboutContent
        const metadataToSave = {
            ...metadata, // Spread the existing metadata from state
            aboutContent: values.aboutContent // Update with the value from the form
        };

        fetch(`${API_URL}/updateMetadata`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            body: JSON.stringify(metadataToSave),
            })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                message.success(data.message || '关于信息保存成功'); // 使用后端返回的消息
                // Update local state if save was successful and data returned
                if (data.data) {
                    setMetadata(data.data); // 后端返回完整的更新后的元数据
                    // Reset the form to reflect the newly saved value
                    aboutForm.setFieldsValue({ aboutContent: data.data.aboutContent ?? '' });
                }
            } else {
                message.error(data.message || '保存关于信息失败');
        }
        })
        .catch(error => {
            console.error('保存关于信息失败:', error);
            message.error('保存关于信息失败，请查看控制台日志');
        })
        .finally(() => setLoading(false));
    };

    return (
        <Spin spinning={loading}>
            <Card title="配置“关于”信息">
                <p style={{ marginBottom: '16px', color: 'gray' }}>
                    此处编辑的内容将显示在应用侧边栏“关于”按钮弹出的对话框中。支持 Markdown 换行（输入 \n）。
                </p>
                <Form
                    form={aboutForm}
                    layout="vertical"
                    onFinish={handleSaveAboutContent}
                    // Use key to force re-render when metadata.aboutContent changes if needed, 
                    // or rely on setFieldsValue in useEffect
                    initialValues={{ aboutContent: metadata.aboutContent }}
                >
                    <Form.Item 
                        name="aboutContent" 
                        label="“关于”信息内容" 
                        rules={[{ required: true, message: '请输入关于信息内容' }]}
                    >
                        <TextArea 
                            rows={10} 
                            placeholder="输入将在“关于”弹窗中显示的文本内容。例如：\nBistuCopilot v2.0 - 智能知识助手\n\n开发者：北京信息科技大学 iflab\n技术支持：Dify.ai\n\n本平台旨在提供便捷的 AI 交互体验。"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            保存关于信息
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </Spin>
    );
};

export default HelpPage;