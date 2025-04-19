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
  useCallback,
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

// ===== 临时添加卡片定义 START =====
// (理想情况下应从共享位置导入)
import { IconWorldWww, IconDatabase, IconMessageChatbot, IconUsers as IconUsersDs, IconTestPipe, IconCode as IconCodeCh, IconInfoCircle, IconUsers as IconUsersCa, IconHelp, IconMoodBoy, IconMessageCircleQuestion, IconBulb, IconPresentation, IconListDetails, IconCheckbox, IconMessageReport } from '@tabler/icons-react';

interface TempAppCard {
  id: string;
  name: string;
  appId: number;
}

const allCards: TempAppCard[] = [
  // DeepSeek (appId: 1)
  { id: 'ds-network-search', name: '网络搜索', appId: 1 },
  { id: 'ds-campus-kb', name: '校园知识库', appId: 1 },
  { id: 'ds-academic-search', name: '学术检索', appId: 1 },
  { id: 'ds-ai-tutor', name: 'AI辅导员', appId: 1 },
  { id: 'ds-logistics-assistant', name: '后勤助手', appId: 1 },
  // Course Helper (appId: 2)
  { id: 'ch-swe-test', name: '软件工程测试', appId: 2 },
  { id: 'ch-oss-dev', name: '开源软件开发技术', appId: 2 },
  // Campus Assistant (appId: 3)
  { id: 'ca-network-qa', name: '信息网络问答', appId: 3 },
  { id: 'ca-teacher-qa', name: '教师问答', appId: 3 },
  { id: 'ca-student-qa', name: '学生问答', appId: 3 },
  { id: 'ca-freshman-helper', name: '新生助手', appId: 3 },
  // Teacher Assistant (appId: 4)
  { id: 'ta-assignment-ideas', name: '作业构思', appId: 4 },
  { id: 'ta-student-tutoring', name: '学生辅导', appId: 4 },
  { id: 'ta-concept-explanation', name: '概念解释', appId: 4 },
  { id: 'ta-lecture-design', name: '讲座设计', appId: 4 },
  { id: 'ta-lesson-plan', name: '课程计划', appId: 4 },
  { id: 'ta-quiz-generation', name: '测验生成', appId: 4 },
  { id: 'ta-meeting-summary', name: '会议总结', appId: 4 },
];
// ===== 临时添加卡片定义 END =====

// --- 定义 AppConfig 接口 (与 home.tsx/home.context.tsx 一致) ---
interface AppConfig {
  id: number;
  name: string;
  apiKey: string;
  apiUrl?: string;
}
// --- END 定义 ---

// 定义 ModalType
type ModalType = 'rename' | 'delete';

interface Props {
  conversation: Conversation;
  activeAppId: number | null;
  appConfigs: Record<number, AppConfig>; // 确保 appConfigs 是 Record 类型
  modalOpen: ModalType | null;
  onSetModalOpen: (modalOpen: ModalType | null) => void;
}

