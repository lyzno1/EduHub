import React, {useState} from 'react';
import {Button, Form, Layout, Menu, Popconfirm, Table} from 'antd';
import {
    AppstoreOutlined,
    DatabaseOutlined,
    BulbOutlined,
    SettingOutlined,
    SkinOutlined,
    UserOutlined,
    QuestionOutlined,
    LogoutOutlined,
    SyncOutlined,
    GlobalOutlined
} from '@ant-design/icons';
import ApplicationPage  from "../../components/ApplicationPage";
import IndexPage   from "../../components/IndexPage";
import PromptsPage from "../../components/PromptsPage";
import HelpPage from "../../components/HelpPage";
import AppearancePage from "../../components/AppearancePage";
import IndexTeacherPage from "../../components/IndexTeacherPage";
import {useNavigate} from "react-router-dom";
import SettingPage  from "../../components/SettingPage";
import UserManagePage from "../../components/UserManagePage";
import RebuildAndRestartButton from '../../components/RebuildAndRestartButton';
import GlobalSettingsPage from '../../components/GlobalSettingsPage';

const { Header, Content, Sider } = Layout;

// 定义菜单项数据结构
const menuItems = [
    {
        key: '1',
        icon: <AppstoreOutlined />,
        label: '应用管理',
    },
    {
        key: '9',
        icon: <GlobalOutlined />,
        label: '普通聊天设置',
    },
    {
        key: '2',
        icon: <DatabaseOutlined />,
        label: '学生目录管理',
    },
    {
        key: '3',
        icon: <DatabaseOutlined />,
        label: '老师目录管理',
    },
    {
        key: '4',
        icon: <BulbOutlined />,
        label: '提示词管理',
    },
    {
        key: '5',
        icon: <SettingOutlined />,
        label: '配置',
    },
    {
        key: '6',
        icon: <SkinOutlined />,
        label: '外观',
    },
    {
        key: '7',
        icon: <UserOutlined />,
        label: '用户管理',
    },
    {
        key: '8',
        icon: <QuestionOutlined />,
        label: '帮助管理',
    },
];

const AdminPage = () => {
    const [selectedMenu, setSelectedMenu] = useState('1');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('userToken');
        navigate('/');
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header className="header" style={{ color: 'white', fontSize: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>BISTU Copilot 后台管理</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <RebuildAndRestartButton style={{ marginRight: '10px' }} icon={<SyncOutlined />} />
                <Popconfirm
                    title="你确定要退出登录吗？"
                    onConfirm={handleLogout}
                    okText="是"
                    cancelText="否"
                >
                    <Button type="text" icon={<LogoutOutlined />} style={{ color: 'white', marginLeft: '20px' }}>
                         退 出
                    </Button>
                </Popconfirm>
              </div>
            </Header>
            <Layout>
                <Sider width={200} className="site-layout-background">
                    <Menu
                        mode="inline"
                        selectedKeys={[selectedMenu]} // 使用 selectedKeys 控制选中项
                        style={{ height: '100%', borderRight: 0 }}
                        onSelect={({ key }) => setSelectedMenu(key)}
                        items={menuItems} // 使用 items prop 渲染菜单
                    />
                </Sider>
                <Layout style={{ padding: '24px' }}>
                    <Content
                        className="site-layout-background"
                        style={{
                            padding: 24,
                            margin: 0,
                            minHeight: 280,
                            backgroundColor: 'white',
                        }}
                    >
                        {/* Content goes here */}
                        {selectedMenu === '1' && <ApplicationPage />}
                        {selectedMenu === '9' && <GlobalSettingsPage />}
                        {selectedMenu === '2' && <IndexPage />}
                        {selectedMenu === '3' && <IndexTeacherPage />}
                        {selectedMenu === '4' && <PromptsPage />}
                        {selectedMenu === '5' && <SettingPage />}
                        {selectedMenu === '6' && <AppearancePage />}
                        {selectedMenu === '7' && <UserManagePage/>}
                        {selectedMenu === '8' && <HelpPage />}
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
};

export default AdminPage;