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
import { DifyClient } from '@/services/dify/client';
import { getApiKey } from '@/utils/app/api';

// --- 定义 AppConfig 接口 (与 home.tsx/home.context.tsx 一致) ---
interface AppConfig {
  id: number;
  name: string;
  apiKey: string;
  apiUrl?: string;
}
// --- END 定义 ---

interface Props {
  conversation: Conversation;
  activeAppId: number | null; // <-- 接收 activeAppId
  appConfigs: Record<number, AppConfig>; // <-- 接收 appConfigs
  modalOpen?: boolean; // <-- 新增：接收模态框状态 (可选)
  onSetModalOpen: (conversationId: string | null) => void; // 新增：传递设置模态框打开状态的回调
}

// 单个会话的删除、重命名等操作
export const ConversationComponent = ({ conversation, activeAppId, appConfigs, modalOpen, onSetModalOpen }: Props) => {
  const {
    state: { selectedConversation, messageIsStreaming }, // 不再需要 lightMode?
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

  // 监听 conversation.name 的变化
  useEffect(() => {
    setRenameValue(conversation.name);
  }, [conversation.name]);

  // 监听模态框状态变化，并通知父组件
  useEffect(() => {
    if (showRenameModal || showDeleteModal) {
      onSetModalOpen(conversation.id);
    } else {
      // 如果当前打开的模态框是这个对话的，则在关闭时通知父组件清除状态
      // 需要一种方式访问 SidebarNav 的 modalOpenConversationId，或者让父组件自己处理
      // 暂时先只通知打开
      // onSetModalOpen(null); // 这行逻辑需要在父组件处理
    }
    // 依赖项中加入 onSetModalOpen 和 conversation.id 确保回调和ID正确
  }, [showRenameModal, showDeleteModal, onSetModalOpen, conversation.id]);

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
    onSetModalOpen(conversation.id); // 打开时立即通知
  };

  const handleDelete = () => {
    setShowMenu(false);
    setMenuPosition(null);
    setShowDeleteModal(true);
    onSetModalOpen(conversation.id); // 打开时立即通知
  };

  const handleConfirmRename = () => {
    if (renameValue.trim().length > 0) {
      // 先更新前端状态
      handleUpdateConversation(conversation, { key: 'name', value: renameValue });
      // 立即关闭对话框
      setShowRenameModal(false);
      onSetModalOpen(null); // 关闭时通知
      
      // 使用setTimeout确保UI更新完成后再进行API调用
      setTimeout(() => {
        // 如果有会话ID，异步更新到后端
        if (conversation.id && conversation.conversationID) {
          try {
            const apiKey = getApiKey();
            const client = new DifyClient();
            const user = 'unknown';
            
            // 异步调用API，不阻塞UI
            client.renameConversation(
              conversation.conversationID,
              renameValue,
              apiKey,
              user
            )
            .then(() => {
              console.log(`会话 "${conversation.id}" 名称已更新为: "${renameValue}"`);
            })
            .catch((error) => {
              console.error('后端更新会话名称失败:', error);
            });
          } catch (error) {
            console.error('调用重命名API失败:', error);
          }
        }
      }, 0);
    }
  };

  const handleConfirmDelete = () => {
    // 立即关闭模态框，并通知父组件
    setShowDeleteModal(false);
    onSetModalOpen(null); // 关闭时通知
    
    // 使用setTimeout确保UI更新完成后再进行操作
    setTimeout(() => {
      // 1. 先从前端移除（乐观UI）
      handleDeleteConversation(conversation.id);

      // 2. 再异步调用后端API删除
      if (conversation.id && conversation.conversationID) {
        try {
          const apiKey = getApiKey();
          const client = new DifyClient();
          const user = 'unknown';
          
          client.deleteConversation(
            conversation.conversationID,
            apiKey,
            user
          )
          .then((response) => {
            // 检查后端返回结果
            if (response && response.result === 'success') {
              console.log(`会话 "${conversation.conversationID}" 已在后端删除`);
            } else {
              // 如果后端删除失败，可以考虑添加错误提示或恢复UI（目前仅打印错误）
              console.error('后端删除会话失败，但前端已移除:', response);
            }
          })
          .catch((error) => {
            // 如果后端删除失败，可以考虑添加错误提示或恢复UI（目前仅打印错误）
            console.error('后端删除会话API调用失败，但前端已移除:', error);
          });
        } catch (error) {
          console.error('调用删除API准备失败:', error);
        }
      }
    }, 0);
  };

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, conversation: Conversation) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('conversation', JSON.stringify(conversation));
    }
  };

  // 使用默认图标
  const icon = <IconMessage size={18} />;

  // 检测是否为移动设备
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // --- 获取应用名称 (如果存在) --- 
  const appName = conversation.appId !== null ? appConfigs[conversation.appId]?.name : null;
  // --- END 获取 ---

  return (
    <div 
      className={`relative flex items-center group ${
        activeAppId === null && selectedConversation?.id === conversation.id && !isMobile 
          ? 'sticky top-0 z-10 bg-[#f5f5f5] dark:bg-[#202123] shadow-sm' 
          : ''
      }`}
    >
        <button
        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-sm transition-colors duration-200 hover:bg-gray-500/10 ${
            messageIsStreaming ? 'disabled:cursor-not-allowed' : ''
          } ${
            activeAppId === null && selectedConversation?.id === conversation.id
            ? 'bg-gray-500/20'
              : ''
          }`}
          onClick={() => handleSelectConversation(conversation)}
          disabled={messageIsStreaming}
          draggable="true"
          onDragStart={(e) => handleDragStart(e, conversation)}
        >
          {icon}
        <div className="relative flex-1 overflow-hidden text-left text-[13px] leading-5 py-0.5 flex items-center min-w-0">
          <span className="block overflow-hidden whitespace-nowrap text-ellipsis">{conversation.name}</span>
          {appName && (
            <span className="ml-1.5 inline-block whitespace-nowrap rounded bg-blue-100 px-1.5 py-0.5 text-center align-baseline text-[10px] font-bold uppercase leading-none text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {appName} 
            </span>
          )}
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
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                onClick={() => { setShowRenameModal(false); onSetModalOpen(null); }}
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
                onClick={() => { setShowDeleteModal(false); onSetModalOpen(null); }}
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
