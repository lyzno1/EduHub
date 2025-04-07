import { IconMessagePlus, IconSearch, IconX } from '@tabler/icons-react';
import { FC, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';
import { Conversation } from '@/types/chat';
import { ConversationComponent } from './ConversationComponent';
import Link from 'next/link';

interface Props {
  onToggle: () => void;
  isOpen: boolean;
}

export const SidebarNav: FC<Props> = ({ onToggle, isOpen }) => {
  const { t } = useTranslation('sidebar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const {
    state: { conversations, selectedConversation },
    handleNewConversation,
    handleSelectConversation,
  } = useContext(HomeContext);

  // 检测设备类型
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
      const filtered = conversations.filter((conversation) =>
        conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setIsSearching(false);
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  const displayedConversations = isSearching ? filteredConversations : conversations;
  const hasNoResults = isSearching && filteredConversations.length === 0;

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    setIsSearching(false);
  };

  const handleCreateNewChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleNewConversation();
  };

  // 阻止事件冒泡到外部容器
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 注入移动端专用的样式
  useEffect(() => {
    // 只在浏览器环境执行
    if (typeof window === 'undefined') return;
    
    // 创建样式表
    const styleEl = document.createElement('style');
    styleEl.id = 'mobile-sidebar-styles';
    
    // 设置样式内容 - 只针对移动设备的z-index增强
    styleEl.innerHTML = `
      @media (max-width: 640px) {
        #mobile-sidebar-container {
          z-index: 9999 !important;
        }
        
        /* 确保移动端背景蒙版也有足够高的z-index */
        .mobile-sidebar-backdrop {
          z-index: 9998 !important;
        }
      }
    `;
    
    // 添加到头部
    document.head.appendChild(styleEl);
    
    // 清理函数
    return () => {
      const existingStyle = document.getElementById('mobile-sidebar-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <div 
      className={`fixed top-0 flex h-full w-[260px] max-w-[85vw] flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-[#202123] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } left-0 sm:left-[60px]`}
      onClick={stopPropagation}
      style={{ 
        // 移动端和桌面端使用不同的z-index
        zIndex: isMobile ? 9999 : 40
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <button 
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 sm:hidden"
            onClick={onToggle}
          >
            <IconX size={18} />
          </button>
          <div className="text-lg font-medium ml-2 sm:ml-0 sm:hidden">对话列表</div>
        </div>
        <button 
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
          onClick={handleCreateNewChat}
          onMouseDown={(e) => e.preventDefault()}
          data-tooltip="新建聊天"
          data-placement="bottom"
        >
          <IconMessagePlus size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          <div className="relative flex items-center">
            <div className="relative w-full">
              <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
                <IconSearch className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <input
                className="w-full rounded-[12px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#11191f] py-2 pl-10 pr-10 text-sm text-[#333333] dark:text-[hsl(205deg,16%,77%)] transition-colors duration-200 
                focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-500 dark:focus:border-gray-500 dark:focus:ring-gray-500
                hover:border-gray-400 dark:hover:border-gray-500"
                placeholder={t('搜索聊天...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ fontFamily: "'PingFang SC', Arial, sans-serif" }}
              />
              {searchTerm && (
                <div className="absolute right-3 top-0 bottom-0 flex items-center">
                  <button
                    className="flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                    onClick={handleClearSearch}
                    onMouseDown={(e) => e.preventDefault()}
                    data-tooltip="清除搜索"
                    data-placement="left"
                  >
                    <IconX size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-2 pb-2">
          {hasNoResults ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-2">
              未找到相关聊天
            </div>
          ) : (
            displayedConversations.map((conversation) => (
              <ConversationComponent key={conversation.id} conversation={conversation} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};