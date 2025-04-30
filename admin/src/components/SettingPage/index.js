import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin, Divider, Alert, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { API_URL } from '../../config/config';
const { TextArea } = Input;

const SettingPage = () => {
    const [loading, setLoading] = useState(true);
    // State remains the same, includes aboutContent internally
    const [metadata, setMetadata] = useState({
        title: '',
        subtitle: '',
        pageTitle: '', // 添加pageTitle字段
        aboutContent: '', // Keep this field in the state
        version: '',
        copyright: '',
        additionalInfo: { developer: '', website: '' }
    });
    const [metadataForm] = Form.useForm(); 

    // Fetch metadata (includes aboutContent)
    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/getMetadata`) 
            .then(response => response.json())
            .then(data => {
                const saneData = {
                    title: data?.title || '',
                    subtitle: data?.subtitle || '',
                    pageTitle: data?.pageTitle || '', // 获取pageTitle
                    aboutContent: data?.aboutContent || '', // Fetch aboutContent
                    version: data?.version || '',
                    copyright: data?.copyright || '',
                    additionalInfo: {
                        developer: data?.additionalInfo?.developer || '',
                        website: data?.additionalInfo?.website || ''
                    }
                };
                setMetadata(saneData);
                metadataForm.setFieldsValue({
                    // Set form values excluding aboutContent
                    title: saneData.title,
                    subtitle: saneData.subtitle,
                    pageTitle: saneData.pageTitle, // 设置pageTitle表单值
                    version: saneData.version,
                    copyright: saneData.copyright,
                    developer: saneData.additionalInfo.developer,
                    website: saneData.additionalInfo.website,
                });
            })
            .catch(error => {
                 console.error('获取元数据失败:', error);
                 message.error('加载元数据失败');
             })
            .finally(() => setLoading(false));
    }, [metadataForm]);

    // Save metadata (sends the whole metadata object, including aboutContent)
    const handleSaveMetadata = (values) => { 
        setLoading(true);
        // Construct the full metadata object, including the potentially unchanged aboutContent from state
        const metadataToSave = {
            title: values.title,
            subtitle: values.subtitle,
            pageTitle: values.pageTitle, // 添加pageTitle到保存对象中
            aboutContent: metadata.aboutContent, // Use aboutContent from state
            version: values.version,
            copyright: values.copyright,
            additionalInfo: {
                developer: values.developer,
                website: values.website,
            }
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
                message.success(data.message || '元数据保存成功');
                if (data.data) {
                     const updatedData = {
                        title: data.data?.title || '',
                        subtitle: data.data?.subtitle || '',
                        pageTitle: data.data?.pageTitle || '', // 更新pageTitle
                        aboutContent: data.data?.aboutContent || '', // Update state with new aboutContent
                        version: data.data?.version || '',
                        copyright: data.data?.copyright || '',
                        additionalInfo: {
                            developer: data.data?.additionalInfo?.developer || '',
                            website: data.data?.additionalInfo?.website || ''
                        }
                    };
                     setMetadata(updatedData); // Update the full state
                     metadataForm.setFieldsValue({
                        // Update form fields (excluding aboutContent)
                        title: updatedData.title,
                        subtitle: updatedData.subtitle,
                        pageTitle: updatedData.pageTitle, // 更新表单中的pageTitle
                        version: updatedData.version,
                        copyright: updatedData.copyright,
                        developer: updatedData.additionalInfo.developer,
                        website: updatedData.additionalInfo.website,
                     });
                }
            } else {
                message.error(data.message || '保存元数据失败');
            }
        })
        .catch(error => {
            console.error('保存元数据失败:', error);
            message.error('保存元数据失败，请查看控制台日志');
        })
        .finally(() => setLoading(false));
    };

    return (
        <Spin spinning={loading}>
            <Card title="应用元数据配置">
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: '20px' }}
                    message="标题配置说明"
                    description={
                        <ul style={{ paddingLeft: '20px', marginBottom: '0' }}>
                            <li><strong>应用主标题</strong>: 显示在应用欢迎页面的主要标题文字</li>
                            <li><strong>应用副标题</strong>: 显示在欢迎页面主标题下方的描述性文字</li>
                            <li><strong>网站标题</strong>: 显示在浏览器标签页中的标题文字（页面的title标签）</li>
                        </ul>
                    }
                />
                
                <Form
                    form={metadataForm}
                    layout="vertical"
                    onFinish={handleSaveMetadata}
                    // Initial values don't need aboutContent for the form
                    initialValues={{
                        title: metadata.title,
                        subtitle: metadata.subtitle,
                        pageTitle: metadata.pageTitle, // 初始化pageTitle
                        version: metadata.version,
                        copyright: metadata.copyright,
                        developer: metadata.additionalInfo?.developer,
                        website: metadata.additionalInfo?.website,
                    }}
                >
                    {/* ... Form Items for title, subtitle ... */}
                    <Form.Item 
                        name="title" 
                        label="应用主标题" 
                        rules={[{ required: true, message: '请输入应用主标题' }]}
                        tooltip="显示在欢迎页面的主要标题文字，用户打开应用时看到的主标题"
                    >
                        <Input placeholder="例如：BistuCopilot 智能助手"/>
                    </Form.Item>
                    
                    <Form.Item 
                        name="subtitle" 
                        label="应用副标题"
                        tooltip="显示在欢迎页面主标题下方的描述性文字，简要说明应用的功能或特点"
                    >
                        <Input placeholder="例如：基于大模型的知识问答与创作平台"/>
                    </Form.Item>
                    
                    <Form.Item 
                        name="pageTitle" 
                        label="网站标题" 
                        rules={[{ required: true, message: '请输入网站标题' }]}
                        tooltip="显示在浏览器标签页中的标题文字，影响SEO和用户在多标签页下识别本站"
                    >
                        <Input placeholder="例如：BistuCopilot | 智能知识助手"/>
                    </Form.Item>

                    <Divider /> 

                    {/* Removed Tooltip/About Content Form Item */}
                    {/* <Form.Item name="tooltipContent" label="侧边栏悬停提示内容 (Tooltip)" rules={[{ required: true }]}>
                        <TextArea rows={3} placeholder="用于侧边栏'关于'图标的提示，支持换行。例如：应用名称 v1.0\n开发者信息"/>
                    </Form.Item> */}
                    
                    {/* ... Form Items for version, copyright, developer, website ... */}
                    <Form.Item name="version" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}>
                        <Input placeholder="例如：v2.0.0"/>
                    </Form.Item>
                    <Form.Item name="copyright" label="版权信息" rules={[{ required: true, message: '请输入版权信息' }]}>
                        <Input placeholder="例如：© 2023-2025 北京信息科技大学"/>
                    </Form.Item>
                     <Form.Item name="developer" label="开发者/组织">
                        <Input placeholder="例如：iflab"/>
                    </Form.Item>
                    <Form.Item name="website" label="相关网站 URL">
                        <Input placeholder="例如：https://iflab.org"/>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            保存元数据
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </Spin>
    );
};

export default SettingPage;