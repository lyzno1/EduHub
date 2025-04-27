import { IconMessagePlus, IconSearch, IconX, IconBrandChrome, IconSchool, IconBook, IconCode, IconBrain, IconRobot, IconBook2, IconUsers, IconGripVertical, IconMenu2, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { FC, useContext, useEffect, useState, useRef, CSSProperties, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { useDrag } from '@use-gesture/react';

import HomeContext from '@/pages/api/home/home.context';
import { Conversation } from '@/types/chat';
import { ConversationComponent } from './components/Conversation';
import Link from 'next/link';
import { saveConversations } from '@/utils/app/conversation';
import { AppConfig } from '@/pages/api/home/home';

// Default background color (no longer primary, but keep as fallback?)
const defaultAppBgColor = 'bg-gray-100 dark:bg-gray-700';

// Define the cycle of background colors for Sidebar app icons
const sidebarBgColorCycle: ReadonlyArray<string> = [
    'bg-green-100 dark:bg-green-900/30',
    'bg-yellow-100 dark:bg-yellow-900/30',
    'bg-blue-100 dark:bg-blue-900/30',
    'bg-purple-100 dark:bg-purple-900/30',
];

interface Props {
  onToggle: () => void;
  isOpen: boolean;
}

const SIDEBAR_WIDTH = 260;
const INITIAL_APP_DISPLAY_LIMIT = 5; // 設定初始顯示數量
const INITIAL_CONVERSATION_DISPLAY_LIMIT = 5; // 新增：对话显示限制

export const SidebarNav: FC<Props> = ({ onToggle, isOpen }) => {
  const { t } = useTranslation('sidebar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [modalOpenConversationId, setModalOpenConversationId] = useState<string | null>(null);
  const [isAppListExpanded, setIsAppListExpanded] = useState<boolean>(false);
  const [isConversationListExpanded, setIsConversationListExpanded] = useState<boolean>(false); // 新增：对话列表展开状态
  const prevSelectedConversationRef = useRef<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    state,
    dispatch,
    handleNewConversation,
    handleSelectConversation,
    handleSelectOrStartAppConversation,
    appConfigs,
  } = useContext(HomeContext);
  const { conversations, selectedConversation, activeAppId, allowedAppsConfig } = state;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
      const filtered = conversations.filter((conversation: Conversation) =>
        conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setIsSearching(false);
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  const displayedConversations = isSearching ? filteredConversations : conversations;
  const hasNoResults = isSearching && displayedConversations.length === 0;

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    setIsSearching(false);
  };

  const handleCreateNewChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleNewConversation();
    
    if (isMobile) {
      setTimeout(() => {
        onToggle();
      }, 100);
    }
  };

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    
    if (selectedConversation && prevSelectedConversationRef.current !== null) {
      if (prevSelectedConversationRef.current !== selectedConversation.id) {
        setTimeout(() => {
          onToggle();
        }, 150);
      }
    }
    
    if (selectedConversation) {
      prevSelectedConversationRef.current = selectedConversation.id;
    }
  }, [selectedConversation, isMobile, isOpen, onToggle]);

  useEffect(() => {
    if (selectedConversation) {
      prevSelectedConversationRef.current = selectedConversation.id;
    }
  }, []);

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  const handleAppClick = (appId: number) => {
     handleSelectOrStartAppConversation(appId);
     if (isMobile) {
       setTimeout(() => {
         onToggle();
       }, 100);
     }
  };

  const handleSetModalOpen = (conversationId: string | null) => {
    setModalOpenConversationId(conversationId);
  };

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx], cancel, last }) => {
      setIsDraggingSidebar(down);
      
      if (dx > 0) {
        if(cancel) cancel();
        if (!last) setTranslateX(0);
        return;
      } 
      
      let newTranslateX = Math.min(0, Math.max(-SIDEBAR_WIDTH, mx));
      setTranslateX(newTranslateX);

      if (last) {
        const closeThreshold = SIDEBAR_WIDTH / 3;
        const velocityThreshold = 0.5;

        if ((Math.abs(mx) > closeThreshold || Math.abs(vx) > velocityThreshold) && dx < 0) {
          console.log("Swipe close triggered");
          onToggle();
        } 
        setTranslateX(0);
      }
    },
    {
      axis: 'x',
      enabled: isMobile && isOpen,
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  const dynamicApplications = useMemo(() => {
    if (!appConfigs || typeof appConfigs !== 'object') {
        console.warn("[SidebarNav] appConfigs provided by context is not a valid object:", appConfigs);
        return [];
    }

    const allAppConfigsArray = Object.values(appConfigs);

    // 在映射前进行过滤
    const filteredApps = allAppConfigsArray.filter(appConfig => {
      // 1. 直接从 appConfig 获取 FolderKey
      const folderKey = appConfig.folderKey;

      if (!folderKey) {
         // 如果 folderKey 不存在于 AppConfig 中，可能需要警告或默认隐藏
         console.warn(`SidebarNav: folderKey missing for appId ${appConfig.id}. Hiding app.`);
         return false; // 没有 folderKey，无法判断权限，隐藏
      }

      // 2. 根据 allowedAppsConfig 判断
      // 如果 allowedAppsConfig 为 null，表示无限制（或未加载完成），显示所有应用
      // 如果 allowedAppsConfig 不为 null，检查 folderKey 是否是其键
      return allowedAppsConfig === null || (allowedAppsConfig && allowedAppsConfig.hasOwnProperty(folderKey));
    });

    // 对过滤后的应用进行颜色分配和映射
    return filteredApps.map((config: AppConfig, index: number) => {
      const bgColor = sidebarBgColorCycle[index % sidebarBgColorCycle.length];
      return {
        ...config,
        color: bgColor,
        icon: config.icon || <IconRobot size={18}/> // 提供默认图标
      };
    });
  }, [appConfigs, allowedAppsConfig]);

  // Sort conversations: pinned first, then by original order (implicitly by time)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      // Pinned items come first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Otherwise, maintain original relative order (or add other criteria like date)
      return 0; // Keep original order among pinned/unpinned groups
    });
  }, [conversations]);

  // Apply search filtering AFTER sorting by pin status
  const filteredSortedConversations = useMemo(() => {
    if (!isSearching) return sortedConversations;
    return sortedConversations.filter(conversation =>
      conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [isSearching, searchTerm, sortedConversations]);

  // Apply display limit AFTER sorting and filtering
  const conversationsToRender = useMemo(() => {
    const listToLimit = filteredSortedConversations; // Use the filtered & sorted list
    // Always show all results when searching
    if (isSearching) {
      return listToLimit;
    }
    // Show limited or all based on expansion state
    if (isConversationListExpanded) {
      return listToLimit;
    }
    return listToLimit.slice(0, INITIAL_CONVERSATION_DISPLAY_LIMIT);
  }, [filteredSortedConversations, isSearching, isConversationListExpanded]);

  // 新增：根据展开状态决定实际渲染的应用列表
  const appsToRender = useMemo(() => {
      if (isAppListExpanded) {
          return dynamicApplications; // 展开时显示全部
      }
      // 收起时只显示前 N 个
      return dynamicApplications.slice(0, INITIAL_APP_DISPLAY_LIMIT); 
  }, [dynamicApplications, isAppListExpanded]);

  return (
    <div
      id="mobile-sidebar-container"
      ref={sidebarRef}
      {...(isMobile && isOpen ? bind() : {})}
      className={`fixed top-0 flex h-full w-[${SIDEBAR_WIDTH}px] max-w-[85vw] flex-col border-r border-gray-200 bg-[#f5f5f5] dark:border-gray-800 dark:bg-[#202123] left-0 sm:left-[60px] touch-pan-y ${
        isOpen 
          ? 'translate-x-0' 
          : '-translate-x-full'
      } ${
        isDraggingSidebar ? '' : 'transition-transform duration-300 ease-in-out'
      }`}
      onClick={stopPropagation}
      style={{
        zIndex: isMobile ? 9999 : 40,
        transform: isMobile && isDraggingSidebar ? `translateX(${translateX}px)` : (isOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_WIDTH}px)`),
      }}
    >
      <div className="sticky top-0 z-10 bg-[#f5f5f5] dark:bg-[#202123] flex-shrink-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <button 
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 sm:hidden"
              onClick={onToggle}
            >
              <IconX size={18} />
            </button>
          </div>
        </div>
        
        <div className="px-4 mb-4">
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-full transition-colors duration-200 text-gray-700 dark:text-gray-200"
            onClick={handleCreateNewChat}
          >
            <IconMessagePlus size={16} />
            <span>发起新对话</span>
          </button>
        </div>
      </div>

      <div className="flex-grow min-h-0 overflow-y-auto">
        <div className="px-4 pb-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            校园应用
          </div>
          <div className={`duration-300 ease-in-out`}> 
            <div className="space-y-2">
              {appsToRender.map((app) => (
                <button
                  key={app.id}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 group ${
                    activeAppId === app.id && !selectedConversation 
                      ? 'bg-gray-200 dark:bg-gray-700 font-medium'
                      : ''
                  }`}
                  onClick={() => handleAppClick(app.id)}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${app.color} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    {app.icon}
                  </div>
                  <span className={`text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200 group-hover:text-gray-900 dark:group-hover:text-white ${
                    activeAppId === app.id && !selectedConversation ? 'text-gray-900 dark:text-white' : ''
                  }`}>{app.name}</span>
                </button>
              ))}
              {dynamicApplications.length === 0 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                  无可用应用
                </div>
              )}
            </div>
          </div>

          {dynamicApplications.length > INITIAL_APP_DISPLAY_LIMIT && (
            <button 
              onClick={() => setIsAppListExpanded(!isAppListExpanded)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-all duration-200 mt-1`}
            >
              {isAppListExpanded ? (
                 <>
                   <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      <IconChevronUp size={18} className="text-gray-500 dark:text-gray-400" />
                   </div>
                   <span className="truncate">
                     收起
                   </span>
                 </>
              ) : (
                 <>
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                       <IconChevronDown size={18} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="truncate">
                      更多
                    </span>
                 </>
              )}
            </button>
          )}
        </div>

        <div className="mx-4 border-t border-gray-200 dark:border-gray-700 my-2"></div>

        <div className="px-4 pb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            近期对话
          </div>
        </div>

        <div className="px-4 pb-4">
          {hasNoResults ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-2">
              未找到相关聊天
            </div>
          ) : (
            <div className="space-y-1">
              {conversationsToRender.map((conversation) => (
                <ConversationComponent
                  key={conversation.id}
                  conversation={conversation}
                  activeAppId={activeAppId}
                  appConfigs={appConfigs as any}
                  isModalPotentiallyOpen={modalOpenConversationId === conversation.id}
                  onSetModalOpen={handleSetModalOpen}
                />
              ))}
            </div>
          )}

          {conversations.length > INITIAL_CONVERSATION_DISPLAY_LIMIT && !isSearching && (
            <button
              onClick={() => setIsConversationListExpanded(!isConversationListExpanded)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-all duration-200 mt-1`}
            >
              {isConversationListExpanded ? (
                <>
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    <IconChevronUp size={18} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="truncate">
                    收起
                  </span>
                </>
              ) : (
                <>
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    <IconChevronDown size={18} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="truncate">
                    显示全部 {conversations.length} 条
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};