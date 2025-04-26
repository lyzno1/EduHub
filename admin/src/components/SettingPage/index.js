import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin, Divider } from 'antd';
import { API_URL } from '../../config/config';
const { TextArea } = Input;

const SettingPage = () => {
    const [loading, setLoading] = useState(true);
    // 更新状态以匹配 metadata.json
    const [metadata, setMetadata] = useState({
        title: '',
        subtitle: '',
        tooltipContent: '',
        version: '',
        copyright: '',
        additionalInfo: { developer: '', website: '' }
    });
    const [metadataForm] = Form.useForm(); // 重命名表单实例

    // 获取元数据
    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/getMetadata`) // 更新 API 端点
            .then(response => response.json())
            .then(data => {
                // 确保 additionalInfo 存在且为对象，并提供默认值
                const saneData = {
                    title: data?.title || '',
                    subtitle: data?.subtitle || '',
                    tooltipContent: data?.tooltipContent || '',
                    version: data?.version || '',
                    copyright: data?.copyright || '',
                    additionalInfo: {
                        developer: data?.additionalInfo?.developer || '',
                        website: data?.additionalInfo?.website || ''
                    }
                };
                setMetadata(saneData);
                // 使用 setFieldsValue 设置表单的初始值，包含新增字段
                metadataForm.setFieldsValue({
                    ...saneData,
                    developer: saneData.additionalInfo.developer,
                    website: saneData.additionalInfo.website,
                });
            })
            .catch(error => {
                 console.error('获取元数据失败:', error);
                 message.error('加载元数据失败');
             })
            .finally(() => setLoading(false));
    }, [metadataForm]); // 依赖项更新为 metadataForm

    // 保存元数据
    const handleSaveMetadata = (values) => { // 重命名函数
        setLoading(true);
        // 构造符合 metadata.json 格式的对象
        const metadataToSave = {
            title: values.title,
            subtitle: values.subtitle,
            tooltipContent: values.tooltipContent,
            version: values.version,
            copyright: values.copyright,
            additionalInfo: {
                developer: values.developer,
                website: values.website,
            }
        };

        fetch(`${API_URL}/updateMetadata`, { // 更新 API 端点
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
                // 更新状态和表单
                if (data.data) {
                     const updatedData = {
                        title: data.data?.title || '',
                        subtitle: data.data?.subtitle || '',
                        tooltipContent: data.data?.tooltipContent || '',
                        version: data.data?.version || '',
                        copyright: data.data?.copyright || '',
                        additionalInfo: {
                            developer: data.data?.additionalInfo?.developer || '',
                            website: data.data?.additionalInfo?.website || ''
                        }
                    };
                     setMetadata(updatedData);
                     metadataForm.setFieldsValue({
                        ...updatedData,
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
            <Card title="应用元数据配置"> {/* 更新卡片标题 */}
                <Form
                    form={metadataForm} // 使用更新后的表单实例
                    layout="vertical"
                    onFinish={handleSaveMetadata} // 使用更新后的保存函数
                    initialValues={{
                        ...metadata,
                        developer: metadata.additionalInfo?.developer,
                        website: metadata.additionalInfo?.website,
                    }} // 确保表单初始值正确
                >
                    {/* 第一组：基本显示信息 */}
                    <Form.Item name="title" label="应用主标题" rules={[{ required: true }]}>
                        <Input placeholder="例如：EduHub 智能助手"/>
                    </Form.Item>
                    <Form.Item name="subtitle" label="应用副标题">
                        <Input placeholder="例如：基于大模型的知识问答与创作平台"/>
                    </Form.Item>

                    <Divider /> {/* 分隔线 */}

                    {/* 第二组：关于与详细信息 */}
                    <Form.Item name="tooltipContent" label="侧边栏悬停提示内容 (Tooltip)" rules={[{ required: true }]}>
                        <TextArea rows={3} placeholder="用于侧边栏'关于'图标的提示，支持换行。例如：应用名称 v1.0\n开发者信息"/>
                    </Form.Item>
                    <Form.Item name="version" label="版本号" rules={[{ required: true }]}>
                        <Input placeholder="例如：v1.0.1"/>
                    </Form.Item>
                    <Form.Item name="copyright" label="版权信息" rules={[{ required: true }]}>
                        <Input placeholder="例如：© 2024 北京信息科技大学"/>
                    </Form.Item>
                     <Form.Item name="developer" label="开发者/组织">
                        <Input placeholder="例如：ifLab 智能未来实验室"/>
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