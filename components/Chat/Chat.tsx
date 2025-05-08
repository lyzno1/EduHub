import { IconClearAll, IconSettings, IconTestPipe, IconCode, IconInfoCircle, IconHelp, IconMoodBoy, IconWorldWww, IconDatabase, IconBook, IconMessageChatbot, IconPencil, IconMessageCircleQuestion, IconBulb, IconPresentation, IconListDetails, IconCheckbox, IconMessageReport, IconQuestionMark, IconUsers } from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

import { useTranslation } from 'next-i18next';

import { getEndpoint, getDifyClient } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';
import { streamDifyChat } from '@/services/useApiService';
import { DifyClient } from '@/services/dify/client';
import { API_PATHS } from '@/services/dify/constants';
import { getDifyConfig } from '@/config/dify';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ModernChatInput } from './ModernChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { FunctionCards } from './FunctionCards';
import { ChatMessage } from './ChatMessage';
import { AppPageTemplate } from '@/components/AppPages/common/AppPageTemplate';
import difyConfigService from '@/services/difyConfigService';
import { DifyFolderConfig } from '@/types/dify';
import { iconMapForAllCards, themeColorCycle } from '@/constants/uiConstants';
import { useMobileDetection } from '@/hooks/useMobileDetection'; // Import the new hook
import { useChatScroll } from '@/hooks/useChatScroll'; // Import the simplified hook
import { WelcomeScreen } from './WelcomeScreen'; // Import the new WelcomeScreen component
import { useInputHeightObserver } from '@/hooks/useInputHeightObserver'; // Import the input height observer hook
import { AppInitialPage } from './AppInitialPage'; // Import the new AppInitialPage component
import { MessageList } from './MessageList'; // Import the new MessageList component
import { useDifyCredentials } from '@/hooks/useDifyCredentials'; // 导入新的Hook
import { DifyModelConfig } from '@/types/dify';

// ThemeMode for overall theme might still be needed
type ThemeMode = 'light' | 'dark' | 'red' | 'blue' | 'green' | 'purple' | 'brown';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
  showSidebar?: boolean;
}

