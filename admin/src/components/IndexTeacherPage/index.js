import React, { useState, useEffect, useCallback } from 'react';
import { Card, Checkbox, Button, message, Spin, Divider, Row, Col, Typography, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { API_URL } from '../../config/config';

const { Title, Text } = Typography;

const IndexTeacherPage = () => {
    const [loading, setLoading] = useState(true);
    const [availableAppsData, setAvailableAppsData] = useState({}); 
    const [allowedApps, setAllowedApps] = useState({}); 
    const [appDisplayOrder, setAppDisplayOrder] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [appsResponse, configResponse] = await Promise.all([
                fetch(`${API_URL}/api/available-apps`),
                fetch(`${API_URL}/api/teacher-config`) 
            ]);

            if (!appsResponse.ok || !configResponse.ok) {
                const appsStatus = appsResponse.status;
                const configStatus = configResponse.status;
                throw new Error(`Failed to fetch data. Apps: ${appsStatus}, Config: ${configStatus}`);
            }

            const appsData = await appsResponse.json();
            const configData = await configResponse.json();

            setAvailableAppsData(appsData || {});
            setAllowedApps(configData?.allowedApps || {});
            
            let effectiveOrder = [];
            if (Array.isArray(configData?.appDisplayOrder) && configData.appDisplayOrder.length > 0) {
                effectiveOrder = configData.appDisplayOrder.filter(key => (appsData || {}).hasOwnProperty(key));
            }
            
            const availableKeys = Object.keys(appsData || {});
            availableKeys.forEach(key => {
                if (!effectiveOrder.includes(key)) {
                    effectiveOrder.push(key);
                }
            });
            setAppDisplayOrder(effectiveOrder);

        } catch (error) {
            console.error("Error fetching data for TeacherPage:", error);
            message.error(`加载教师端数据失败: ${error.message}`);
            setAvailableAppsData({});
            setAllowedApps({});
            setAppDisplayOrder([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAppCheckChange = (folderKey, isChecked) => {
        setAllowedApps(prev => {
            const newState = { ...prev };
            if (isChecked) {
                const allCardIds = availableAppsData[folderKey]?.cards.map(c => c.cardId) || [];
                const existingCardsInOrder = newState[folderKey] || [];
                const newCardsToAdd = allCardIds.filter(id => !existingCardsInOrder.includes(id));
                newState[folderKey] = [...existingCardsInOrder, ...newCardsToAdd];
                if (newState[folderKey].length === allCardIds.length && existingCardsInOrder.length === 0) {
                    newState[folderKey] = allCardIds;
                }
            } else {
                delete newState[folderKey];
            }
            return newState;
        });
    };

    const handleCardCheckChange = (folderKey, cardId, isChecked) => {
        setAllowedApps(prev => {
            const newState = { ...prev };
            let currentCards = newState[folderKey] ? [...newState[folderKey]] : [];
            const appAllCards = availableAppsData[folderKey]?.cards.map(c => c.cardId) || [];

            if (isChecked) {
                if (!currentCards.includes(cardId)) {
                    let orderedCurrentCards = [];
                    let cardAdded = false;
                    for (const availableCardId of appAllCards) {
                        if (currentCards.includes(availableCardId)) {
                            orderedCurrentCards.push(availableCardId);
                        }
                        if (availableCardId === cardId) {
                            orderedCurrentCards.push(cardId);
                            cardAdded = true;
                        }
                    }
                    if(!cardAdded && !orderedCurrentCards.includes(cardId)) {
                         orderedCurrentCards.push(cardId);
                    }
                     newState[folderKey] = orderedCurrentCards;
                }
            } else {
                currentCards = currentCards.filter(id => id !== cardId);
            }

            if (currentCards.length === 0) {
                const appData = availableAppsData[folderKey];
                const allCardIdsForApp = appData?.cards?.map(c => c.cardId) || [];
                if (allCardIdsForApp.length > 0) { 
                    delete newState[folderKey];
                } else { 
                    if (newState.hasOwnProperty(folderKey)) {
                         newState[folderKey] = [];
                    }
                }
            } else {
                newState[folderKey] = currentCards;
            }
            return newState;
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/update-teacher-config`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ allowedApps, appDisplayOrder }), 
            });

            const result = await response.json();

            if (response.ok && result.success) {
                message.success('老师可见应用配置保存成功');
            } else {
                throw new Error(result.message || '保存配置失败');
            }
        } catch (error) {
            console.error("Error saving teacher config:", error);
            message.error(`保存失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getAppCheckboxState = (folderKey) => {
        const appData = availableAppsData[folderKey];
        const allowedCardsForApp = allowedApps[folderKey] || []; 
        const allCardIdsInApp = appData?.cards?.map(c => c.cardId) || [];
    
        if (allCardIdsInApp.length === 0) {
            return { isChecked: allowedApps.hasOwnProperty(folderKey) && Array.isArray(allowedApps[folderKey]), isIndeterminate: false };
        }
    
        const checkedCount = allowedCardsForApp.length;
        const isChecked = checkedCount === allCardIdsInApp.length && allCardIdsInApp.every(id => allowedCardsForApp.includes(id));
        const isIndeterminate = checkedCount > 0 && !isChecked;
    
        return { isChecked, isIndeterminate };
    };

    const moveApp = (folderKey, direction) => {
        const currentIndex = appDisplayOrder.indexOf(folderKey);
        if (currentIndex === -1) return;

        const newOrder = [...appDisplayOrder];
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= newOrder.length) return;

        [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
        setAppDisplayOrder(newOrder);
    };

    const moveCardInApp = (folderKey, cardId, direction) => {
        setAllowedApps(prev => {
            const newState = { ...prev };
            const currentCards = newState[folderKey] ? [...newState[folderKey]] : [];
            if (!currentCards || currentCards.length < 2) return newState;

            const cardIndex = currentCards.indexOf(cardId);
            if (cardIndex === -1) return newState;

            const targetIndex = direction === 'up' ? cardIndex - 1 : cardIndex + 1;
            if (targetIndex < 0 || targetIndex >= currentCards.length) return newState;

            const newCardsOrder = [...currentCards];
            [newCardsOrder[cardIndex], newCardsOrder[targetIndex]] = [newCardsOrder[targetIndex], newCardsOrder[cardIndex]];
            newState[folderKey] = newCardsOrder;
            return newState;
        });
    };

    const orderedAppsToRender = appDisplayOrder
        .map(key => {
            if (availableAppsData[key]) {
                return { key, ...availableAppsData[key] };
            }
            return null;
        })
        .filter(app => app !== null && app.displayName);

    return (
        <Spin spinning={loading}>
            <Card title="老师可见应用与功能卡片配置">
                <Typography.Paragraph type="secondary">
                    勾选应用或其下的具体功能卡片，以控制老师用户界面中可见的内容。使用箭头调整显示顺序。保存后生效。
                </Typography.Paragraph>
                <Button 
                    type="primary" 
                    onClick={handleSave} 
                    style={{ marginBottom: 20 }} 
                    disabled={loading || Object.keys(availableAppsData).length === 0}
                >
                    保存配置
                </Button>
                
                {orderedAppsToRender.length === 0 && !loading ? (
                    <Text>没有可配置的应用或应用顺序数据为空。</Text>
                ) : (
                    <Row gutter={[16, 16]}>
                        {orderedAppsToRender.map((appData, index) => {
                            const folderKey = appData.key;
                            const { isChecked: appIsChecked, isIndeterminate: appIsIndeterminate } = getAppCheckboxState(folderKey);
                            const currentAppCards = allowedApps[folderKey] || [];

                            return (
                                <Col xs={24} sm={12} md={8} lg={6} key={folderKey}>
                                    <Card 
                                        size="small" 
                                        title={
                                            <Space>
                                                <Checkbox
                                                    checked={appIsChecked}
                                                    indeterminate={appIsIndeterminate}
                                                    onChange={(e) => handleAppCheckChange(folderKey, e.target.checked)}
                                                >
                                                    <Text strong>{appData.displayName}</Text>
                                                </Checkbox>
                                            </Space>
                                        }
                                        extra={
                                            <Space>
                                                <Button 
                                                    type="text" 
                                                    icon={<ArrowUpOutlined />} 
                                                    onClick={() => moveApp(folderKey, 'up')}
                                                    disabled={index === 0}
                                                    size="small"
                                                />
                                                <Button 
                                                    type="text" 
                                                    icon={<ArrowDownOutlined />} 
                                                    onClick={() => moveApp(folderKey, 'down')}
                                                    disabled={index === orderedAppsToRender.length - 1}
                                                    size="small"
                                                />
                                            </Space>
                                        }
                                        style={{ height: '100%' }}
                                        bodyStyle={{ maxHeight: '300px', overflowY: 'auto' }}
                                    >
                                        {appData.cards && appData.cards.length > 0 ? (
                                            currentAppCards 
                                                .map((orderedCardId, cardIndex) => {
                                                    const card = appData.cards.find(c => c.cardId === orderedCardId);
                                                    if (!card) return null; 
                                                    return (
                                                        <div key={card.cardId} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <Checkbox
                                                                checked={true} 
                                                                onChange={(e) => handleCardCheckChange(folderKey, card.cardId, e.target.checked)}
                                                                style={{ flexGrow: 1 }}
                                                            >
                                                                {card.name} <Text type="secondary">({card.cardId})</Text>
                                                            </Checkbox>
                                                            <Space size="small">
                                                                <Button
                                                                    type="text"
                                                                    icon={<ArrowUpOutlined />}
                                                                    size="small"
                                                                    onClick={() => moveCardInApp(folderKey, card.cardId, 'up')}
                                                                    disabled={cardIndex === 0}
                                                                />
                                                                <Button
                                                                    type="text"
                                                                    icon={<ArrowDownOutlined />}
                                                                    size="small"
                                                                    onClick={() => moveCardInApp(folderKey, card.cardId, 'down')}
                                                                    disabled={cardIndex === currentAppCards.length - 1}
                                                                />
                                                            </Space>
                                                        </div>
                                                    );
                                                }).filter(Boolean)
                                        ) : (
                                            <Text type="secondary" style={{ display: 'block', padding: '8px 0' }}>此应用下暂无功能卡片</Text>
                                        )}
                                        {appData.cards && appData.cards.length > 0 && (!allowedApps[folderKey] || allowedApps[folderKey].length < appData.cards.length) && (
                                            <Text type="secondary" style={{ display: 'block', marginTop: '10px', fontSize: '0.9em' }}>
                                                勾选上方的应用名称以批量添加/移除所有卡片。未勾选的卡片不会显示。
                                            </Text>
                                        )}
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                )}
                <Divider />
                 <Button 
                    type="primary" 
                    onClick={handleSave} 
                    style={{ marginTop: 10 }} 
                    disabled={loading || Object.keys(availableAppsData).length === 0}
                 >
                    保存配置
                </Button>
            </Card>
        </Spin>
    );
};

export default IndexTeacherPage;