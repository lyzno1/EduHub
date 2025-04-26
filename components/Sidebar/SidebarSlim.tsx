import { FC, useState, useContext } from 'react';
import { useTranslation } from 'next-i18next';
import { IconAdjustments, IconBrandGithub, IconHelp, IconHome, IconMenu2, IconMoon, IconPlus, IconSun, IconLogout, IconX, IconAlertTriangle, IconSettings } from '@tabler/icons-react';
import HomeContext from '@/pages/api/home/home.context';
import Cookie from 'js-cookie';
import { HelpDialog } from '../Settings/HelpDialog';

interface Props {
  onToggle: () => void;
  isSidebarOpen?: boolean;
  onOpenModelSettings?: () => void;
}

export const SidebarSlim: FC<Props> = ({ onToggle, isSidebarOpen = false, onOpenModelSettings }) => {
  const { t } = useTranslation('sidebar');
  
  const {
    state: { lightMode },
    dispatch: homeDispatch,
    handleNewConversation,
  } = useContext(HomeContext);
  
  // 模态框显示状态
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState<boolean>(false);

  const handleThemeChange = (e: React.MouseEvent) => {
    // 阻止事件冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 切换主题
    const newLightMode = lightMode === 'light' ? 'dark' : 'light';
    
    // 更新Context中的状态
    homeDispatch({ field: 'lightMode', value: newLightMode });
    
    // 保存到localStorage
    localStorage.setItem('theme', newLightMode);
    
    // 直接修改HTML元素类，立即应用主题
    if (newLightMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    
    // 派发自定义事件，通知其他组件主题已更改
    window.dispatchEvent(new CustomEvent('themeChange', { detail: newLightMode }));
    
    // 强制更新localStorage事件，以便_app.tsx中的监听器可以响应
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'theme',
      newValue: newLightMode,
      storageArea: localStorage
    }));
  };

  // 打开退出登录模态框
  const openLogoutModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowLogoutModal(true);
  };

  // 执行退出登录
  const executeLogout = () => {
    // 仅删除user Cookie以终止登录状态，不清除localStorage中的聊天记录和其他数据
    Cookie.remove('user');
    
    // 重定向到登录页面
    window.location.href = '/login';
  };

  return (
    <>
    <div className="fixed left-0 top-0 z-20 flex h-full w-[60px] flex-col items-center border-r border-gray-200 bg-[#f5f5f5] dark:border-gray-800 dark:bg-[#202123]">
      <div className="flex w-full flex-col items-center">
        <div 
          className="mt-5 mb-2 flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10 mx-auto"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
          data-tooltip={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          data-placement="right"
        >
          {isSidebarOpen ? (
            // 左箭头图标（关闭侧边栏）
            <svg 
              viewBox="0 0 24 24" 
              width="20" 
              height="20" 
              stroke="currentColor" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <polyline points="17 8 13 12 17 16" />
            </svg>
          ) : (
            // 右箭头图标（打开侧边栏）
            <svg 
              viewBox="0 0 24 24" 
              width="20" 
              height="20" 
              stroke="currentColor" 
              strokeWidth="2" 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <polyline points="13 8 17 12 13 16" />
            </svg>
          )}
        </div>
        
        <div 
          className="mb-4 flex justify-center cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNewConversation();
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
          data-tooltip="新建聊天"
          data-placement="right"
        >
          <IconPlus className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
      </div>

      <div className="mt-auto mb-5 flex flex-col items-center gap-4">
        <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleThemeChange(e);
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
          data-tooltip={lightMode === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          data-placement="right"
        >
          {lightMode === 'light' ? (
            <IconMoon className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
          ) : (
            <IconSun className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
          )}
        </div>

        {/* 暂时隐藏GitHub仓库 */}
        {/* <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open("https://github.com/ifLab/eduhub", "_blank", "noopener,noreferrer");
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
          data-tooltip="GitHub仓库"
          data-placement="right"
        >
          <IconBrandGithub className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div> */}

        <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onOpenModelSettings) {
              onOpenModelSettings();
            }
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
          data-tooltip="设置"
          data-placement="right"
        >
          <IconSettings className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
        
          {/* 关于按钮 - Now opens HelpDialog */}
        <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
              setIsHelpDialogOpen(true);
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
            data-tooltip="关于"
          data-placement="right"
        >
          <IconHelp className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
        
        {/* 退出登录按钮 */}
        <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={openLogoutModal}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
          data-tooltip="退出登录"
          data-placement="right"
        >
          <IconLogout className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
      </div>

      {/* 退出登录确认模态框 */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowLogoutModal(false)}>
          <div 
            className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6" 
              onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button 
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setShowLogoutModal(false)}
              aria-label="关闭"
            >
              <IconX size={20} />
            </button>

            <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
              <IconAlertTriangle size={24} className="mr-2" />
              <h3 className="text-lg font-medium">确认退出登录</h3>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              您确定要退出当前账号吗？您的聊天记录将保留在本地。
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md"
              >
                取消
              </button>
              <button
                onClick={executeLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center"
              >
                <IconLogout size={16} className="mr-1.5" />
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Render HelpDialog */} 
      <HelpDialog 
        isOpen={isHelpDialogOpen} 
        onClose={() => setIsHelpDialogOpen(false)} 
      />
    </>
  );
};