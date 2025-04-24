import { FC, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { IconAdjustments, IconBrandGithub, IconHelp, IconHome, IconMenu2, IconMoon, IconPlus, IconSun } from '@tabler/icons-react';
import { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import aboutConfig from '@/config/aboutInfo';

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

  // 当组件加载时，确保应用正确的主题
  useEffect(() => {
    // 从localStorage获取保存的主题，如果没有则默认为light
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // 如果localStorage中的主题与当前状态不同，更新状态
    if (savedTheme !== lightMode) {
      homeDispatch({ field: 'lightMode', value: savedTheme });
    }
    
    // 应用正确的主题类到HTML元素
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      // 强制确保移除深色模式
      document.documentElement.classList.add('light');
    }
  }, []);

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

  return (
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
          <IconAdjustments className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
        
        {/* 新增：关于按钮 */}
        <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // 可以在此处添加点击处理程序，例如显示更详细的"关于"对话框
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={(e) => e.preventDefault()}
          onMouseLeave={(e) => e.preventDefault()}
          data-tooltip={aboutConfig.tooltipContent}
          data-placement="right"
        >
          <IconHelp className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
      </div>
    </div>
  );
};