import { IconMessagePlus, IconSearch, IconX, IconBrandChrome, IconSchool, IconBook, IconCode, IconBrain, IconRobot, IconBook2, IconUsers, IconGripVertical, IconMenu2 } from '@tabler/icons-react';
import { FC, useContext, useEffect, useState, useRef, CSSProperties, useMemo } from 'react';
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
import { AppConfig } from '@/pages/api/home/home';

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

export const SidebarNav: FC<Props> = ({ onToggle, isOpen }) => {
  const { t } = useTranslation('sidebar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [modalOpenConversationId, setModalOpenConversationId] = useState<string | null>(null);
  const prevSelectedConversationRef = useRef<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  const {
    state,
    dispatch,
    handleNewConversation,
    handleSelectConversation,
    handleSelectOrStartAppConversation,
    appConfigs,
  } = useContext(HomeContext);
  const { conversations, selectedConversation, activeAppId } = state;

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
  
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    
    document.body.classList.add('dragging-conversation');
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    document.body.classList.remove('dragging-conversation');
    
    if (over && active.id !== over.id) {
      const oldIndex = conversations.findIndex(conv => conv.id === active.id);
      const newIndex = conversations.findIndex(conv => conv.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedConversations = arrayMove(conversations, oldIndex, newIndex);
        
        dispatch({ field: 'conversations', value: reorderedConversations });
        saveConversations(reorderedConversations);
      }
    }
    
    const indicators = document.querySelectorAll('.drag-indicator');
    indicators.forEach(ind => ind.classList.add('hidden'));
  };
  
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const indicators = document.querySelectorAll('.drag-indicator');
      indicators.forEach(ind => ind.classList.add('hidden'));
      
      const activeRect = document.querySelector(`[data-id="${active.id}"]`)?.getBoundingClientRect();
      const overRect = document.querySelector(`[data-id="${over.id}"]`)?.getBoundingClientRect();
      
      if (activeRect && overRect) {
        const isMovingDown = activeRect.top < overRect.top;
        
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

  const dynamicApplications = useMemo(() => {
    if (!appConfigs || typeof appConfigs !== 'object') {
        console.warn("[SidebarNav] appConfigs provided by context is not a valid object:", appConfigs);
        return [];
    }
    
    const allAppConfigsArray = Object.values(appConfigs);
    
    return allAppConfigsArray.map((config: AppConfig, index: number) => {
      const bgColor = sidebarBgColorCycle[index % sidebarBgColorCycle.length];
      
      return {
        ...config,
        color: bgColor,
      };
    });
  }, [appConfigs]);

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
        
        <div className="px-4 mb-4">
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-full transition-colors duration-200 text-gray-700 dark:text-gray-200"
            onClick={handleCreateNewChat}
          >
            <IconMessagePlus size={16} />
            <span>发起新对话</span>
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            近期对话
          </div>
        </div>
      </div>

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
                      appConfigs={appConfigs as any}
                      isDragging={conversation.id === activeDragId}
                      modalOpen={modalOpenConversationId === conversation.id}
                      onSetModalOpen={handleSetModalOpen}
                    />
                  ))}
                </div>
              </SortableContext>
              
              <DragOverlay>
                {activeDragId ? (
                  <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 w-[230px]">
                    <ConversationComponent
                        conversation={conversations.find((c: Conversation) => c.id === activeDragId)!}
                        activeAppId={activeAppId}
                        appConfigs={appConfigs as any}
                        onSetModalOpen={() => { } } modalOpen={null}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="h-[1px] bg-gray-200 dark:bg-gray-700"></div>
      </div>

      <div className="flex-shrink-0 px-4 py-2">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          校园应用
        </div>
        <div className="space-y-2">
          {dynamicApplications.map((app) => (
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