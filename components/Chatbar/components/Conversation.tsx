import {
  IconCheck,
  IconMessage,
  IconPencil,
  IconTrash,
  IconX,
  IconDotsVertical,
  IconPin,
  IconPinnedOff,
} from '@tabler/icons-react';
import {
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
import { DifyAppCardConfig } from '@/types/dify';
import HomeContext from '@/pages/api/home/home.context';
import difyConfigService from '@/services/difyConfigService';
import { DifyClient } from '@/services/dify/client';
import { getApiKey } from '@/utils/app/api';

// --- AppConfig Interface (Ensure apiUrl is optional) ---
interface AppConfig {
  id: number;
  name: string;
  apiKey: string;
  apiUrl?: string; // <-- Ensure apiUrl exists and is optional
}
// --- END Definition ---

// 定义 ModalType
type ModalType = 'rename' | 'delete';

interface Props {
  conversation: Conversation;
  activeAppId: number | null;
  appConfigs: Record<number, AppConfig>; // 确保 appConfigs 是 Record 类型
  isModalPotentiallyOpen: boolean;
  onSetModalOpen: (modalOpen: ModalType | null) => void;
}

// 单个会话的删除、重命名等操作
export const ConversationComponent = ({ conversation, activeAppId, appConfigs, isModalPotentiallyOpen, onSetModalOpen }: Props) => {
  const {
    state: { selectedConversation, messageIsStreaming }, // 不再需要 lightMode?
    handleSelectConversation,
    handleDeleteConversation,
    handleUpdateConversation,
    handleTogglePinConversation,
  } = useContext(HomeContext);

  // --- State Management ---
  const [showMenu, setShowMenu] = useState(false); // For desktop popover
  const [showMobileBottomSheet, setShowMobileBottomSheet] = useState(false); // For mobile bottom sheet
  const [isClosingBottomSheet, setIsClosingBottomSheet] = useState(false); // <-- 新增关闭状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.name);
  const menuRef = useRef<HTMLDivElement>(null); // Ref for desktop menu & mobile sheet content
  const buttonRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  
  // 检测是否为移动设备
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // 监听 conversation.name 的变化
  useEffect(() => {
    setRenameValue(conversation.name);
  }, [conversation.name]);

  // 监听模态框状态变化，并通知父组件
  useEffect(() => {
    if (showRenameModal) {
      onSetModalOpen('rename' as ModalType); // 使用类型断言
    } else if (showDeleteModal) {
      onSetModalOpen('delete' as ModalType); // 使用类型断言
    } else {
      // 如果当前打开的模态框是这个对话的，则在关闭时通知父组件清除状态
      onSetModalOpen(null);
    }
    // 依赖项中加入 onSetModalOpen 和 conversation.id 确保回调和ID正确
  }, [showRenameModal, showDeleteModal, onSetModalOpen, conversation.id]);

  // --- Event Handlers ---
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Keep stopping propagation for click
    if (isMobile) {
      // 移动端：打开底部操作表
      setShowMobileBottomSheet(true);
      // 移动端不需要计算 menuPosition 或显示 showMenu
      setShowMenu(false);
      setMenuPosition(null);
    } else {
      // 桌面端：计算位置并显示浮动菜单
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
      // 桌面端不需要显示底部操作表
      setShowMobileBottomSheet(false);
    }
  };

  // Add handler for pinning/unpinning
  const handleTogglePin = () => {
    handleTogglePinConversation(conversation.id);
    // Close menus immediately after action
    setShowMenu(false); 
    triggerCloseMobileSheet(); 
  };

  // 开始关闭动画 (替代直接关闭)
  const triggerCloseMobileSheet = () => {
    if (showMobileBottomSheet) {
      setIsClosingBottomSheet(true);
    }
  };

  // 监听关闭状态，在动画结束后卸载组件
  useEffect(() => {
    if (isClosingBottomSheet) {
      const timer = setTimeout(() => {
        setShowMobileBottomSheet(false); // 动画结束后隐藏
        setIsClosingBottomSheet(false); // 重置状态
      }, 300); // 匹配动画时长 (0.3s)
      return () => clearTimeout(timer);
    }
  }, [isClosingBottomSheet]);

  // 打开重命名模态框 - 调用 triggerCloseMobileSheet
  const handleRename = () => {
    triggerCloseMobileSheet(); // 开始关闭动画
    setShowMenu(false); 
    setMenuPosition(null);
    // 延迟打开模态框，等待关闭动画
    setTimeout(() => {
        setShowRenameModal(true);
        // 不需要在这里调用 onSetModalOpen，因为 useEffect 会处理
    }, 50); // 短暂延迟
  };

  // 打开删除模态框 - 调用 triggerCloseMobileSheet
  const handleDelete = () => {
    triggerCloseMobileSheet(); // 开始关闭动画
    setShowMenu(false); 
    setMenuPosition(null);
    // 延迟打开模态框
    setTimeout(() => {
        setShowDeleteModal(true);
        // 不需要在这里调用 onSetModalOpen，因为 useEffect 会处理
    }, 50);
  };
  
  const handleConfirmRename = () => {
    if (renameValue.trim().length > 0) {
      // 先更新前端状态
      handleUpdateConversation(conversation, { key: 'name', value: renameValue });
      setShowRenameModal(false);
      // onSetModalOpen is handled by useEffect

      setTimeout(() => {
        if (conversation.id && conversation.conversationID) {
          try {
            let apiKeyToUse: string | undefined;
            let apiUrlToUse: string | undefined; // <-- Declare apiUrlToUse

            // Determine API Key and API URL
            if (
              conversation.appId !== null &&
              typeof conversation.appId === 'number' &&
              appConfigs &&
              conversation.appId in appConfigs
            ) {
              const appConfig = appConfigs[conversation.appId];
              apiKeyToUse = appConfig.apiKey;
              apiUrlToUse = appConfig.apiUrl || undefined; // <-- Get app's apiUrl, convert null to undefined
              console.log(`重命名: 使用 App ID ${conversation.appId} 的配置 - API Key: ${apiKeyToUse ? 'Yes' : 'No'}, API URL: ${apiUrlToUse || '未提供'}`);
              // Fallback to global URL if app's apiUrl is not defined
               if (!apiUrlToUse) {
                   console.warn(`App ID ${conversation.appId} 的配置中缺少 apiUrl，将使用全局 apiUrl`);
                   apiUrlToUse = difyConfigService.getGlobalApiUrl() || undefined; // Convert null to undefined
               }
            } else {
              // Global conversation or app config not found
              // --- 修改：获取默认全局模型的 API Key ---
              const defaultGlobalModel = difyConfigService.getDefaultGlobalModel();
              if (defaultGlobalModel) {
                  apiKeyToUse = defaultGlobalModel.apiKey;
              } else {
                  console.error("未找到默认的全局模型配置！");
                  apiKeyToUse = undefined; // 确保是 undefined
              }
              // --- 修改结束 ---

              apiUrlToUse = difyConfigService.getGlobalApiUrl() || undefined; // <--- Get global URL, convert null to undefined
              console.log(`重命名: 使用全局配置 - API Key: ${apiKeyToUse ? 'Yes' : 'No'}, API URL: ${apiUrlToUse || '未找到'}`);
            }

            // Check if config was successfully obtained
            if (!apiKeyToUse || !apiUrlToUse) {
              console.error('无法确定有效的 API Key 或 API URL 进行重命名');
              return;
            }

            // --- Modify: Pass apiUrl when creating the Client ---
            const client = new DifyClient({ apiUrl: apiUrlToUse });
            // --- End modification ---

            const user = 'unknown';

            client.renameConversation(
              conversation.conversationID,
              renameValue,
              apiKeyToUse, // 使用动态确定的 API Key
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
    setShowDeleteModal(false);
    // onSetModalOpen is handled by useEffect

    setTimeout(() => {
      handleDeleteConversation(conversation.id); // Optimistic UI update

      if (conversation.id && conversation.conversationID) {
        try {
          let apiKeyToUse: string | undefined;
          let apiUrlToUse: string | undefined; // <-- Declare apiUrlToUse

          // Determine API Key and API URL
          if (
            conversation.appId !== null &&
            typeof conversation.appId === 'number' &&
            appConfigs &&
            conversation.appId in appConfigs
          ) {
            const appConfig = appConfigs[conversation.appId];
            apiKeyToUse = appConfig.apiKey;
            apiUrlToUse = appConfig.apiUrl || undefined; // <-- Get app's apiUrl, convert null to undefined
            console.log(`删除: 使用 App ID ${conversation.appId} 的配置 - API Key: ${apiKeyToUse ? 'Yes' : 'No'}, API URL: ${apiUrlToUse || '未提供'}`);

            // Fallback to global URL if app's apiUrl is not defined
            if (!apiUrlToUse) {
                console.warn(`App ID ${conversation.appId} 的配置中缺少 apiUrl，将使用全局 apiUrl`);
                apiUrlToUse = difyConfigService.getGlobalApiUrl() || undefined; // Convert null to undefined
            }

          } else {
            // Global conversation or app config not found
            // --- 修改：获取默认全局模型的 API Key ---
            const defaultGlobalModel = difyConfigService.getDefaultGlobalModel();
            if (defaultGlobalModel) {
                apiKeyToUse = defaultGlobalModel.apiKey;
            } else {
                console.error("未找到默认的全局模型配置！");
                apiKeyToUse = undefined; // 确保是 undefined
            }
            // --- 修改结束 ---

            apiUrlToUse = difyConfigService.getGlobalApiUrl() || undefined; // <--- Get global URL, convert null to undefined
            console.log(`删除: 使用全局配置 - API Key: ${apiKeyToUse ? 'Yes' : 'No'}, API URL: ${apiUrlToUse || '未找到'}`);
          }

          // Check if config was successfully obtained
          if (!apiKeyToUse || !apiUrlToUse) {
            console.error('无法确定有效的 API Key 或 API URL 进行删除');
            // Consider reverting the optimistic UI update here
            return;
          }

          // --- Modify: Pass apiUrl when creating the Client ---
          const client = new DifyClient({ apiUrl: apiUrlToUse });
          // --- End modification ---

          const user = 'unknown';

          client.deleteConversation(
            conversation.conversationID,
            apiKeyToUse, // 使用动态确定的 API Key
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
            // 考虑恢复前端状态
          });
        } catch (error) {
          console.error('调用删除API准备失败:', error);
          // 考虑恢复前端状态
        }
      }
    }, 0);
  };

  // 使用默认图标
  const icon = <IconMessage size={18} />;

  // --- 修改：计算标题和 Tag --- 
  let displayName = conversation.name; 
  let indicatorText: string | null = null; 

  if (
    conversation.appId !== null &&
    typeof conversation.appId === 'number' &&
    appConfigs &&                       
    conversation.appId in appConfigs   
  ) {
    const currentAppConfig = appConfigs[conversation.appId]; 

    indicatorText = currentAppConfig.name;

    // Use difyConfigService to get card name if cardId exists
    if (conversation.cardId) { 
      const cardConfig = difyConfigService.getCardConfig(conversation.cardId);
      if (cardConfig && cardConfig.name) { 
        displayName = cardConfig.name; // Use name from service
      } else {
        // Fallback to app name if card config not found or name missing
        console.warn(`Card config for id ${conversation.cardId} not found or missing name. Falling back to app name.`);
        displayName = currentAppConfig.name;
      }
    } else {
      // If no cardId, use app name
      displayName = currentAppConfig.name;
    }
  } else if (conversation.appId !== null) {
    console.warn(`App config for appId ${conversation.appId} not found. Using original conversation name.`);
  }
  // --- 修改结束 ---

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
        >
          {conversation.pinned && <IconPin size={14} className="text-blue-500 flex-shrink-0" />}
          {!conversation.pinned && icon}
        <div className="relative flex-1 overflow-hidden text-left text-[13px] leading-5 py-0.5 flex items-center min-w-0">
          {/* --- 修改：使用计算好的 displayName --- */}
          <span className="block overflow-hidden whitespace-nowrap text-ellipsis">{displayName}</span>
          {/* --- 修改结束 --- */}
          {/* --- 修改：使用计算好的 indicatorText --- */}
          {indicatorText && (
            <span className="ml-1.5 inline-block whitespace-nowrap rounded bg-blue-100 px-1.5 py-0.5 text-center align-baseline text-[10px] font-bold uppercase leading-none text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {indicatorText} 
            </span>
          )}
          {/* --- 修改结束 --- */}
        </div>
      </button>

      {/* 操作按钮 - 移动端常亮，桌面端悬停显示 */}
      <div className="absolute right-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        <div ref={buttonRef} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
          <IconDotsVertical
            size={16}
            className="text-gray-500 dark:text-gray-400"
            onClick={handleMenuClick}
          />
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
            onClick={handleTogglePin}
          >
            {conversation.pinned ? <IconPinnedOff size={16} /> : <IconPin size={16} />}
            <span>{conversation.pinned ? '取消固定' : '固定对话'}</span>
          </button>
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

      {/* 重命名模态框 - 提高 z-index 到最高 */}
      {showRenameModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010]" 
          onClick={(e) => { if (e.target === e.currentTarget) { setShowRenameModal(false); onSetModalOpen(null); } }}
        >
          {/* 模态框内容 div */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4 md:mx-0 md:w-[300px] shadow-xl animate-fadeIn" onClick={(e) => e.stopPropagation()}> 
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

      {/* 删除确认模态框 - 提高 z-index 到最高 */}
      {showDeleteModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010]" 
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteModal(false); onSetModalOpen(null); } }}
        >
          {/* 模态框内容 div */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4 md:mx-0 md:w-[300px] shadow-xl animate-fadeIn" onClick={(e) => e.stopPropagation()}> 
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

      {/* --- 移动端底部操作菜单 --- */}
      {showMobileBottomSheet && createPortal(
        <>
          {/* 背景遮罩层 - 条件动画 */}
          <div 
            className={`fixed inset-0 bg-black/60 z-[9999] ${isClosingBottomSheet ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            onClick={triggerCloseMobileSheet} // 点击遮罩开始关闭
          ></div>
          {/* 操作表内容 - 条件动画 */}
          <div 
            ref={menuRef} 
            className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-lg shadow-lg p-4 z-[10000] ${isClosingBottomSheet ? 'animate-slide-down' : 'animate-slide-up'}`}
            onClick={(e) => e.stopPropagation()} 
          >
            {/* 可选的拖动指示器 */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3"></div>
            {/* Add Pin/Unpin Button */}
            <button 
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              onClick={handleTogglePin}
            >
              {conversation.pinned ? <IconPinnedOff size={20} /> : <IconPin size={20} />}
              <span>{conversation.pinned ? '取消固定' : '固定对话'}</span>
            </button>
            {/* Delete Button */}
            <button 
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md mt-2"
              onClick={handleDelete}
            >
              <IconTrash size={20} />
              <span>删除对话</span>
            </button>
            {/* Rename Button */}
            <button 
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md mt-2"
              onClick={handleRename}
            >
              <IconPencil size={20} />
              <span>重命名对话</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
