import { IconMessagePlus, IconSearch, IconX, IconBrandChrome, IconSchool, IconBook, IconCode, IconBrain, IconRobot, IconBook2, IconUsers, IconGripVertical } from '@tabler/icons-react';
import { FC, useContext, useEffect, useState, useRef, CSSProperties } from 'react';
import { useTranslation } from 'next-i18next';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

import HomeContext from '@/pages/api/home/home.context';
import { Conversation } from '@/types/chat';
import { ConversationComponent } from './components/Conversation';
import Link from 'next/link';
import { saveConversations } from '@/utils/app/conversation';

// 可排序对话组件接口
interface SortableConversationProps {
  conversation: Conversation;
  activeAppId: number | null;
  appConfigs: Record<string, any>;
  isDragging: boolean;
}

// 可排序对话组件
const SortableConversation: FC<SortableConversationProps> = ({ conversation, activeAppId, appConfigs, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({id: conversation.id});
  
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : 'auto'
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative group cursor-grab active:cursor-grabbing" 
      data-id={conversation.id}
      {...attributes}
      {...listeners}
    >
      <div className="flex w-full overflow-hidden">
        <div className="flex-grow truncate">
          <ConversationComponent 
            key={conversation.id} 
            conversation={conversation} 
            activeAppId={activeAppId} 
            appConfigs={appConfigs}
          />
        </div>
      </div>
      
      {/* 辅助定位线 */}
      <div className="drag-indicator hidden absolute left-0 right-0 -top-1 h-[1px] bg-gray-500 dark:bg-gray-400 rounded-full" />
      <div className="drag-indicator hidden absolute left-0 right-0 -bottom-1 h-[1px] bg-gray-500 dark:bg-gray-400 rounded-full" />
    </div>
  );
};

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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const prevSelectedConversationRef = useRef<string | null>(null);

  const {
    state: { conversations, selectedConversation, activeAppId },
    handleNewConversation,
    handleSelectConversation,
    handleSelectOrStartAppConversation,
    appConfigs,
    dispatch,
  } = useContext(HomeContext);
  
  // 设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 检测是否为移动设备
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
  
  // 处理拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    
    // 添加全局拖拽状态类
    document.body.classList.add('dragging-conversation');
  };
  
  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    // 移除全局拖拽状态类
    document.body.classList.remove('dragging-conversation');
    
    if (over && active.id !== over.id) {
      // 找到拖拽项和目标项在数组中的索引
      const oldIndex = conversations.findIndex(conv => conv.id === active.id);
      const newIndex = conversations.findIndex(conv => conv.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // 重新排序对话列表
        const reorderedConversations = arrayMove(conversations, oldIndex, newIndex);
        
        // 更新Context和持久化存储
        dispatch({ field: 'conversations', value: reorderedConversations });
        saveConversations(reorderedConversations);
      }
    }
    
    // 隐藏所有指示器
    const indicators = document.querySelectorAll('.drag-indicator');
    indicators.forEach(ind => ind.classList.add('hidden'));
  };
  
  // 处理拖拽过程中
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // 获取所有指示器
      const indicators = document.querySelectorAll('.drag-indicator');
      indicators.forEach(ind => ind.classList.add('hidden'));
      
      // 获取拖拽方向
      const activeRect = document.querySelector(`[data-id="${active.id}"]`)?.getBoundingClientRect();
      const overRect = document.querySelector(`[data-id="${over.id}"]`)?.getBoundingClientRect();
      
      if (activeRect && overRect) {
        const isMovingDown = activeRect.top < overRect.top;
        
        // 显示当前悬停项的相应指示器
        const overElement = document.querySelector(`[data-id="${over.id}"]`);
        if (overElement) {
          const indicator = isMovingDown 
            ? overElement.querySelector('.drag-indicator:last-child')
            : overElement.querySelector('.drag-indicator:first-child');
            
          if (indicator) {
            indicator.classList.remove('hidden');
          }
        }
      }
    }
  };

  // 应用列表数据
  const applications = [
    { id: 1, name: 'DeepSeek', icon: <IconCode size={20} />, color: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: 2, name: '课程助手', icon: <IconBook2 size={20} />, color: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { id: 3, name: '校园助理', icon: <IconRobot size={20} />, color: 'bg-green-100 dark:bg-green-900/30' },
    { id: 4, name: '教师助手', icon: <IconUsers size={20} />, color: 'bg-purple-100 dark:bg-purple-900/30' },
  ];

  // --- New simplified click handler --- 
  const handleAppClick = (appId: number) => {
     console.log("SidebarNav: App button clicked, calling handleSelectOrStartAppConversation with appId:", appId); 
     handleSelectOrStartAppConversation(appId); // Call the context function
     // Mobile toggle logic
     if (isMobile) {
       setTimeout(() => {
         onToggle();
       }, 100);
     }
  };
  // --- End New Handler ---

  return (
    <div 
      id="mobile-sidebar-container"
      className={`fixed top-0 flex h-full w-[260px] max-w-[85vw] flex-col border-r border-gray-200 bg-[#f5f5f5] transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-[#202123] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } left-0 sm:left-[60px]`}
      onClick={stopPropagation}
      style={{ zIndex: isMobile ? 9999 : 40 }}
    >
      {/* 顶部区域 */}
      <div className="sticky top-0 z-10 bg-[#f5f5f5] dark:bg-[#202123]">
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
        
        {/* 新建聊天按钮 */}
        <div className="px-4 mb-4">
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-full transition-colors duration-200 text-gray-700 dark:text-gray-200"
            onClick={handleCreateNewChat}
          >
            <IconMessagePlus size={16} />
            <span>发起新对话</span>
          </button>
        </div>

        {/* 近期对话标题 */}
        <div className="px-4 pb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            近期对话
          </div>
        </div>
      </div>

      {/* 聊天记录区域 - 使用DndKit包装 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4">
          {hasNoResults ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-2">
              未找到相关聊天
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            >
              <SortableContext
                items={displayedConversations.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {displayedConversations.map((conversation) => (
                    <SortableConversation
                      key={conversation.id}
                      conversation={conversation}
                      activeAppId={activeAppId}
                      appConfigs={appConfigs}
                      isDragging={conversation.id === activeDragId}
                    />
                  ))}
                </div>
              </SortableContext>
              
              {/* 拖拽叠加层 - 可选，但会增强用户体验 */}
              <DragOverlay>
                {activeDragId ? (
                  <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 w-[230px]">
                    <ConversationComponent
                      conversation={conversations.find(c => c.id === activeDragId)!}
                      activeAppId={activeAppId}
                      appConfigs={appConfigs}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* 分割线 */}
      <div className="px-4 py-2">
        <div className="h-[1px] bg-gray-200 dark:bg-gray-700"></div>
      </div>

      {/* 应用区域 */}
      <div className="flex-shrink-0 px-4 py-2">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          校园应用
        </div>
        <div className="space-y-2">
          {applications.map((app) => (
            <button
              key={app.id}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 group ${
                activeAppId === app.id 
                  ? 'bg-gray-200 dark:bg-gray-700 font-medium'
                  : ''
              }`}
              onClick={() => handleAppClick(app.id)}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${app.color} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                {app.icon}
              </div>
              <span className={`text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200 group-hover:text-gray-900 dark:group-hover:text-white ${
                activeAppId === app.id ? 'text-gray-900 dark:text-white' : ''
              }`}>{app.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};