// 单个会话的删除、重命名等操作
export const ConversationComponent = ({ conversation, activeAppId, appConfigs, modalOpen, onSetModalOpen }: Props) => {
  const {
    state: { selectedConversation, messageIsStreaming }, // 不再需要 lightMode?
    handleSelectConversation,
    handleDeleteConversation,
    handleUpdateConversation,
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
    e.stopPropagation();
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

  // 外部点击关闭 - 需要同时处理桌面菜单和移动底部菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // menuRef 现在可能指向桌面菜单或移动菜单的内容区域
      // buttonRef 始终指向触发按钮
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // 如果点击发生在菜单和按钮之外，关闭两者
        setShowMenu(false);
        // 注意：移动端底部菜单的关闭通常通过点击遮罩层处理，这里可以保留以防万一
        // 或者将移动端菜单的关闭逻辑完全交给遮罩层点击事件
        // setShowMobileBottomSheet(false); // 暂时注释掉，依赖遮罩层关闭
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // 保持空依赖，一直监听

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
      // 立即关闭对话框
      setShowRenameModal(false);
      // onSetModalOpen 由 useEffect 处理
      
      // 使用setTimeout确保UI更新完成后再进行API调用
      setTimeout(() => {
        // 如果有会话ID，异步更新到后端
        if (conversation.id && conversation.conversationID) {
          try {
            // --- 确定要使用的 API Key --- 
            let apiKeyToUse: string | undefined;
            
            // 健壮性修复：确保 appId 是有效数字且存在于 appConfigs 中
            if (
              conversation.appId !== null && 
              typeof conversation.appId === 'number' && 
              appConfigs && 
              conversation.appId in appConfigs // 使用 in 操作符更简洁
            ) {
              // 优先使用当前会话所属应用的 API Key
              const appConfig = appConfigs[conversation.appId]; // 安全访问
              apiKeyToUse = appConfig.apiKey;
              console.log(`重命名: 使用 App ID ${conversation.appId} 的 API Key`);
            } else {
              // 否则，使用全局默认的 API Key
              apiKeyToUse = getApiKey(); 
              console.log("重命名: 使用全局 API Key");
            }
            // --- API Key 确定结束 ---

            // 检查是否成功获取到 API Key
            if (!apiKeyToUse) {
              console.error('无法确定有效的 API Key 进行重命名');
              // 这里可以抛出错误或采取其他错误处理措施
              return; 
            }

            const client = new DifyClient();
            const user = 'unknown';
            
            // 异步调用API，不阻塞UI
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
    // 立即关闭模态框，并通知父组件
    setShowDeleteModal(false);
    // onSetModalOpen 由 useEffect 处理
    
    // 使用setTimeout确保UI更新完成后再进行操作
    setTimeout(() => {
      // 1. 先从前端移除（乐观UI）
      handleDeleteConversation(conversation.id);

      // 2. 再异步调用后端API删除
      if (conversation.id && conversation.conversationID) {
        try {
          // --- 确定要使用的 API Key --- 
          let apiKeyToUse: string | undefined;
          
          // 健壮性修复：确保 appId 是有效数字且存在于 appConfigs 中
          if (
            conversation.appId !== null && 
            typeof conversation.appId === 'number' && 
            appConfigs && 
            conversation.appId in appConfigs // 使用 in 操作符更简洁
          ) {
            // 优先使用当前会话所属应用的 API Key
            const appConfig = appConfigs[conversation.appId]; // 安全访问
            apiKeyToUse = appConfig.apiKey;
            console.log(`删除: 使用 App ID ${conversation.appId} 的 API Key`);
          } else {
            // 否则，使用全局默认的 API Key
            apiKeyToUse = getApiKey();
            console.log("删除: 使用全局 API Key");
          }
          // --- API Key 确定结束 ---

          // 检查是否成功获取到 API Key
          if (!apiKeyToUse) {
            console.error('无法确定有效的 API Key 进行删除');
            // 考虑是否需要恢复前端状态，因为后端调用无法进行
            // 例如: dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
            return; 
          }

          const client = new DifyClient();
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

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, conversation: Conversation) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('conversation', JSON.stringify(conversation));
    }
  };

  // 使用默认图标
  const icon = <IconMessage size={18} />;

  // --- 修改：计算指示器文本 --- 
  let indicatorText: string | null = null;
  
  // 健壮性修复：确保 appId 是有效数字且存在于 appConfigs 中
  if (
    conversation.appId !== null && 
    typeof conversation.appId === 'number' && 
    appConfigs && 
    conversation.appId in appConfigs // 使用 in 操作符
  ) { 
    const currentAppConfig = appConfigs[conversation.appId]; // 安全获取配置
    if (conversation.cardId !== null) {
      // 优先查找卡片名称
      const card = allCards.find(c => c.appId === conversation.appId && c.id === conversation.cardId);
      if (card) {
        indicatorText = card.name; // 只显示卡片名称
      } else {
        // 如果找不到卡片，作为后备显示应用名称
        indicatorText = currentAppConfig.name;
      }
    } else {
       // 如果只有 appId 没有 cardId (理论不应发生，但作为后备)
       indicatorText = currentAppConfig.name;
    }
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
          draggable="true"
          onDragStart={(e) => handleDragStart(e, conversation)}
        >
          {icon}
        <div className="relative flex-1 overflow-hidden text-left text-[13px] leading-5 py-0.5 flex items-center min-w-0">
          <span className="block overflow-hidden whitespace-nowrap text-ellipsis">{conversation.name}</span>
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

      {/* 重命名模态框 - 提高 z-index 到最高 */}
      {showRenameModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010]" onClick={(e) => { if (e.target === e.currentTarget) { setShowRenameModal(false); onSetModalOpen(null); } }}>
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

      {/* 删除确认模态框 - 提高 z-index 到最高 */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010]" onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteModal(false); onSetModalOpen(null); } }}>
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
            {/* 操作按钮 */}
            <button 
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              onClick={handleDelete}
            >
              <IconTrash size={20} />
              <span>删除对话</span>
            </button>
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
