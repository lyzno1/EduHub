import {
  IconCheck,
  IconMessage,
  IconPencil,
  IconTrash,
  IconX,
  IconDotsVertical,
} from '@tabler/icons-react';
import {
  DragEvent,
  KeyboardEvent,
  MouseEventHandler,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

import { IconBook, IconCode } from '@tabler/icons-react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChalkboardUser,faUser,faGlobe,faFileLines,faSquareRootVariable,faServer } from '@fortawesome/free-solid-svg-icons';

import { Conversation } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import SidebarActionButton from '@/components/Buttons/SidebarActionButton';

interface Props {
  conversation: Conversation;
}

// 单个会话的删除、重命名等操作
export const ConversationComponent = ({ conversation }: Props) => {
  const {
    state: { selectedConversation, messageIsStreaming, lightMode },
    handleSelectConversation,
    handleDeleteConversation,
    handleUpdateConversation,
  } = useContext(HomeContext);

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showMenu) {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPosition({
          top: rect.top + window.scrollY,
          left: rect.right + window.scrollX + 8
        });
      }
    }
    setShowMenu(!showMenu);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRename = () => {
    setShowMenu(false);
    setMenuPosition(null);
    setShowRenameModal(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    setMenuPosition(null);
    setShowDeleteModal(true);
  };

  const handleConfirmRename = () => {
    if (renameValue.trim().length > 0) {
      handleUpdateConversation(conversation, { key: 'name', value: renameValue });
      setShowRenameModal(false);
    }
  };

  const handleConfirmDelete = () => {
    handleDeleteConversation(conversation.id);
    setShowDeleteModal(false);
  };

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, conversation: Conversation) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('conversation', JSON.stringify(conversation));
    }
  };

  // 使用默认图标
  const icon = <IconMessage size={18} />;

  // 检测是否为移动设备
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div 
      className={`relative flex items-center group ${
        selectedConversation?.id === conversation.id && !isMobile 
          ? 'sticky top-0 z-10 bg-[#f5f5f5] dark:bg-[#202123] shadow-sm' 
          : ''
      }`}
    >
      <button
        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-sm transition-colors duration-200 hover:bg-gray-500/10 ${
          messageIsStreaming ? 'disabled:cursor-not-allowed' : ''
        } ${
          selectedConversation?.id === conversation.id
            ? 'bg-gray-500/20'
            : ''
        }`}
        onClick={() => handleSelectConversation(conversation)}
        disabled={messageIsStreaming}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, conversation)}
      >
        {icon}
        <div className="relative flex-1 overflow-hidden whitespace-nowrap text-left text-[13px] leading-3">
          {conversation.name}
        </div>
      </button>

      {/* 操作按钮 */}
      <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div ref={buttonRef} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
          <IconDotsVertical size={16} className="text-gray-500 dark:text-gray-400" onClick={handleMenuClick} />
        </div>
      </div>

      {/* 下拉菜单 */}
      {showMenu && menuPosition && createPortal(
        <div 
          ref={menuRef}
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 min-w-[120px] z-50"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button 
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={handleRename}
          >
            <IconPencil size={16} />
            <span>重命名</span>
          </button>
          <button 
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={handleDelete}
          >
            <IconTrash size={16} />
            <span>删除</span>
          </button>
        </div>,
        document.body
      )}

      {/* 重命名模态框 */}
      {showRenameModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-[300px]">
            <div className="text-lg font-medium mb-4">重命名对话</div>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  handleConfirmRename();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                onClick={() => setShowRenameModal(false)}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded-md bg-blue-500 text-white"
                onClick={handleConfirmRename}
              >
                确认
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-[300px]">
            <div className="text-lg font-medium mb-4">删除对话</div>
            <div className="text-gray-600 dark:text-gray-400 mb-4">
              确定要删除这个对话吗？此操作无法撤销。
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                onClick={() => setShowDeleteModal(false)}
              >
                取消
              </button>
              <button
                className="px-3 py-1 rounded-md bg-red-500 text-white"
                onClick={handleConfirmDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