export const Chat = ({ stopConversationRef, showSidebar = false }: Props) => {
  const { t } = useTranslation('chat');

  const homeContext = useContext(HomeContext);
  const {
    state: {
      conversations,
      selectedConversation,
      lightMode,
      messageIsStreaming,
      user,
      cardInputPrompt, // 添加对 cardInputPrompt 的获取
      selectedCardId,
      selectedGlobalModelName, // 添加选中的全局模型名称
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
    startConversationFromActiveApp,
    appConfigs,
  } = homeContext;

  // 类型断言确保 lightMode 的类型正确
  const currentTheme = lightMode as ThemeMode;

  const [content, setContent] = useState<string>('');
  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [modelWaiting, setModelWaiting] = useState<boolean>(false);
  
  // 添加用于标题动画的状态
  const [titleAnimationInProgress, setTitleAnimationInProgress] = useState<boolean>(false);
  const [currentDisplayTitle, setCurrentDisplayTitle] = useState<string>('');
  const titleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- ADD Refs for parallel title generation ---
  const titleGenerationInitiated = useRef(false);
  const titlePromise = useRef<Promise<string | null> | null>(null);
  // --- END ADD ---

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 添加 chatStreamRef 来跟踪当前活跃的 chat stream
  const chatStreamRef = useRef<any>(null);
  // ===== 新增 Ref 开始 =====
  const latestHomeContextStateRef = useRef(homeContext.state);
  // ===== 新增 Ref 结束 =====

  // 获取消息数量
  const messagesLength = selectedConversation?.messages?.length || 0;

  // 添加移动端检测 (Now handled by hook)
  const isMobile = useMobileDetection(); // Use the hook
  
  // useEffect(() => {
  //   const checkMobile = () => {
  //     setIsMobile(window.innerWidth < 768);
  //   };
  //   
  //   checkMobile();
  //   window.addEventListener('resize', checkMobile);
  //   return () => window.removeEventListener('resize', checkMobile);
  // }, []);

  // 获取欢迎界面相关样式
  useEffect(() => {
    // 创建样式表
    const styleEl = document.createElement('style');
    styleEl.id = 'welcome-styles';
    
    // 设置欢迎文字样式
    styleEl.innerHTML = `
      .welcome-text {
        opacity: 1;
      }
      
      /* 移动端键盘弹出时的样式 */
      @media (max-width: 767px) {
        html.keyboard-open .flex-col.items-center.justify-center.min-h-screen {
          min-height: auto !important;
        }
        
        html.keyboard-open .welcome-text-container {
          position: static !important;
          margin-top: 1rem !important;
        }
      }
    `;
    
    // 更新或添加样式表
    const existingStyle = document.getElementById('welcome-styles');
    if (existingStyle) {
      existingStyle.innerHTML = styleEl.innerHTML;
    } else {
      document.head.appendChild(styleEl);
    }
    
    // 组件卸载时移除
    return () => {
      const styleToRemove = document.getElementById('welcome-styles');
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);

  // === Chat Scroll Hook ===
  const { showScrollDownButton, handleScrollDown } = useChatScroll({
    chatContainerRef,
    lastUserMessageSelector: '.user-message-bubble', // Pass the selector for user messages
  });

  // === Input Height Observer Hook ===
  const { inputBoxHeight, isInputExpanded, bottomInputHeight } = useInputHeightObserver({ 
    messagesLength, 
  });

  // 添加一个useEffect来监听输入框高度的变化(初始界面) (Moved to useInputHeightObserver)
  // useEffect(() => {
  //   // 如果有消息或在流式生成中，不需要监听
  // }, [messagesLength, messageIsStreaming, inputBoxHeight]);

  // 添加useEffect监听对话模式下底部输入框的高度变化 (Moved to useInputHeightObserver)
  // useEffect(() => {
  //   // 只有在有消息时才监听底部输入框
  // }, [messagesLength, bottomInputHeight]);

  // 优化事件监听，同时支持触摸和鼠标事件 (Moved to useChatScroll)
  // useEffect(() => {
  // }, [chatContainerRef, messagesLength]);

  // 优化消息流更新
  // useEffect(() => {
  //   if (!selectedConversation?.messages || !autoScrollEnabled) return;
  //   
  //   const lastMessage = selectedConversation.messages[selectedConversation.messages.length - 1];
  //   if (!lastMessage) return;
  //   
  //   const updateScroll = () => {
  //     if (!chatContainerRef.current || !autoScrollEnabled) return;
  //     
  //     const shouldScroll = !document.body.classList.contains('user-is-interacting');
  //     if (shouldScroll) {
  //       chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  //     }
  //   };
  //   
  //   // 使用 requestAnimationFrame 优化滚动性能
  //   if (lastMessage.content) {
  //     requestAnimationFrame(updateScroll);
  //   }
  // }, [selectedConversation?.messages, autoScrollEnabled]);

  // --- Add state for task ID ---
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  // --- END Add ---

  // ===== 新增 useEffect 同步 Ref 开始 =====
  useEffect(() => {
    latestHomeContextStateRef.current = homeContext.state;
  }, [homeContext.state]);
  // ===== 新增 useEffect 同步 Ref 结束 =====

  // 添加 useEffect 来处理 cardInputPrompt 变化
  useEffect(() => {
    // 当 cardInputPrompt 存在且不为空时，自动设置到输入框中
    if (cardInputPrompt && cardInputPrompt.trim() !== '') {
      // console.log('[Chat] 检测到 cardInputPrompt 变化，设置输入框内容为:', cardInputPrompt);
      setContent(cardInputPrompt);
    }
  }, [cardInputPrompt]);

  // 添加useDifyCredentials hook
  const { getDifyCredentials } = useDifyCredentials();

  const onSend = async (message: Message, deleteCount = 0) => {
    // ===== 添加新逻辑开始: 检测是否为"应用首页+卡片选中"的发送场景 =====
    const currentActiveAppId = homeContext.state.activeAppId;
    const currentSelectedCardId = homeContext.state.selectedCardId;
    const currentCardInputPrompt = homeContext.state.cardInputPrompt;
    
    // 前置判断：如果用户在应用页面但未选择卡片，则中断发送流程并提示
    if (currentActiveAppId !== null && currentSelectedCardId === null) {
      // 显示提示信息
      toast.error('请先选择一个应用卡片');
      // 中断函数执行，保留用户输入
      return;
    }
    
    // 判断是否是从应用首页卡片发送的消息
    // 条件: 有激活的应用ID，有选中的卡片ID，正在使用卡片的默认提示
    if (currentActiveAppId !== null && currentSelectedCardId !== null) {


      console.log(`[Card Send] Detected new conversation from card: ${currentSelectedCardId} in app: ${currentActiveAppId}`);
      
      // 1. 创建新的对话对象
      const newConversationId = uuidv4();
      const appConfig = appConfigs[currentActiveAppId];
      
      if (!appConfig) {
        console.error(`[Card Send] Invalid appId: ${currentActiveAppId}`);
        return;
      }
      
      // 2. 构建新对话
      const newConversation: Conversation = {
        id: newConversationId,
        name: `${appConfig.name}`, // 临时名称
        model: 'default',
        originalName: appConfig.name,
        // 修改：添加空的助手消息占位符
        messages: [
          message, // 用户消息
          { role: 'assistant', content: '', id: uuidv4() } // 空的助手消息占位符
        ],
        prompt: DEFAULT_SYSTEM_PROMPT,
        temperature: DEFAULT_TEMPERATURE,
        folderId: null,
        conversationID: '', // Dify后端ID初始为空
        // model: 'dify',
        deletable: true,
        appId: currentActiveAppId,
        cardId: currentSelectedCardId, // 保存卡片ID
      };

      
      // 3. 添加到对话列表并选中
      const updatedConversations = [newConversation, ...conversations];
      homeDispatch({ field: 'conversations', value: updatedConversations });
      homeDispatch({ field: 'selectedConversation', value: newConversation });

      
      // 4. 清除应用首页状态
      homeDispatch({ field: 'activeAppId', value: null });
      homeDispatch({ field: 'selectedCardId', value: null });
      homeDispatch({ field: 'cardInputPrompt', value: '' });
      
      // 5. 处理API请求和响应 - 使用startConversationFromActiveApp逻辑（但带有卡片ID）
      // 为了复用逻辑，我们在调用原有onSend之前，先设置selectedConversation
      homeDispatch({ field: 'messageIsStreaming', value: true });
      setModelWaiting(true);
      
      // 现在selectedConversation已更新，继续执行原有逻辑
      // 这个return将跳过下面的检查，因为我们已经手动设置了selectedConversation
      try {
        // --- 从dify_keys.json获取API配置 ---
        const difyConfig = getDifyCredentials(currentActiveAppId, currentSelectedCardId);
        
        if (!difyConfig) {
          console.error(`[Card Send] 无法获取Dify配置，appId: ${currentActiveAppId}, cardId: ${currentSelectedCardId}`);
          toast.error('无法获取API配置，请联系管理员');
          homeDispatch({ field: 'messageIsStreaming', value: false });
          setModelWaiting(false);
          return;
        }
        
        const targetApiUrl = difyConfig.apiUrl;
        const targetApiKey = difyConfig.apiKey;

        console.log(`[Card Send] 使用Dify配置 - URL: ${targetApiUrl}, Key已设置: ${targetApiKey ? 'Yes' : 'No'}`);

        const difyClient = new DifyClient({
          apiUrl: targetApiUrl,
          debug: true
        });

        // 为新对话添加一个空的助手消息作为流式输出的占位符
        const updatedMessages = [...newConversation.messages];
        const assistantMessageId = uuidv4();
        updatedMessages.push({ role: 'assistant', content: '', id: assistantMessageId });
        
        const updatedConversation = {
          ...newConversation,
          messages: updatedMessages
        };
        
        homeDispatch({ field: 'selectedConversation', value: updatedConversation });
        
        // 滚动到底部
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 50);


        // 调用Dify API
        const chatStream = await difyClient.createChatStream({
          query: message.content,
          key: targetApiKey,
          user: user || 'unknown',
          conversationId: '', // 第一次发送，ID为空
          inputs: {},
          autoGenerateName: true // 让Dify尝试生成名字
        });
        
        chatStreamRef.current = chatStream;

        // ===== 复制流处理逻辑开始 =====
        let fullResponse = '';
        let isStreamHalted = false;
        let conversationIdFromStream = ''; // 用于存储从流中获取的Dify后端ID

        // 监听 task_id 变化并保存 (同样需要为新对话处理)
        let taskIdCheck = setInterval(() => {
          if (chatStream.taskId) {
            setCurrentTaskId(chatStream.taskId);
            clearInterval(taskIdCheck);
          }
        }, 500);
        setTimeout(() => { clearInterval(taskIdCheck); }, 10000);

        chatStream.onMessage((chunk: string) => {
        
          // --- 添加：检查滚动位置 START ---
          let shouldScroll = false;
          if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            // Threshold can be adjusted, e.g., 20 pixels
            const threshold = 20; 
            if (scrollHeight - scrollTop <= clientHeight + threshold) {
              shouldScroll = true;
            }
          }
          // --- 添加：检查滚动位置 END ---

          if (isStreamHalted) return;
          if (stopConversationRef.current) {
            console.log('Stop signal detected inside onMessage (Card Send). Halting stream.');
            isStreamHalted = true;
            homeDispatch({ field: 'messageIsStreaming', value: false });
            setModelWaiting(false);
            stopConversationRef.current = false;
            // 尝试中止流
            try { chatStream.abort(); } catch (e) { console.error("Error aborting stream on stop (Card Send):", e); }
            return;
          }

          homeDispatch({ field: 'messageIsStreaming', value: true });
          setModelWaiting(false);

          // ===== 修改开始: 通过 ID 在列表中查找对话 =====
          const currentConversationsList = latestHomeContextStateRef.current.conversations; // 使用 Ref
          const targetConvIndex = currentConversationsList.findIndex(conv => conv.id === newConversation.id);
          
          if (targetConvIndex === -1) {
              // 这理论上不应该发生，因为我们刚添加了它
              console.error("[Card Send Stream] Error: Cannot find the newly created conversation in the list! ID:", newConversation.id);
              isStreamHalted = true;
              return;
          }
          
          // 获取对列表中对话对象的引用
          let targetConv = currentConversationsList[targetConvIndex];
          // ===== 修改结束 =====

          const currentMessages = [...targetConv.messages]; // 使用找到的对话的消息
          
          fullResponse += chunk;
          const assistantMessageIndex = currentMessages.length - 1;

          if(currentMessages[assistantMessageIndex] && currentMessages[assistantMessageIndex].role === 'assistant') {
              currentMessages[assistantMessageIndex] = {
                ...currentMessages[assistantMessageIndex],
                role: 'assistant', 
                content: fullResponse 
              };
          } else {
              console.error("[Card Send Stream] Error updating message stream: Cannot find assistant placeholder.");
              isStreamHalted = true;
              return;
          }

          // 检查并更新从流中获取的 conversationId
          let difyIdUpdated = false;
          if (chatStream.conversationId && chatStream.conversationId !== conversationIdFromStream) {
              conversationIdFromStream = chatStream.conversationId;
              difyIdUpdated = true;
              // console.log(`[Card Send Stream] Received/Confirmed Dify Conversation ID: ${conversationIdFromStream}`);
          }

          // 构建更新后的对话对象
          const updatedTargetConv = {
              ...targetConv,
              messages: currentMessages,
              conversationID: conversationIdFromStream || targetConv.conversationID // 更新Dify ID
          };

          // ===== 修改开始: 使用 Ref 访问 selectedConversation =====
          // 更新 conversations 列表
          const updatedConversationsList = currentConversationsList.map(conv => 
              conv.id === newConversation.id ? updatedTargetConv : conv
          );
          homeDispatch({ field: 'conversations', value: updatedConversationsList });

          // 如果当前选中的还是这个新对话，也更新 selectedConversation
          if (latestHomeContextStateRef.current.selectedConversation?.id === newConversation.id) { // 使用 Ref
              homeDispatch({ field: 'selectedConversation', value: updatedTargetConv });
          }
          // ===== 修改结束 =====

          const streamUpdatedConversation = {
            ...updatedConversation,
            messages: currentMessages, // Use the locally updated messages
            conversationID: conversationIdFromStream // Ensure conversationID is updated
          };
          
          homeDispatch({
            field: 'selectedConversation',
            value: streamUpdatedConversation
          });

          // --- 添加：条件滚动 START ---
          if (shouldScroll && chatContainerRef.current) {
            // Use requestAnimationFrame for smoother scrolling after state update
            requestAnimationFrame(() => {
              if (chatContainerRef.current) {
                 chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            });
          }
          // --- 添加：条件滚动 END ---
        });

        chatStream.onError((error: Error) => {
          if (isStreamHalted) return;
          console.error('[Card Send Stream] Error processing message:', error);
          homeDispatch({ field: 'messageIsStreaming', value: false });
          setModelWaiting(false);
          toast.error(`Message processing error: ${error.message}`);
          // 注意：错误处理可能需要回滚状态或删除创建的对话
        });

        chatStream.onComplete(async () => {

          if (isStreamHalted) {
             console.log('[Card Send Stream] Stream was halted, skipping final updates.');
             homeDispatch({ field: 'messageIsStreaming', value: false });
             setModelWaiting(false);
            return;
          }
          // console.log('[Card Send Stream] Message processing complete');
          homeDispatch({ field: 'messageIsStreaming', value: false });
          setModelWaiting(false);


          // ===== 修改开始: 使用 Ref 访问 conversations =====
          const finalConversationsList = latestHomeContextStateRef.current.conversations; // 使用 Ref
          const finalTargetConvIndex = finalConversationsList.findIndex(conv => conv.id === newConversation.id);
          // ===== 修改结束 =====


          if (finalTargetConvIndex === -1) {
              console.error("[Card Send Complete] Error: Cannot find the conversation in the list! ID:", newConversation.id);
              return;
          }
          
          let finalTargetConv = finalConversationsList[finalTargetConvIndex];
          // ===== 修改结束 =====

          // 更新最终的助手消息内容
          const finalMessages = [...finalTargetConv.messages];
          const lastMessageIndex = finalMessages.length - 1;
          if (finalMessages[lastMessageIndex] && finalMessages[lastMessageIndex].role === 'assistant') {
              finalMessages[lastMessageIndex].content = fullResponse;
          }

          // 尝试获取 Dify 自动生成的名称 (如果autoGenerateName为true)
          let finalConversationName = finalTargetConv.name;
          // 注意：DifyClient 可能没有直接暴露 generateConversationName，或者需要在此处调用
          // 暂时保持使用之前的临时名称或让用户手动改名

          const finalConversationToSave = {
            ...finalTargetConv,
            name: finalConversationName,
            messages: finalMessages,
            conversationID: conversationIdFromStream || finalTargetConv.conversationID // 确保保存了 Dify ID
          };

          // ===== 修改开始: 使用 Ref 访问 selectedConversation =====
          // 更新状态并保存
          const finalUpdatedList = finalConversationsList.map(conv =>
            conv.id === finalConversationToSave.id ? finalConversationToSave : conv
          );
          homeDispatch({ field: 'conversations', value: finalUpdatedList });
          // 确保 selectedConversation 也是最新的
          if (latestHomeContextStateRef.current.selectedConversation?.id === newConversation.id) { // 使用 Ref
             homeDispatch({ field: 'selectedConversation', value: finalConversationToSave });
          }
          // ===== 修改结束 =====
          saveConversation(finalConversationToSave);
          saveConversations(finalUpdatedList);

          // console.log('[Card Send Complete] Conversation saved:', finalConversationToSave.id, finalConversationToSave.name);
          // 清除输入框内容 (如果需要)
          // setContent(''); 
        });
        // ===== 复制流处理逻辑结束 =====

      } catch (error) {
        console.error('[Card Send] Error creating new conversation:', error);
        homeDispatch({ field: 'messageIsStreaming', value: false });
        setModelWaiting(false);
        // 显示错误提示
        toast.error('创建新对话失败，请重试');
      }
    }
    // ===== 添加新逻辑结束 =====
    
    if (!selectedConversation) return;
    
    titleGenerationInitiated.current = false;
    titlePromise.current = null;
    // 重置当前任务ID
    setCurrentTaskId(null);

    try {
      const currentAppId = selectedConversation.appId;
      const currentCardId = selectedConversation.cardId;
      let targetApiKey: string | null = null;
      let targetApiUrl: string | null = null;

      // --- 区分全局对话和应用对话 --- 
      if (currentAppId === 0 || currentAppId === null) {
        // 全局对话：使用 DifyConfigService 获取配置
        console.log(`[Chat Send] 全局对话，当前选中模型: ${selectedGlobalModelName}`);
        targetApiUrl = difyConfigService.getGlobalApiUrl();
        targetApiKey = difyConfigService.getGlobalModelApiKey(selectedGlobalModelName);
        
        if (!targetApiKey || !targetApiUrl) {
            console.error(`[Chat Send] 无法获取全局模型配置，模型: ${selectedGlobalModelName}, URL: ${targetApiUrl}, Key: ${targetApiKey}`);
            toast.error('无法获取全局API配置，请联系管理员');
            return;
        }
        console.log(`[Chat Send] 使用全局Dify配置 - 模型: ${selectedGlobalModelName}, URL: ${targetApiUrl}, Key已设置: ${targetApiKey ? 'Yes' : 'No'}`);

      } else {
        // 应用对话：使用 useDifyCredentials hook 获取配置
        console.log(`[Chat Send] 应用对话，appId: ${currentAppId}, cardId: ${currentCardId}`);
        const appDifyConfig = getDifyCredentials(currentAppId, currentCardId);
        if (!appDifyConfig) {
          console.error(`[Chat Send] 无法获取应用Dify配置，appId: ${currentAppId}, cardId: ${currentCardId}`);
          toast.error('无法获取应用API配置，请联系管理员');
          return;
        }
        targetApiKey = appDifyConfig.apiKey;
        targetApiUrl = appDifyConfig.apiUrl;
        console.log(`[Chat Send] 使用应用Dify配置 - URL: ${targetApiUrl}, Key已设置: ${targetApiKey ? 'Yes' : 'No'}`);
      }
      // --- 配置获取结束 --- 

      // 确保获取到了有效的配置
      if (!targetApiKey || !targetApiUrl) { // 双重检查
          console.error("[Chat Send] 最终未能获取有效的 API Key 或 URL.");
          toast.error('API配置无效，无法发送消息。');
          return;
      }

      const difyClient = new DifyClient({
        apiUrl: targetApiUrl,
        debug: true
      });

      let conversationId = selectedConversation.conversationID || '';
      
      console.log('对话ID信息:', {
        conversationId: conversationId,
        selectedConversationId: selectedConversation.id,
        messages: selectedConversation.messages.length
      });

      const updatedMessages = [...selectedConversation.messages];
      if (deleteCount) {
        updatedMessages.splice(-deleteCount);
      }
      updatedMessages.push(message);
      // Add an empty assistant message for streaming output, with a unique ID
      updatedMessages.push({ role: 'assistant', content: '', id: uuidv4() });
      
      const updatedConversation = {
        ...selectedConversation,
        messages: updatedMessages
      };
      
      homeDispatch({ field: 'selectedConversation', value: updatedConversation });

      homeDispatch({ field: 'messageIsStreaming', value: true });
      setModelWaiting(true);
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 50);

      // --- 调用 Dify API (使用获取到的 targetApiKey 和 targetApiUrl) ---
      const chatStream = await difyClient.createChatStream({
        query: message.content,
        key: targetApiKey, // 使用最终确定的 Key
        user: user || 'unknown',
        conversationId, 
        inputs: {},
        autoGenerateName: selectedConversation.messages.length <= 1 // 只有第一条用户消息时尝试生成名字
      });
      chatStreamRef.current = chatStream;

      let fullResponse = '';
      let isStreamHalted = false;
      
      // 监听 task_id 变化并保存
      let taskIdCheck = setInterval(() => {
        if (chatStream.taskId) {
          setCurrentTaskId(chatStream.taskId);
          clearInterval(taskIdCheck);
        }
      }, 500);
      
      // 确保组件卸载时清除interval
      setTimeout(() => {
        clearInterval(taskIdCheck);
      }, 10000); // 最多尝试10秒

      chatStream.onMessage((chunk: string) => {
        // --- 添加：检查滚动位置 START ---
        let shouldScroll = false;
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const threshold = 20; // Threshold for being "at the bottom"
            if (scrollHeight - scrollTop <= clientHeight + threshold) {
                shouldScroll = true;
            }
        }
        // --- 添加：检查滚动位置 END ---

        if (isStreamHalted) return;
        if (stopConversationRef.current) {
          console.log('Stop signal detected inside onMessage. Halting stream permanently for this request.');
          isStreamHalted = true;
          homeDispatch({ field: 'messageIsStreaming', value: false });
        setModelWaiting(false); // Received message, no longer waiting
          stopConversationRef.current = false; // Reset stop flag
          return;
        }

        homeDispatch({ field: 'messageIsStreaming', value: true }); // Ensure streaming state is true
        setModelWaiting(false); // Received message, no longer waiting
        
        const currentMessages = [...updatedConversation.messages]; // Use a fresh copy from closure
        fullResponse += chunk;
        const assistantMessageIndex = currentMessages.length - 1;
        
        // Ensure we are updating the correct, previously added empty assistant message
        if(currentMessages[assistantMessageIndex] && currentMessages[assistantMessageIndex].role === 'assistant') {
            currentMessages[assistantMessageIndex] = {
              ...currentMessages[assistantMessageIndex],
          role: 'assistant', 
          content: fullResponse 
        };
        } else {
            // Should theoretically not happen, but as a safeguard
            console.error("Error updating message stream: Cannot find assistant message placeholder.");
            isStreamHalted = true; // Stop processing if state is inconsistent
            return;
        }

        // --- 并行标题生成逻辑 --- 
        const isPotentiallyNewConversationResponse = currentMessages.length === 2;

        // 1. 确保 conversationId 更新 (保持不变)
        if (chatStream.conversationId && (!conversationId || conversationId === '')) {
           conversationId = chatStream.conversationId;
           console.log(`[Dify] Received/Confirmed Conversation ID: ${conversationId}`);
           // Immediately update conversationID in HomeContext and localStorage
          const updatedConversationsWithId = conversations.map(conv =>
            conv.id === selectedConversation.id
               ? { ...conv, conversationID: conversationId }
              : conv
          );
          homeDispatch({
            field: 'conversations',
            value: updatedConversationsWithId
          });
           // Update conversationID of the currently selected conversation in closure
           updatedConversation.conversationID = conversationId;
        }

        // 2. 触发标题生成
        if (isPotentiallyNewConversationResponse && !titleGenerationInitiated.current && conversationId) {
            titleGenerationInitiated.current = true;
            console.log(`[Parallel Title] 开始生成标题 (convId: ${conversationId})`);

            // --- 确定标题生成所需的 API Key 和 URL --- 
            let titleApiKey: string | null = null;
            let titleApiUrl: string | null = null;

            if (currentAppId === 0 || currentAppId === null) {
                // 全局对话标题生成：使用当前选定全局模型
                titleApiUrl = difyConfigService.getGlobalApiUrl();
                titleApiKey = difyConfigService.getGlobalModelApiKey(selectedGlobalModelName);
                 console.log(`[Parallel Title] 使用全局配置 (模型: ${selectedGlobalModelName})`);
            } else {
                // 应用对话标题生成：使用与主消息相同的应用配置
                const appDifyConfig = getDifyCredentials(currentAppId, currentCardId);
                if (appDifyConfig) {
                    titleApiKey = appDifyConfig.apiKey;
                    titleApiUrl = appDifyConfig.apiUrl;
                    console.log(`[Parallel Title] 使用应用配置 (appId: ${currentAppId})`);
                } else {
                    console.warn(`[Parallel Title] 无法获取应用 ${currentAppId} 的配置，标题生成可能失败或使用回退`);
                    // 可以选择回退到默认全局模型配置
                    const defaultModel = difyConfigService.getDefaultGlobalModel();
                    const globalApiUrl = difyConfigService.getGlobalApiUrl();
                    if (defaultModel && globalApiUrl) {
                        titleApiKey = defaultModel.apiKey;
                        titleApiUrl = globalApiUrl;
                    }
                }
            }
            // --- 配置确定结束 --- 

            if (!titleApiKey || !titleApiUrl) {
                console.error("[Parallel Title] 无法确定标题生成的 API Key 或 URL！");
                // 可以选择不生成标题，或者记录错误
            } else {
                const titleUser = user || 'unknown';
            titlePromise.current = (async () => {
              try {
                        const titleDifyClient = new DifyClient({ apiUrl: titleApiUrl, debug: true });
                const generatedName = await titleDifyClient.generateConversationName(
                            conversationId, 
                  titleApiKey,
                      titleUser
                );
                        console.log('[Parallel Title] 成功生成标题:', generatedName);
                return generatedName || null;
              } catch (error) {
                        console.error('[Parallel Title] 标题生成失败:', error);
                return null;
              }
            })();
          }
        }
        // ... (剩余流处理) ...
        
        const streamUpdatedConversation = {
          ...updatedConversation,
          messages: currentMessages, // Use the locally updated messages
          conversationID: conversationId // Ensure conversationID is updated
        };
        
        homeDispatch({
          field: 'selectedConversation',
          value: streamUpdatedConversation
        });

        // --- 添加：条件滚动 START ---
        if (shouldScroll && chatContainerRef.current) {
           // Use requestAnimationFrame for smoother scrolling after state update
            requestAnimationFrame(() => {
              if (chatContainerRef.current) {
                 chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            });
        }
        // --- 添加：条件滚动 END ---
      });

      chatStream.onError((error: Error) => {
        if (isStreamHalted) {
          console.log('Stream was halted, ignoring error callback.');
          return;
        }
        console.error('Error processing message:', error);
        homeDispatch({ field: 'messageIsStreaming', value: false });
        setModelWaiting(false); // Error, stop waiting
        
        if (error.message.includes('Conversation Not Exists')) {
          console.warn('Conversation Not Exists error detected. Resetting conversationID and retrying.');
          // Use the latest state from context for safety
          const currentSelectedConv = selectedConversation;
          if (!currentSelectedConv) return; // Should not happen, but safeguard

          const resetConversation = {
            ...currentSelectedConv,
            conversationID: '' // Clear the incorrect ID
          };
          homeDispatch({
            field: 'selectedConversation',
            value: resetConversation
          });

           const updatedConversationsReset = conversations.map(conv =>
             conv.id === currentSelectedConv.id
               ? { ...conv, conversationID: '' }
               : conv
           );
           homeDispatch({ field: 'conversations', value: updatedConversationsReset });
           saveConversations(updatedConversationsReset);

           setTimeout(() => {
          onSend(message, deleteCount);
           }, 500);
          return;
        }
        
        toast.error(`Message processing error: ${error.message}`);
      });

      chatStream.onComplete(async () => {
        if (isStreamHalted) {
          console.log('Stream was halted, skipping final updates.');
           homeDispatch({ field: 'messageIsStreaming', value: false });
           setModelWaiting(false);
          return;
        }
        
        homeDispatch({ field: 'messageIsStreaming', value: false });
        setModelWaiting(false);
        
        let finalConversationName = selectedConversation.name;
        if (titlePromise.current) {
          try {
            console.log('[Finalize] Waiting for parallel title generation...');
              const generatedName = await titlePromise.current;
              if (generatedName) {
              finalConversationName = generatedName;
              console.log('[Finalize] Parallel title generated successfully:', finalConversationName);
              } else {
              console.log('[Finalize] Parallel title generation returned null or failed.');
              // Optionally set a fallback title here if needed
              // finalConversationName = selectedConversation.messages[0]?.content.substring(0, 20) || 'Untitled';
              }
            } catch (error) {
            console.error('[Finalize] Error awaiting parallel title generation:', error);
             // Optionally set a fallback title here if needed
             // finalConversationName = selectedConversation.messages[0]?.content.substring(0, 20) || 'Untitled';
          }
        }

        // Use the latest message list from closure, ensuring the last message content is final
        const finalMessages = [...updatedConversation.messages]; // Use the closure's updated messages
        const lastMessageIndex = finalMessages.length - 1;
         if (finalMessages[lastMessageIndex] && finalMessages[lastMessageIndex].role === 'assistant') {
            finalMessages[lastMessageIndex].content = fullResponse; // Ensure final content is set
        }
        
        const finalConversation = {
          ...updatedConversation, // Contains potentially updated conversationID from stream
          name: finalConversationName,
          messages: finalMessages,
          // conversationID: conversationId // Already in updatedConversation if updated
        };
        
        homeDispatch({
          field: 'selectedConversation',
          value: finalConversation
        });
        
        // Update the main conversations list in context and localStorage
        const finalConversationsList = conversations.map(conv =>
          conv.id === finalConversation.id ? finalConversation : conv
        );
        homeDispatch({ field: 'conversations', value: finalConversationsList });
        saveConversations(finalConversationsList);

        // Clear input after successful send
        setContent(''); 
      });

    } catch (error: any) {
      console.error('Unexpected error caught during message sending:', error);
      homeDispatch({ field: 'messageIsStreaming', value: false });
      setModelWaiting(false);
      toast.error(`Send failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };

  // 移除可能导致频繁DOM操作的interval检查，改为更高效的方式
  // useEffect(() => {
  //   // 仅在消息流动结束且autoscroll启用时，确保滚动到底部
  //   if (!messageIsStreaming && autoScrollEnabled) {
  //     handleScrollDown();
  //   }
  // }, [messageIsStreaming, autoScrollEnabled, handleScrollDown]);

  // 简化确保在新消息时的滚动行为
  // useEffect(() => {
  //   // 只有当新消息到达且autoscroll启用时才滚动，但在模型生成过程中不滚动
  //   if (selectedConversation?.messages && autoScrollEnabled && !messageIsStreaming) {
  //     setTimeout(handleScrollDown, 100);
  //   }
  // }, [selectedConversation?.messages, handleScrollDown, autoScrollEnabled, messageIsStreaming]);

  // 更新样式内容，确保平滑过渡和一致的padding
  useEffect(() => {
    // 创建样式表
    const styleEl = document.createElement('style');
    // 确保ID唯一，避免重复添加
    styleEl.id = 'chat-custom-scrollbar-styles';
    
    // 获取当前主题颜色
    const isDarkMode = currentTheme === 'dark';
    
    // 设置样式内容
    styleEl.innerHTML = `
      /* 滚动条容器样式 */
      .chat-container-scrollbar, .textarea-container-scrollbar {
        position: relative;
        scrollbar-width: thin;
        scrollbar-color: transparent transparent; /* Firefox支持 */
      }
      
      /* 滚动条整体样式 */
      .chat-container-scrollbar::-webkit-scrollbar, .textarea-container-scrollbar::-webkit-scrollbar {
        width: 8px;
        background-color: transparent;
      }
      
      /* 滚动条滑块样式 - 设置为透明 */
      .chat-container-scrollbar::-webkit-scrollbar-thumb, .textarea-container-scrollbar::-webkit-scrollbar-thumb {
        background-color: transparent;
      }
      
      /* 滚动条轨道样式 - 设置为透明 */
      .chat-container-scrollbar::-webkit-scrollbar-track, .textarea-container-scrollbar::-webkit-scrollbar-track {
        background-color: transparent;
      }
      
      /* 创建一个自定义的滚动条容器 */
      .chat-scrollbar-custom-overlay {
        position: fixed;
        top: 40px;
        right: 0;
        width: 8px;
        bottom: 85px; /* 减少底部距离，与底部遮挡层一致 */
        z-index: 99;
        pointer-events: auto; /* 允许鼠标事件 */
        display: none; /* 默认隐藏，由JS控制显示 */
      }
      
      /* 自定义滚动条轨道 */
      .chat-scrollbar-custom-track {
        position: absolute;
        top: 0;
        right: 0;
        width: 8px;
        height: 100%;
        background-color: transparent;
      }
      
      /* 自定义滚动条滑块 - 会动态定位和大小 */
      .chat-scrollbar-custom-thumb {
        position: absolute;
        width: 8px;
        background-color: ${isDarkMode ? 'rgba(200, 200, 210, 0.3)' : 'rgba(156, 163, 175, 0.3)'};
        border-radius: 10px;
        transition: background-color 0.2s;
      }
      
      /* 正在拖动的滑块样式 */
      .user-is-dragging-scrollbar .chat-scrollbar-custom-thumb {
        background-color: ${isDarkMode ? 'rgba(200, 200, 210, 0.6)' : 'rgba(156, 163, 175, 0.6)'};
      }
      
      .chat-scrollbar-custom-thumb:hover {
        background-color: ${isDarkMode ? 'rgba(200, 200, 210, 0.5)' : 'rgba(156, 163, 175, 0.5)'};
      }
      
      /* 上边界指示器 - 上三角形 */
      .chat-scrollbar-custom-overlay::before {
        content: "";
        position: absolute;
        top: -6px;
        right: 0;
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 6px solid ${isDarkMode ? 'rgba(200, 200, 210, 0.4)' : 'rgba(156, 163, 175, 0.4)'};
        pointer-events: none; /* 防止干扰鼠标事件 */
      }
      
      /* 下边界指示器 - 下三角形 */
      .chat-scrollbar-custom-overlay::after {
        content: "";
        position: absolute;
        bottom: -6px;
        right: 0;
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 6px solid ${isDarkMode ? 'rgba(200, 200, 210, 0.4)' : 'rgba(156, 163, 175, 0.4)'};
        pointer-events: none; /* 防止干扰鼠标事件 */
      }
      
      /* 防止文本选择，避免拖动滚动条时选择文本 */
      .user-is-dragging-scrollbar {
        user-select: none;
      }
      
      /* 初始状态下的自定义滚动条 - 确保与对话状态一致 */
      .initial-input-scrollbar-overlay {
        position: fixed;
        top: 40%;
        right: 0;
        width: 8px;
        height: 220px;
        z-index: 99;
        pointer-events: none;
        display: none; /* 默认隐藏，由JS控制显示 */
      }
      
      /* 初始状态滚动条样式与主滚动条保持一致 */
      .initial-input-scrollbar-overlay .chat-scrollbar-custom-track,
      .initial-input-scrollbar-overlay .chat-scrollbar-custom-thumb,
      .initial-input-scrollbar-overlay::before,
      .initial-input-scrollbar-overlay::after {
        /* 继承主滚动条的样式 */
        display: inherit;
      }
      
      /* 适配暗色模式 */
      @media (prefers-color-scheme: dark) {
        .chat-scrollbar-custom-thumb {
          background-color: rgba(200, 200, 210, 0.3);
        }
        
        .chat-scrollbar-custom-thumb:hover {
          background-color: rgba(200, 200, 210, 0.5);
        }
        
        
        .chat-scrollbar-custom-overlay::before {
          border-bottom: 6px solid rgba(200, 200, 210, 0.4);
        }
        
        .chat-scrollbar-custom-overlay::after {
          border-top: 6px solid rgba(200, 200, 210, 0.4);
        }
      }
    `;
    
    // 更新或添加样式表
    const existingStyle = document.getElementById('chat-custom-scrollbar-styles');
    if (existingStyle) {
      existingStyle.innerHTML = styleEl.innerHTML;
    } else {
      document.head.appendChild(styleEl);
    }
    
    // 组件卸载时移除样式表
    return () => {
      const existingStyle = document.getElementById('chat-custom-scrollbar-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [currentTheme]); // 添加currentTheme作为依赖，确保主题切换时更新样式

  // 添加自定义滚动条逻辑
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    // 创建自定义滚动条元素
    const overlay = document.createElement('div');
    overlay.className = 'chat-scrollbar-custom-overlay';
    
    const track = document.createElement('div');
    track.className = 'chat-scrollbar-custom-track';
    
    const thumb = document.createElement('div');
    thumb.className = 'chat-scrollbar-custom-thumb';
    
    track.appendChild(thumb);
    overlay.appendChild(track);
    document.body.appendChild(overlay);
    
    // 更新滚动条位置和大小
    const updateScrollbar = () => {
      if (!chatContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const scrollableArea = scrollHeight - clientHeight;
      
      // 检查是否是初始状态（没有消息）
      const isInitialState = messagesLength === 0;
      
      // 在初始状态下，始终隐藏滚动条和指示器
      if (isInitialState) {
        overlay.style.display = 'none';
        return;
      }
      
      // 对话状态下，只有在有可滚动内容时才显示滚动条
      if (scrollableArea <= 0) {
        overlay.style.display = 'none';
        return;
      } else {
        overlay.style.display = 'block';
      }
      
      // 计算滑块高度 - 基于可视区域与总高度的比例
      const trackHeight = overlay.clientHeight;
      const thumbHeight = Math.max(30, (clientHeight / scrollHeight) * trackHeight);
      
      // 计算滑块位置
      const thumbTop = (scrollTop / Math.max(1, scrollableArea)) * (trackHeight - thumbHeight);
      
      // 更新滑块样式
      thumb.style.display = 'block';
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.top = `${thumbTop}px`;
    };
    
    // 初始更新
    updateScrollbar();
    
    // 监听滚动事件
    const handleScroll = () => {
      updateScrollbar();
    };
    
    // 添加滚动条拖动功能
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;
    
    const onThumbMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      isDragging = true;
      startY = e.clientY;
      document.body.classList.add('user-is-dragging-scrollbar');
      
      if (chatContainerRef.current) {
        startScrollTop = chatContainerRef.current.scrollTop;
      }
      
      document.addEventListener('mousemove', onDocumentMouseMove);
      document.addEventListener('mouseup', onDocumentMouseUp);
    };
    
    const onTrackMouseDown = (e: MouseEvent) => {
      // 检查点击是否在轨道上而不是滑块上
      if (e.target === track) {
        e.preventDefault();
        
        if (!chatContainerRef.current) return;
        
        const { scrollHeight, clientHeight } = chatContainerRef.current;
        const trackRect = track.getBoundingClientRect();
        const clickRatio = (e.clientY - trackRect.top) / trackRect.height;
        
        // 设置新的滚动位置
        chatContainerRef.current.scrollTop = clickRatio * (scrollHeight - clientHeight);
        
        // 更新滚动条位置
        updateScrollbar();
      }
    };
    
    const onDocumentMouseMove = (e: MouseEvent) => {
      if (!isDragging || !chatContainerRef.current) return;
      
      e.preventDefault();
      
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      const scrollableDistance = scrollHeight - clientHeight;
      const trackRect = track.getBoundingClientRect();
      
      // 计算鼠标移动距离相对于轨道的比例
      const deltaY = e.clientY - startY;
      const deltaRatio = deltaY / trackRect.height;
      
      // 应用新的滚动位置
      chatContainerRef.current.scrollTop = Math.max(
        0,
        Math.min(startScrollTop + deltaRatio * scrollableDistance, scrollableDistance)
      );
      
      // 更新滚动条
      updateScrollbar();
    };
    
    const onDocumentMouseUp = () => {
      isDragging = false;
      document.body.classList.remove('user-is-dragging-scrollbar');
      document.removeEventListener('mousemove', onDocumentMouseMove);
      document.removeEventListener('mouseup', onDocumentMouseUp);
    };
    
    // 添加事件监听器
    thumb.addEventListener('mousedown', onThumbMouseDown);
    track.addEventListener('mousedown', onTrackMouseDown);
    chatContainerRef.current.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateScrollbar);
    
    // 创建MutationObserver来监视内容变化
    const observer = new MutationObserver(updateScrollbar);
    observer.observe(chatContainerRef.current, { 
      childList: true, 
      subtree: true,
      attributes: true
    });
    
    // 清理
    return () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', updateScrollbar);
      observer.disconnect();
      
      thumb.removeEventListener('mousedown', onThumbMouseDown);
      track.removeEventListener('mousedown', onTrackMouseDown);
      document.removeEventListener('mousemove', onDocumentMouseMove);
      document.removeEventListener('mouseup', onDocumentMouseUp);
      
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
  }, [messagesLength, bottomInputHeight]);

  // --- 修改 handleStopConversation --- 
  const handleStopConversation = async () => { 
    console.log('停止按钮被点击，中止生成');
    stopConversationRef.current = true;
    homeDispatch({ field: 'messageIsStreaming', value: false });
    setModelWaiting(false);

    // 中止前端流
    if (chatStreamRef.current) {
      try { chatStreamRef.current.abort(); } catch (error) { console.error('中止前端流时发生错误:', error); }
      chatStreamRef.current = null;
    }

    // 调用 Dify Stop API
    if (currentTaskId && selectedConversation) { // 确保有任务ID和对话信息
      try {
        const currentAppId = selectedConversation.appId;
        const currentCardId = selectedConversation.cardId;
        let targetApiKey: string | null = null;
        let targetApiUrl: string | null = null;

        // --- 区分全局和应用获取配置 --- 
        if (currentAppId === 0 || currentAppId === null) {
          // 全局停止：使用当前选定全局模型配置
          targetApiUrl = difyConfigService.getGlobalApiUrl();
          targetApiKey = difyConfigService.getGlobalModelApiKey(selectedGlobalModelName);
          console.log(`[Stop] 使用全局配置 (模型: ${selectedGlobalModelName}) 停止任务: ${currentTaskId}`);
        } else {
          // 应用停止：使用应用配置
          const appDifyConfig = getDifyCredentials(currentAppId, currentCardId);
          if (appDifyConfig) {
            targetApiKey = appDifyConfig.apiKey;
            targetApiUrl = appDifyConfig.apiUrl;
            console.log(`[Stop] 使用应用配置 (appId: ${currentAppId}) 停止任务: ${currentTaskId}`);
          } else {
            console.warn(`[Stop] 无法获取应用 ${currentAppId} 配置，可能无法正确停止后端任务`);
            // 理论上不应发生，因为开始时有配置，但添加保护
          }
        }
        // --- 配置获取结束 --- 

        if (targetApiKey && targetApiUrl) {
          const difyClient = new DifyClient({ apiUrl: targetApiUrl, debug: false });
          await difyClient.stopChatStream(
          currentTaskId,
          targetApiKey,
          user || 'unknown'
        );
          console.log(`[Stop] 成功发送停止请求到后端，任务ID: ${currentTaskId}`);
        } else {
           console.error(`[Stop] 无法获取停止任务 ${currentTaskId} 所需的 API 配置！`);
        }
      } catch (error) {
        console.error(`调用停止API (任务ID: ${currentTaskId}) 时发生错误:`, error);
      }
      setCurrentTaskId(null); // 清除任务ID
    }
    // --- END Call Dify Stop API ---

    setTimeout(() => { stopConversationRef.current = false; }, 1000);
  };
  // --- END handleStopConversation ---

  // 监听自定义事件，当对话被停止时重置状态 (修复状态调用)
  useEffect(() => {
    const handleStopConversationEvent = () => {
      setModelWaiting(false);
      homeDispatch({ field: 'messageIsStreaming', value: false });
    };
    
    return () => {
    };
  }, []);

  // 添加useEffect清理计时器
  useEffect(() => {
    // 在组件卸载时清理计时器
    return () => {
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
      }
    };
  }, []);

  // --- Determine rendering mode based on selectedConversation --- 
  const currentAppId = selectedConversation?.appId;
  const activeAppId = homeContext.state.activeAppId;

  // 定义界面模式状态
  const isStandardChat = messagesLength > 0 && currentAppId === null;
  const isAppMode = currentAppId !== null || activeAppId !== null;
  const isWelcomeScreen = !messagesLength && !isAppMode;

  // ===== 添加：计算传递给输入框的实际内容 =====
  const homeState = homeContext.state; // 获取当前 context state
  // 计算应该传递给 ModernChatInput 的 content 值
  const inputContentValue =
    // 如果当前是应用模式 (activeAppId 不为 null) 且没有选中卡片 (selectedCardId 为 null)
    (homeState.activeAppId !== null && homeState.selectedCardId === null)
    ? '' // 则强制传递空字符串
    : content; // 否则，使用 Chat 组件自己的 content state (用于普通对话输入、卡片选中后的输入等)
  // ===== 添加结束 =====

  // ===== 添加：计算输入框是否应禁用 =====
  const isInputDisabled = activeAppId !== null && homeState.selectedCardId === null;
  // ===== 添加结束 =====

  // Get all folder configs in a stable order (Object.values should be stable for numeric-like keys from service)
  const allFolderConfigsArray = useMemo(() => {
      try {
          const configsObject = difyConfigService.getAllFolderConfigs();
          return Object.values(configsObject); // Convert Record to Array
      } catch (error) {
          console.error("[Chat] Error getting all folder configs:", error);
          return [];
      }
  }, []); // Assuming configs load once and don't change during lifecycle

  // Find the active application configuration
  const activeAppConfig = useMemo(() => {
    if (activeAppId === null) return null;
    // Find the config in the array to ensure we use the same object reference
    return allFolderConfigsArray.find(config => config.appId === activeAppId) || null;
  }, [activeAppId, allFolderConfigsArray]);

  // Calculate theme color based on cycle and index
  const activeThemeColor = useMemo(() => {
    if (!activeAppConfig) return themeColorCycle[0]; // Default to the first color
    
    const index = allFolderConfigsArray.findIndex(config => config.appId === activeAppId);
    
    if (index === -1) {
        console.warn(`[Chat] Active app config (ID: ${activeAppId}) not found in allFolderConfigsArray.`);
        return themeColorCycle[0]; // Default if not found (should not happen)
    }
    
    // Cycle through the colors based on index
    return themeColorCycle[index % themeColorCycle.length];
  }, [activeAppId, activeAppConfig, allFolderConfigsArray]);

  return (
    <div
      className={`relative flex-1 flex flex-col overflow-y-auto bg-white dark:bg-[#343541] ${
        /* Theme classes based on currentTheme */ 
        currentTheme === 'red' ? 'bg-[#F2ECBE]' : 
        currentTheme === 'blue' ? 'bg-[#F6F4EB]' : 
        currentTheme === 'green' ? 'bg-[#FAF1E4]' : 
        currentTheme === 'purple' ? 'bg-[#C5DFF8]' : 
        currentTheme === 'brown' ? 'bg-[#F4EEE0]' : 
        'bg-white dark:bg-[#343541]' 
      }`}
      style={{
        /* CSS variables for theme */ 
        '--bg-color': currentTheme === 'red' ? '#F2ECBE' : 
                      currentTheme === 'blue' ? '#F6F4EB' : 
                      currentTheme === 'green' ? '#FAF1E4' : 
                      currentTheme === 'purple' ? '#C5DFF8' : 
                      currentTheme === 'brown' ? '#F4EEE0' : 
                      '#FFFFFF', 
        '--dark-bg-color': '#343541'
      } as React.CSSProperties}
    >
      <>
        {/* Top padding/mask, only shown when there are messages */} 
        {messagesLength > 0 && (
          <div 
            className="absolute top-0 left-0 right-[17px] z-10 h-[30px] md:block hidden bg-white dark:bg-[#343541]"
            style={{
               /* Background color based on theme */ 
              backgroundColor: currentTheme === 'red' ? '#F2ECBE' : 
                                currentTheme === 'blue' ? '#F6F4EB' : 
                                currentTheme === 'green' ? '#FAF1E4' : 
                                currentTheme === 'purple' ? '#C5DFF8' : 
                                currentTheme === 'brown' ? '#F4EEE0' : 
                                currentTheme === 'light' ? '#FFFFFF' : 
                                '#343541' 
            }}
          ></div>
        )}

        <div
          className={`${messagesLength === 0 ? 'h-full' : 'flex-1 overflow-y-auto'} chat-container-scrollbar`} 
          ref={chatContainerRef}
        >
          {/* === Rendering Logic Start === */}
          {messagesLength > 0 && selectedConversation ? (
            // *** 1. Render Chat Messages (if messages exist) ***
            <MessageList
              messages={selectedConversation.messages}
              messageIsStreaming={messageIsStreaming}
              modelWaiting={modelWaiting}
              currentTheme={currentTheme}
              user={user}
              messagesEndRef={messagesEndRef}
              bottomInputHeight={bottomInputHeight}
              onEdit={(editedMessage, index) => {
                const deleteCount = (selectedConversation?.messages?.length || 0) - index;
                onSend(editedMessage, deleteCount - 1);
              }}
            />
          ) : isAppMode ? (
            // *** 2. Render App Initial Page (Dynamically) ***
            <AppInitialPage
              activeAppConfig={activeAppConfig}
              activeThemeColor={activeThemeColor}
              iconMap={iconMapForAllCards}
              activeAppId={activeAppId}
            />
          ) : (
            // *** 3. Render General Welcome Screen (if no messages and no appId) ***
            <WelcomeScreen 
              inputBoxHeight={inputBoxHeight} 
              isInputExpanded={isInputExpanded} 
              handleScrollDown={handleScrollDown} 
              setContent={setContent} 
            />
          )}
          {/* === Rendering Logic End === */ }
        </div>

        {/* 底部遮罩层 (在非欢迎界面时显示，修复条件) */}
        {!isWelcomeScreen && (
          <div 
            className="absolute bottom-0 left-0 right-[17px] z-10 h-[80px] pointer-events-none bg-gradient-to-t from-white dark:from-[#343541]"
            style={{
              backgroundImage: `linear-gradient(to top, ${
                currentTheme === 'red' ? '#F2ECBE' : 
                currentTheme === 'blue' ? '#F6F4EB' : 
                currentTheme === 'green' ? '#FAF1E4' : 
                currentTheme === 'purple' ? '#C5DFF8' : 
                currentTheme === 'brown' ? '#F4EEE0' : 
                currentTheme === 'light' ? '#FFFFFF' : 
                '#343541'
              }, transparent)` 
            }}
          ></div>
        )}

        {/* === 重构输入区渲染逻辑 START === */}
        {isMobile ? (
          // --- 移动端渲染 (始终固定底部) ---
          <div className="fixed bottom-0 left-0 right-0 w-full z-20">
            <div className="w-full"> {/* 移动端不需要宽度限制或居中容器 */}
              <ModernChatInput
                key={isWelcomeScreen ? "welcome-input-mobile" : (activeAppId !== null ? `app-${activeAppId}-mobile` : selectedConversation?.id || 'chat-mobile')}
                content={inputContentValue}
                setContent={setContent}
                stopConversationRef={stopConversationRef}
                textareaRef={textareaRef}
                onSend={(message) => { onSend(message, 0); }}
                onScrollDownClick={handleScrollDown}
                onRegenerate={isWelcomeScreen ? () => {} : (activeAppId === null ? () => { if (currentMessage) { onSend(currentMessage, 2); }} : () => {})}
                showScrollDownButton={showScrollDownButton}
                isCentered={false}
                showSidebar={showSidebar}
                isMobile={isMobile}
                handleStopConversation={handleStopConversation}
                messageIsStreaming={messageIsStreaming}
                isDisabled={isInputDisabled}
              />
            </div>
          </div>
        ) : (
          // --- 桌面端渲染 (保持原有逻辑) ---
          <>
            {!isWelcomeScreen ? (
              // 桌面端 - 对话状态输入框 (原 !isWelcomeScreen 逻辑)
          <div className="absolute bottom-0 left-0 w-full z-20">
                <div className={`w-full md:absolute md:bottom-0 md:left-0 md:right-auto ${isAppMode ? 'app-input-mode' : ''}`}> 
                <div className="w-full md:max-w-[800px] mx-auto px-0">
                  <ModernChatInput
                    key={activeAppId !== null ? `app-${activeAppId}` : selectedConversation?.id || 'chat'}
                      content={inputContentValue}
                      setContent={setContent}
                    stopConversationRef={stopConversationRef}
                    textareaRef={textareaRef}
                      onSend={(message) => { onSend(message, 0); }}
                    onScrollDownClick={handleScrollDown}
                      onRegenerate={activeAppId === null ? () => { if (currentMessage) { onSend(currentMessage, 2); }} : () => {}}
                      showScrollDownButton={showScrollDownButton}
                      isCentered={false}
                    showSidebar={showSidebar}
                    isMobile={isMobile}
                    handleStopConversation={handleStopConversation}
                      messageIsStreaming={messageIsStreaming}
                    isDisabled={isInputDisabled}
                  />
                </div>
              </div>
          </div>
            ) : (
              // 桌面端 - 欢迎状态输入框 (原 isWelcomeScreen 逻辑)
              <div className="w-full mt-8 md:static md:bottom-auto md:left-auto md:right-auto md:mt-8"> 
                  <div className="w-full md:max-w-[800px] md:mx-auto px-0 mx-0"> 
                     <div className="md:block"> 
                       <ModernChatInput 
                      key="welcome-input-desktop"
                      content={inputContentValue}
                      setContent={setContent}
                         stopConversationRef={stopConversationRef}
                         textareaRef={textareaRef}
                         onSend={(message) => { onSend(message, 0); }}
                         onScrollDownClick={handleScrollDown}
                         onRegenerate={() => { /* Welcome 不重新生成 */ }}
                         showScrollDownButton={showScrollDownButton}
                      isCentered={true}
                         showSidebar={showSidebar}
                         isMobile={isMobile}
                         handleStopConversation={handleStopConversation}
                      messageIsStreaming={messageIsStreaming}
                       isDisabled={isInputDisabled}
                       /> 
                     </div> 
                   </div> 
             </div> 
        )}
          </>
        )}
        {/* === 重构输入区渲染逻辑 END === */}
      </>
    </div>
  );
};
