import { FC, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { IconAdjustments, IconBrandGithub, IconHelp, IconHome, IconMenu2, IconMoon, IconSun } from '@tabler/icons-react';
import { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';

interface Props {
  onToggle: () => void;
  isOpen?: boolean;
}

export const SidebarSlim: FC<Props> = ({ onToggle, isOpen = false }) => {
  const { t } = useTranslation('sidebar');
  
  const {
    state: { lightMode },
    dispatch: homeDispatch,
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
    <div className="fixed left-0 top-0 z-20 flex h-full w-[60px] flex-col items-center border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-[#202123]">
      <div className="flex w-full flex-col items-center">
        <div 
          className="mt-5 mb-2 flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10 mx-auto"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
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
        </div>
        
        <div 
          className="mb-4 flex justify-center cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // 主页按钮功能
          }}
        >
          <IconHome className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
      </div>

      <div className="mt-auto mb-5 flex flex-col items-center gap-5">
        <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={handleThemeChange}
          title={lightMode === 'light' ? '切换到深色模式' : '切换到浅色模式'}
        >
          {lightMode === 'light' ? (
            <IconMoon className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
          ) : (
            <IconSun className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
          )}
        </div>

        <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // 设置按钮功能
          }}
        >
          <IconAdjustments className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>

        <div 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // 帮助按钮功能
          }}
        >
          <IconHelp className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>

        <a 
          href="https://github.com/ifLab/eduhub" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex cursor-pointer justify-center items-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10"
          onClick={(e) => e.stopPropagation()}
        >
          <IconBrandGithub className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </a>
      </div>
    </div>
  );
}; 