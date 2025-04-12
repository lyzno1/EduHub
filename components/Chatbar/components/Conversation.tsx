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

  // 图标变量
  let icon;
  switch (conversation.name) {
    case '信息网络问答':
      icon = <FontAwesomeIcon icon={faChalkboardUser} style={{ height: '16px', width: '16px' }}/>;
      break;
    case '财务问答':
      icon = <FontAwesomeIcon icon={faUser} style={{ height: '16px', width: '16px' }}/>;
      break;
    case '教务问答':
      icon = <FontAwesomeIcon icon={faFileLines} style={{ height: '16px', width: '16px' }}/>;
      break;
    case '开源软件开发技术':
      icon = <FontAwesomeIcon icon={faServer} style={{ height: '16px', width: '16px' }}/>;
      break;
    default:
      icon = <IconMessage size={18} />;
  }

  return (
    <div className="relative flex items-center group">
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
        <div
          className={`relative max-h-5 flex-1 overflow-hidden text-ellipsis whitespace-nowrap break-all text-left text-[12.5px] leading-3 ${
            selectedConversation?.id === conversation.id ? 'pr-12' : 'pr-1'
          }`}
        >
          {conversation.name}
        </div>
      </button>

      <div 
        ref={buttonRef}
        className={`absolute right-2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200`}
      >
        <SidebarActionButton 
          handleClick={handleMenuClick}
          className={`${lightMode ? "text-black hover:text-black/70" : "text-neutral-200 hover:text-neutral-100"} hover:bg-gradient-to-r from-gray-500/20 to-gray-500/10 rounded-full p-1.5 transition-all duration-200`}
        >
          <IconDotsVertical size={16} />
        </SidebarActionButton>

        {showMenu && menuPosition && createPortal(
          <div 
            ref={menuRef}
            className="fixed z-[9999] w-48"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
            <div className="rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                <button
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={handleRename}
                >
                  <IconPencil size={16} className="mr-2" />
                  重命名
                </button>
                <button
                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={handleDelete}
                >
                  <IconTrash size={16} className="mr-2" />
                  删除
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {showRenameModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-[320px] rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">重命名对话</h3>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                onClick={() => setShowRenameModal(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                onClick={handleConfirmRename}
              >
                确认
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-[320px] rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">确认删除</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">确定要删除这个对话吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                onClick={() => setShowDeleteModal(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
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
