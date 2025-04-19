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
import { useDrag } from '@use-gesture/react';

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
  modalOpen: boolean;
  onSetModalOpen: (conversationId: string | null) => void;
}

// 可排序对话组件
const SortableConversation: FC<SortableConversationProps> = ({ conversation, activeAppId, appConfigs, isDragging, modalOpen, onSetModalOpen }) => {
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
      {...(!modalOpen ? listeners : {})}
    >
      <div className="flex w-full overflow-hidden">
        <div className="flex-grow truncate">
          <ConversationComponent 
            key={conversation.id}
            conversation={conversation}
            activeAppId={activeAppId}
            appConfigs={appConfigs}
            onSetModalOpen={onSetModalOpen} modalOpen={null}          />
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

const SIDEBAR_WIDTH = 260; // 定义侧边栏宽度常量

export const SidebarNav: FC<Props> = ({ onToggle, isOpen }) => {
  const { t } = useTranslation('sidebar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [modalOpenConversationId, setModalOpenConversationId] = useState<string | null>(null);
  
  const prevSelectedConversationRef = useRef<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null); // Ref for the sidebar itself
  
  // --- Swipe Gesture State ---
  const [translateX, setTranslateX] = useState(0); // 当前拖拽的 X 位移
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false); // 是否正在拖拽侧边栏
  // --- End Swipe Gesture State ---

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

  // 检测是否为移动设备 (使用 768 断点保持一致)
  useEffect(() => {
    const checkMobile = () => {
      // 使用 768px 作为移动端判断标准，与之前适配保持一致
      setIsMobile(window.innerWidth < 768); 
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
     handleSelectOrStartAppConversation(appId); // Call the context function
     // Mobile toggle logic
     if (isMobile) {
       setTimeout(() => {
         onToggle();
       }, 100);
     }
  };
  // --- End New Handler ---

  // 新增：处理来自 ConversationComponent 的回调
  const handleSetModalOpen = (conversationId: string | null) => {
    setModalOpenConversationId(conversationId);
  };

  // --- Swipe Gesture Logic --- 
  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx], cancel, last }) => {
      setIsDraggingSidebar(down); // 更新拖拽状态
      
      // 如果向右滑动，则取消手势 (我们只关心向左滑关闭)
      if (dx > 0) {
        if(cancel) cancel();
        // 如果不是最后一次事件 (手指还在屏幕上)，则将位移重置为0
        if (!last) setTranslateX(0);
        return;
      } 
      
      // 实时更新 X 位移，限制在 [-SIDEBAR_WIDTH, 0] 范围内
      // 使用 Math.max 确保不会向右滑超过0，Math.min 确保不会向左滑超过负宽度
      let newTranslateX = Math.min(0, Math.max(-SIDEBAR_WIDTH, mx));
      setTranslateX(newTranslateX);

      // 手指/鼠标抬起时判断
      if (last) {
        // 计算关闭阈值
        const closeThreshold = SIDEBAR_WIDTH / 3; // 滑动超过 1/3 宽度则关闭
        const velocityThreshold = 0.5; // 或者速度足够快也关闭

        // 判断是否应该关闭：向左滑动超过阈值，或者向左滑动速度足够快
        if ((Math.abs(mx) > closeThreshold || Math.abs(vx) > velocityThreshold) && dx < 0) {
          console.log("Swipe close triggered");
          onToggle(); // 调用父组件的关闭函数
        } 
        // 否则，弹回打开状态 (动画将在 style 中通过 transition 实现)
        setTranslateX(0);
      }
    },
    {
      axis: 'x', // 只关心水平轴
      enabled: isMobile && isOpen, // 只在移动端且侧边栏打开时启用
      filterTaps: true, // 忽略点击
      // bounds: { left: -SIDEBAR_WIDTH, right: 0 }, // 使用 clamp 手动处理边界更灵活
      // rubberband: 0.1, // 轻微的橡皮筋效果
      pointer: { touch: true }, // 确保在触摸设备上工作
    }
  );
  // --- End Swipe Gesture Logic ---

  return (
    <div 
      id="mobile-sidebar-container"
      ref={sidebarRef} // 添加 ref
      {...(isMobile && isOpen ? bind() : {})} // 在移动端且打开时绑定手势
      className={`fixed top-0 flex h-full w-[${SIDEBAR_WIDTH}px] max-w-[85vw] flex-col border-r border-gray-200 bg-[#f5f5f5] dark:border-gray-800 dark:bg-[#202123] left-0 sm:left-[60px] touch-pan-y ${ // 添加 touch-pan-y 允许垂直滚动
        isOpen 
          ? 'translate-x-0' 
          : '-translate-x-full'
      } ${
        // 拖拽时禁用 transition，结束时或状态改变时启用
        isDraggingSidebar ? '' : 'transition-transform duration-300 ease-in-out'
      }`}
      onClick={stopPropagation}
      style={{
        zIndex: isMobile ? 9999 : 40,
        // 应用实时位移，但只在移动端拖拽时生效
        transform: isMobile && isDraggingSidebar ? `translateX(${translateX}px)` : (isOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_WIDTH}px)`),
      }}
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
                      modalOpen={modalOpenConversationId === conversation.id}
                      onSetModalOpen={handleSetModalOpen}
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
                        onSetModalOpen={() => { } } modalOpen={null}                    />
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