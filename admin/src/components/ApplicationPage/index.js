import React, {useEffect, useState} from 'react';
import {Table, Button, Popconfirm, Form, Modal, Input, message, Tag, Collapse} from 'antd';
import { API_URL } from '../../config/config';
import { DownOutlined } from '@ant-design/icons';
// 导入所有前端 Chat.tsx 中使用的 Tabler 图标
import {
    IconTestPipe,
    IconCode,
    IconInfoCircle,
    IconHelp,
    IconMoodBoy,
    IconWorldWww,
    IconDatabase,
    IconBook,
    IconMessageChatbot,
    IconPencil,
    IconMessageCircleQuestion,
    IconBulb,
    IconPresentation,
    IconListDetails,
    IconCheckbox,
    IconMessageReport,
    IconUsers,
    IconQuestionMark,
    // 你可以根据需要在这里添加更多图标
} from '@tabler/icons-react';

// 创建图标名称到组件的映射
const availableIcons = {
    'IconTestPipe': IconTestPipe,
    'IconCode': IconCode,
    'IconInfoCircle': IconInfoCircle,
    'IconHelp': IconHelp,
    'IconMoodBoy': IconMoodBoy,
    'IconWorldWww': IconWorldWww,
    'IconDatabase': IconDatabase,
    'IconBook': IconBook,
    'IconMessageChatbot': IconMessageChatbot,
    'IconPencil': IconPencil,
    'IconMessageCircleQuestion': IconMessageCircleQuestion,
    'IconBulb': IconBulb,
    'IconPresentation': IconPresentation,
    'IconListDetails': IconListDetails,
    'IconCheckbox': IconCheckbox,
    'IconMessageReport': IconMessageReport,
    'IconUsers': IconUsers,
    'IconQuestionMark': IconQuestionMark,
};

