import React, { useState, useEffect, useCallback } from 'react';
import { Card, Checkbox, Button, message, Spin, Divider, Row, Col, Typography } from 'antd';
import { API_URL } from '../../config/config';

const { Title, Text } = Typography;

const IndexTeacherPage = () => {
    const [loading, setLoading] = useState(true);
    // Stores the definition of available apps and cards from dify_keys.json
    const [availableAppsData, setAvailableAppsData] = useState({}); 
    // Stores the current selection/permission state { folderKey: [cardId1, ...] }
    const [allowedApps, setAllowedApps] = useState({}); 

    // Fetch initial data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [appsResponse, configResponse] = await Promise.all([
                fetch(`${API_URL}/api/available-apps`),
                fetch(`${API_URL}/api/teacher-config`) // Fetch teacher config
            ]);

            if (!appsResponse.ok || !configResponse.ok) {
                throw new Error('Failed to fetch initial data');
            }

            const appsData = await appsResponse.json();
            const configData = await configResponse.json();

            setAvailableAppsData(appsData || {});
            setAllowedApps(configData?.allowedApps || {}); // Initialize with fetched teacher config

        } catch (error) {
            console.error("Error fetching data:", error);
            message.error('加载应用或配置失败，请刷新重试');
            setAvailableAppsData({}); // Reset on error
            setAllowedApps({});     // Reset on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle checking/unchecking a whole app (folder)
    const handleAppCheckChange = (folderKey, isChecked) => {
        setAllowedApps(prev => {
            const newState = { ...prev };
            if (isChecked) {
                // Add the app and all its cards
                const allCardIds = availableAppsData[folderKey]?.cards.map(c => c.cardId) || [];
                newState[folderKey] = allCardIds;
            } else {
                // Remove the app
                delete newState[folderKey];
            }
            return newState;
        });
    };

    // Handle checking/unchecking a single card
    const handleCardCheckChange = (folderKey, cardId, isChecked) => {
        setAllowedApps(prev => {
            const newState = { ...prev };
            const currentCards = newState[folderKey] ? [...newState[folderKey]] : [];

            if (isChecked) {
                // Add card if not already present
                if (!currentCards.includes(cardId)) {
                    currentCards.push(cardId);
                }
                newState[folderKey] = currentCards; // Ensure folderKey exists
            } else {
                // Remove card
                const index = currentCards.indexOf(cardId);
                if (index > -1) {
                    currentCards.splice(index, 1);
                }
                // If no cards left for this app, remove the app key
                if (currentCards.length === 0) {
                    delete newState[folderKey];
                } else {
                    newState[folderKey] = currentCards;
                }
            }
            return newState;
        });
    };

    // Handle saving the configuration
    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/update-teacher-config`, { // Update teacher config endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ allowedApps }), // Send the current state
            });

            const result = await response.json();

            if (response.ok && result.success) {
                message.success('老师可见应用配置保存成功'); // Changed message to Chinese
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

    // Calculate checkbox state for an app
    const getAppCheckboxState = (folderKey) => {
        const appData = availableAppsData[folderKey];
        const allowedCardsForApp = allowedApps[folderKey] || [];
        const allCardIds = appData?.cards.map(c => c.cardId) || [];
        
        const isChecked = allowedCardsForApp.length > 0 && allowedCardsForApp.length === allCardIds.length && allCardIds.every(id => allowedCardsForApp.includes(id));
        const isIndeterminate = allowedCardsForApp.length > 0 && !isChecked;

        return { isChecked, isIndeterminate };
    };

    return (
        <Spin spinning={loading}>
            <Card title="老师可见应用与功能卡片配置"> {/* Updated title */}
                <Typography.Paragraph type="secondary">
                    勾选应用或其下的具体功能卡片，以控制老师用户界面中可见的内容。保存后生效。
                </Typography.Paragraph>
                <Button 
                    type="primary" 
                    onClick={handleSave} 
                    style={{ marginBottom: 20 }} 
                    disabled={loading || Object.keys(availableAppsData).length === 0}
                >
                    保存配置
                </Button>
                
                {Object.keys(availableAppsData).length === 0 && !loading ? (
                    <Text>没有可配置的应用。</Text>
                ) : (
                    <Row gutter={[16, 16]}>
                        {Object.entries(availableAppsData).map(([folderKey, appData]) => {
                            const { isChecked: appIsChecked, isIndeterminate: appIsIndeterminate } = getAppCheckboxState(folderKey);
                            return (
                                <Col xs={24} sm={12} md={8} lg={6} key={folderKey}>
                                    <Card 
                                        size="small" 
                                        title={
                                            <Checkbox
                                                checked={appIsChecked}
                                                indeterminate={appIsIndeterminate}
                                                onChange={(e) => handleAppCheckChange(folderKey, e.target.checked)}
                                            >
                                                <Text strong>{appData.displayName}</Text>
                                            </Checkbox>
                                        }
                                        style={{ height: '100%' }}
                                    >
                                        {appData.cards && appData.cards.length > 0 ? (
                                            appData.cards.map(card => (
                                                <div key={card.cardId} style={{ marginBottom: '8px' }}>
                                                    <Checkbox
                                                        checked={allowedApps[folderKey]?.includes(card.cardId) || false}
                                                        onChange={(e) => handleCardCheckChange(folderKey, card.cardId, e.target.checked)}
                                                    >
                                                        {card.name} <Text type="secondary">({card.cardId})</Text>
                                                    </Checkbox>
                                                </div>
                                            ))
                                        ) : (
                                            <Text type="secondary">此应用下暂无功能卡片</Text>
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