const ApplicationPage = () => {
    // 定义文件夹表格的列
    const folderColumns = [
        {
            title: '显示名称',
            dataIndex: 'displayName',
            key: 'displayName',
        },
        {
            title: '应用ID',
            dataIndex: 'appId',
            key: 'appId',
            width: 100,
        },
        {
            title: '卡片数量',
            dataIndex: 'cardCount',
            key: 'cardCount',
            width: 100,
        },
        {
            title: '操作',
            key: 'action',
            width: 250,
            render: (_, record) => {
                const isGlobal = record.folderKey === 'global';
                const deleteDisabled = isGlobal || record.cardCount > 0;
                const deleteTooltip = isGlobal 
                    ? "全局配置文件夹不允许删除。" 
                    : (record.cardCount > 0 ? "请先删除文件夹下的所有卡片应用。" : "确定删除此文件夹吗?");

                return (
                    <>
                        <Button type="link" onClick={() => handleEditFolder(record)}>修改名称</Button>
                        <Button 
                            type="link" 
                            onClick={() => handleAddCard(record.folderKey)} 
                            disabled={isGlobal}
                            title={isGlobal ? "全局文件夹不能添加卡片" : "添加卡片"}
                        >
                            添加卡片
                        </Button>
                        <Popconfirm
                            title={deleteTooltip}
                            onConfirm={() => handleDeleteFolder(record.folderKey)}
                            disabled={deleteDisabled} 
                        >
                            <Button type="link" danger disabled={deleteDisabled}>
                                删除文件夹
                            </Button>
                        </Popconfirm>
                    </>
                );
            },
        },
    ];
    
    // 定义卡片表格的列
    const cardColumns = (folderKey) => [
        {
            title: '卡片名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '卡片ID',
            dataIndex: 'cardId',
            key: 'key', // Key 应该唯一，用 cardId
        },
        {
            title: '图标',
            dataIndex: 'iconName',
            key: 'iconName',
            render: (iconName) => {
                 const IconComponent = availableIcons[iconName];
                 if (IconComponent) {
                     // 如果找到了对应的组件，渲染图标和名称Tag
                     return (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                             <IconComponent size={16} stroke={1.5} />
                             <Tag>{iconName}</Tag>
                         </div>
                     );
                 } else if (iconName) {
                     // 如果有名称但找不到组件，只显示名称Tag
                     return <Tag>{iconName}</Tag>;
                 } else {
                     // 如果没有设置名称，显示未设置
                     return <Tag>未设置</Tag>;
                 }
            },
        },
        {
            title: 'API Key',
            dataIndex: ['difyConfig', 'apiKey'],
            key: 'apiKey',
            render: (key) => key ? <Tag color="blue">已配置</Tag> : <Tag color="red">未配置</Tag>,
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <>
                    <Button type="link" onClick={() => handleEditCard(record, folderKey)}>修改</Button>
                    <Popconfirm title="确定删除此卡片吗?" onConfirm={() => handleDeleteCard(record.cardId, folderKey)}>
                        <Button type="link" danger>删除</Button>
                    </Popconfirm>
                </>
            ),
        },
    ];
    
    // 状态定义
    const [foldersData, setFoldersData] = useState([]);
    const [currentEditingFolder, setCurrentEditingFolder] = useState(null);
    const [currentEditingCard, setCurrentEditingCard] = useState(null);
    const [currentManagingFolderKey, setCurrentManagingFolderKey] = useState(null);
    const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
    const [isCardModalVisible, setIsCardModalVisible] = useState(false);
    const [folderForm] = Form.useForm();
    const [cardForm] = Form.useForm();
    const [searchText, setSearchText] = useState('');

    // 获取文件夹数据
    const fetchFoldersData = () => {
        fetch(`${API_URL}/getDify_keys`)
            .then(response => response.json())
            .then(data => {
                const formattedData = Object.keys(data).map(folderKey => {
                    const folder = data[folderKey];
                    const cards = Array.isArray(folder.cards) ? folder.cards.map(card => ({ ...card, key: card.cardId })) : [];
                    return {
                        key: folderKey,
                        folderKey,
                        displayName: folder.displayName || folderKey,
                        appId: folder.appId,
                        cards: cards,
                        cardCount: cards.length
                    };
                }).sort((a, b) => a.appId - b.appId);
                setFoldersData(formattedData);
            })
            .catch(error => {
                console.error('Failed to fetch data:', error);
                message.error('获取应用数据失败: ' + error.message);
            });
    };

    // 搜索过滤
    const handleSearch = (e) => {
        setSearchText(e.target.value);
    };
    
    const filteredFoldersData = foldersData.filter(item => 
        item.folderKey.toLowerCase().includes(searchText.toLowerCase()) ||
        item.displayName.toLowerCase().includes(searchText.toLowerCase())
    );

    // 文件夹管理
    const handleAddFolder = () => {
        setCurrentEditingFolder(null);
        setIsFolderModalVisible(true);
        folderForm.resetFields();
    };

    const handleEditFolder = (folderRecord) => {
        setCurrentEditingFolder(folderRecord);
        setIsFolderModalVisible(true);
        folderForm.setFieldsValue({
            displayName: folderRecord.displayName,
        });
    };

    const handleDeleteFolder = (folderKey) => {
        const folderToDelete = foldersData.find(f => f.folderKey === folderKey);
        if (folderToDelete && folderToDelete.cards && folderToDelete.cards.length > 0) {
            message.warning('请先删除文件夹下的所有卡片应用，再删除文件夹。');
            return;
        }

        fetch(`${API_URL}/deleteFolder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderKey }),
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text || '删除文件夹失败'); });
            }
            return response.text();
        })
        .then(() => {
            message.success('文件夹删除成功');
            fetchFoldersData();
        })
        .catch(error => {
            console.error('Failed to delete folder:', error);
            message.error('删除失败: ' + error.message);
        });
    };

    const handleFolderOk = () => {
        folderForm
            .validateFields()
            .then(values => {
                const apiEndpoint = currentEditingFolder ? `${API_URL}/updateFolder` : `${API_URL}/addFolder`;
                const requestBody = currentEditingFolder
                    ? {
                        originalKey: currentEditingFolder.folderKey,
                        displayName: values.displayName
                      }
                    : {
                        displayName: values.displayName
                      };

                fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => { throw new Error(text || (currentEditingFolder ? '更新文件夹失败' : '添加文件夹失败')); });
                    }
                    return response.text();
                })
                .then(() => {
                    message.success(currentEditingFolder ? '文件夹更新成功' : '文件夹添加成功');
                    setIsFolderModalVisible(false);
                    fetchFoldersData();
                })
                .catch(error => {
                    console.error('Failed to process folder:', error);
                    message.error('操作失败: ' + error.message);
                });
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    };

    // 卡片管理
    const handleAddCard = (folderKey) => {
        setCurrentManagingFolderKey(folderKey);
        setCurrentEditingCard(null);
        setIsCardModalVisible(true);
        cardForm.setFieldsValue({ difyConfig: { apiUrl: 'https://api.dify.ai/v1' } });
    };

    const handleEditCard = (cardRecord, folderKey) => {
        setCurrentManagingFolderKey(folderKey);
        setCurrentEditingCard(cardRecord);
        setIsCardModalVisible(true);
        const apiUrl = cardRecord.difyConfig?.apiUrl || 'https://api.dify.ai/v1';
        cardForm.setFieldsValue({
            ...cardRecord,
            difyConfig: {
                ...cardRecord.difyConfig,
                apiUrl: apiUrl
            }
         });
    };

    const handleDeleteCard = (cardId, folderKey) => {
        fetch(`${API_URL}/deleteCard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderKey, cardId }),
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text || '删除卡片失败'); });
            }
            return response.text();
        })
        .then(() => {
            message.success('卡片删除成功');
            fetchFoldersData();
        })
        .catch(error => {
            console.error('Failed to delete card:', error);
            message.error('删除失败: ' + error.message);
        });
    };

    const handleCardOk = () => {
        cardForm
            .validateFields()
            .then(values => {
                const difyConfig = values.difyConfig || {};
                const apiKey = difyConfig.apiKey;
                const apiUrl = difyConfig.apiUrl || 'https://api.dify.ai/v1';

                if (!apiKey) {
                    message.error('API Key 是必填项！');
                    cardForm.validateFields([['difyConfig', 'apiKey']]);
                    return;
                }

                const apiEndpoint = currentEditingCard ? `${API_URL}/updateCard` : `${API_URL}/addCard`;
                const requestBody = {
                    folderKey: currentManagingFolderKey,
                    cardId: currentEditingCard ? currentEditingCard.cardId : values.cardId,
                    cardData: {
                        cardId: values.cardId,
                        name: values.name,
                        iconName: values.iconName || '',
                        difyConfig: {
                           apiKey: apiKey,
                           apiUrl: apiUrl
                        }
                    }
                };

                if (currentEditingCard) {
                    requestBody.cardId = currentEditingCard.cardId;
                }

                console.log('发送到后端的数据:', JSON.stringify(requestBody, null, 2));

                fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                })
                .then(response => {
                    console.log('收到后端响应状态:', response.status);
                    if (!response.ok) {
                        return response.text().then(text => {
                            console.error('后端返回错误文本:', text);
                            let errorMsg = text;
                            try {
                                const errorJson = JSON.parse(text);
                                errorMsg = errorJson.message || errorJson.error || text;
                            } catch (e) { /* 忽略解析错误，使用原始文本 */ }
                            throw new Error(errorMsg || (currentEditingCard ? '更新卡片失败' : '添加卡片失败'));
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('后端成功响应数据:', data);
                    message.success(currentEditingCard ? '卡片更新成功' : '卡片添加成功');
                    setIsCardModalVisible(false);
                    console.log('准备重新获取数据...');
                    fetchFoldersData();
                    console.log('数据获取调用完成。');
                })
                .catch(error => {
                    console.error('处理卡片操作时捕获到错误:', error);
                    message.error(`操作失败: ${error.message}`);
                    if (error.message && typeof error.message === 'string' && error.message.toLowerCase().includes('api key')) {
                         cardForm.validateFields([['difyConfig', 'apiKey']]);
                    }
                });
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    };

    // 渲染逻辑
    const expandedRowRender = (folderRecord) => {
        if (!folderRecord || !Array.isArray(folderRecord.cards)) {
            return null;
        }
        return (
          <Table
            columns={cardColumns(folderRecord.folderKey)}
            dataSource={folderRecord.cards}
            pagination={false}
            size="small"
            rowKey="cardId"
          />
        );
    };

    // 初始加载
    useEffect(() => {
        fetchFoldersData();
    }, []);

    return (
        <>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Input
                    placeholder="搜索应用文件夹"
                    value={searchText}
                    onChange={handleSearch}
                    style={{ width: 240 }}
                />
                <Button type="primary" onClick={handleAddFolder}>添加应用文件夹</Button>
            </div>
            
            <Table
                columns={folderColumns}
                dataSource={filteredFoldersData}
                rowKey="folderKey"
                expandable={{
                    expandedRowRender,
                    rowExpandable: record => record.cards && record.cards.length > 0,
                    expandIcon: ({ expanded, onExpand, record }) =>
                        record.cards && record.cards.length > 0 ? (
                            <DownOutlined
                                onClick={e => onExpand(record, e)}
                                rotate={expanded ? 180 : 0}
                                style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                        ) : <span style={{ marginRight: 24 }}></span>
                 }}
                pagination={{ pageSize: 10 }}
            />
            
            {/* 编辑/添加文件夹的模态框 */}
            <Modal
                title={currentEditingFolder ? `修改文件夹 - ${currentEditingFolder.displayName} (ID: ${currentEditingFolder.appId})` : "添加新应用文件夹"}
                visible={isFolderModalVisible}
                onOk={handleFolderOk}
                onCancel={() => setIsFolderModalVisible(false)}
                destroyOnClose
            >
                <Form form={folderForm} layout="vertical" name="folderForm">
                    <Form.Item
                        name="displayName"
                        label="显示名称"
                        rules={[{ required: true, message: '请输入文件夹的显示名称!' }]}
                    >
                        <Input placeholder="例如：教师助手" />
                    </Form.Item>
                    {currentEditingFolder && (
                        <p>文件夹键名: {currentEditingFolder.folderKey} (不可修改)</p>
                    )}
                     {!currentEditingFolder && (
                        <p>应用ID将在保存后自动生成。</p>
                    )}
                </Form>
            </Modal>
            
            {/* 编辑/添加卡片的模态框 */}
            <Modal
                title={currentEditingCard ? `修改卡片 - ${currentEditingCard.name}` : `在「${foldersData.find(f => f.folderKey === currentManagingFolderKey)?.displayName || ''}」中添加卡片`}
                visible={isCardModalVisible}
                onOk={handleCardOk}
                onCancel={() => setIsCardModalVisible(false)}
                destroyOnClose
                width={600}
            >
                <Form form={cardForm} layout="vertical" name="cardForm">
                    <Form.Item
                        name="cardId"
                        label="卡片ID (唯一标识)"
                        rules={[{ required: true, message: '请输入卡片ID!' }, { pattern: /^[a-zA-Z0-9-_]+$/, message: 'ID只能包含字母、数字、下划线、中划线' }]}
                        tooltip="创建后不可修改，例如：course_intro"
                    >
                        <Input placeholder="例如：course_intro" disabled={!!currentEditingCard} />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label="卡片名称 (显示名称)"
                        rules={[{ required: true, message: '请输入卡片名称!' }]}
                    >
                        <Input placeholder="例如：课程介绍" />
                    </Form.Item>
                    <Form.Item
                        name="iconName"
                        label="选择图标 (可选)"
                        tooltip="点击图标进行选择，再次点击可取消选择。"
                    >
                        <Form.Item noStyle shouldUpdate={(prevValues, curValues) => prevValues.iconName !== curValues.iconName}>
                            {({ getFieldValue, setFieldsValue }) => {
                                const currentIconName = getFieldValue('iconName');
                                return (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #d9d9d9', padding: '10px', borderRadius: '4px' }}>
                                        {Object.entries(availableIcons).map(([name, IconComponent]) => {
                                            const isSelected = currentIconName === name;
                                            return (
                                                <div
                                                    key={name}
                                                    onClick={() => {
                                                        const newIconName = isSelected ? '' : name;
                                                        setFieldsValue({ iconName: newIconName });
                                                    }}
                                                    style={{
                                                        padding: '8px',
                                                        border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        minWidth: '60px',
                                                        backgroundColor: isSelected ? '#e6f7ff' : '#fff'
                                                    }}
                                                    title={name}
                                                >
                                                    <IconComponent size={24} stroke={1.5} />
                                                    <span style={{ fontSize: '10px', marginTop: '4px', color: '#888' }}>{name.replace('Icon','')}</span>
                                                </div>
                                            );
                                        })}
                                        <div
                                             onClick={() => setFieldsValue({ iconName: '' })}
                                             style={{
                                                 padding: '8px',
                                                 border: !currentIconName ? '2px solid #1890ff' : '1px solid #d9d9d9',
                                                 borderRadius: '4px',
                                                 cursor: 'pointer',
                                                 display: 'flex',
                                                 flexDirection: 'column',
                                                 alignItems: 'center',
                                                 justifyContent: 'center',
                                                 minWidth: '60px',
                                                 height: '62px',
                                                 backgroundColor: !currentIconName ? '#e6f7ff' : '#fff'
                                             }}
                                             title="无图标"
                                        >
                                             <span style={{ fontSize: '12px', color: '#888' }}>无图标</span>
                                        </div>
                                    </div>
                                );
                            }}
                        </Form.Item>
                    </Form.Item>
                    <Form.Item
                        label="Dify API 配置"
                        required
                        tooltip="用于调用此卡片对应的 Dify 应用"
                        style={{ marginBottom: 0 }}
                    >
                        <Form.Item
                             name={['difyConfig', 'apiKey']}
                             label="API Key"
                             rules={[{ required: true, message: '必须提供 Dify API Key!' }]}
                             style={{ display: 'inline-block', width: 'calc(50% - 8px)', marginRight: '16px' }}
                        >
                            <Input.Password placeholder="输入 Dify API Key" />
                        </Form.Item>
                        <Form.Item
                             name={['difyConfig', 'apiUrl']}
                             label="API URL"
                             rules={[{ required: true, message: '必须提供 API URL!' }]}
                             initialValue={'https://api.dify.ai/v1'}
                             style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
                        >
                            <Input placeholder="Dify API 地址" />
                        </Form.Item>
                     </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ApplicationPage;