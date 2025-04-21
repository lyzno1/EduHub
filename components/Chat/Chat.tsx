import { IconClearAll, IconSettings } from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
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
import difyKeysData from '@/dify_keys.json';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ModernChatInput } from './ModernChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { FunctionCards } from './FunctionCards';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { CampusAssistantAppPage } from '@/components/AppPages/CampusAssistantAppPage';
import { CourseHelperAppPage } from '@/components/AppPages/CourseHelperAppPage';
import { DeepSeekAppPage } from '@/components/AppPages/DeepSeekAppPage';
import { TeacherAppPage } from '@/components/AppPages/TeacherAppPage';

// 添加主题类型定义
type ThemeMode = 'light' | 'dark' | 'red' | 'blue' | 'green' | 'purple' | 'brown';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
  showSidebar?: boolean;
}

export const Chat = memo(({ stopConversationRef, showSidebar = false }: Props) => {
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
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);
  const [modelWaiting, setModelWaiting] = useState<boolean>(false);
  // 添加一个锁定变量，防止按钮状态在短时间内频繁变化
  const scrollButtonLockRef = useRef<boolean>(false);
  
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

  // 添加状态来跟踪输入框高度
  const [inputBoxHeight, setInputBoxHeight] = useState<number>(65);
  // 添加状态追踪输入框是否真正扩展了
  const [isInputExpanded, setIsInputExpanded] = useState<boolean>(false);
  // 添加状态追踪底部输入框的高度(用于对话模式)
  const [bottomInputHeight, setBottomInputHeight] = useState<number>(65);

  // 获取消息数量
  const messagesLength = selectedConversation?.messages?.length || 0;

  // 添加移动端检测
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // 滚动到底部的函数
  const handleScrollDown = useCallback(() => {
    if (chatContainerRef?.current) {
      // 锁定滚动按钮状态变化，防止闪烁
      scrollButtonLockRef.current = true;
      // 立即隐藏按钮
      setShowScrollDownButton(false);
      
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      
      setAutoScrollEnabled(true);
      
      // 滚动动画完成后解锁，延长时间
      setTimeout(() => {
        scrollButtonLockRef.current = false;
      }, 1000);
    }
  }, []);

  // 用于精确滚动到消息末尾的函数(使用messagesEndRef)
  const scrollDown = () => {
    if (chatContainerRef?.current && messagesEndRef.current) {
      // 锁定滚动按钮状态变化，防止闪烁
      scrollButtonLockRef.current = true;
      // 设置按钮立即隐藏
      setShowScrollDownButton(false);
      
      // 延迟滚动一小段时间，确保按钮状态已更新
      setTimeout(() => {
        // 使用messagesEndRef实现精确滚动
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
        
        setAutoScrollEnabled(true);
        
        // 滚动动画完成后解锁 - 延长锁定时间
        setTimeout(() => {
          scrollButtonLockRef.current = false;
        }, 1000);
      }, 10);
    }
  };
  
  // 使用节流减少scrollDown的调用频率
  const throttledScrollDown = useCallback(
    throttle(scrollDown, 100),
    []
  );

  // 确保组件挂载和对话切换时自动滚动到底部 - 简化为直接调用滚动函数
  useEffect(() => {
    // 如果有消息，在组件挂载或对话切换时自动滚动到底部
    if (messagesLength > 0) {
      // 简单地直接调用滚动函数
      setTimeout(() => {
        handleScrollDown();
      }, 100);
    }
  }, [selectedConversation?.id, handleScrollDown]); // 只在对话ID变化时触发

  // 添加一个useEffect来监听输入框高度的变化(初始界面)
  useEffect(() => {
    // 如果有消息或在流式生成中，不需要监听
    if (messagesLength || messageIsStreaming) {
      return;
    }
    
    // 通过MutationObserver监听data-input-height属性的变化
    const inputContainer = document.querySelector('[data-input-height]');
    if (!inputContainer) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-input-height') {
          const height = parseInt(inputContainer.getAttribute('data-input-height') || '65', 10);
          
          // 只有当高度显著变化时(至少5px)才更新状态
          if (Math.abs(height - inputBoxHeight) >= 5) {
            setInputBoxHeight(height);
            setIsInputExpanded(height > 70); // 确保只有真正扩展时才设置为true
          }
        }
      });
    });
    
    observer.observe(inputContainer, { attributes: true });
    
    return () => {
      observer.disconnect();
    };
  }, [messagesLength, messageIsStreaming, inputBoxHeight]);

  // 添加useEffect监听对话模式下底部输入框的高度变化
  useEffect(() => {
    // 只有在有消息时才监听底部输入框
    if (!messagesLength) {
      return;
    }
    
    // 查找底部输入框容器
    const bottomInputContainer = document.querySelector('.absolute.bottom-0.left-0.w-full.z-20 [data-input-height]');
    if (!bottomInputContainer) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-input-height') {
          const height = parseInt(bottomInputContainer.getAttribute('data-input-height') || '65', 10);
          
          // 只有当高度显著变化时才更新状态
          if (Math.abs(height - bottomInputHeight) >= 5) {
            setBottomInputHeight(height);
          }
        }
      });
    });
    
    observer.observe(bottomInputContainer, { attributes: true });
    
    return () => {
      observer.disconnect();
    };
  }, [messagesLength, bottomInputHeight]);

  // 优化事件监听，同时支持触摸和鼠标事件
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;
      
      const isInitialState = !selectedConversation || selectedConversation.messages.length === 0;
      const isUserInteracting = document.body.classList.contains('user-is-interacting');
      
      if (scrollPosition > 100 && !scrollButtonLockRef.current && !isUserInteracting) {
        setAutoScrollEnabled(false);
        if (!isInitialState) {
          setShowScrollDownButton(true);
        } else {
          setShowScrollDownButton(false);
        }
      } else if (scrollPosition <= 100 && !isUserInteracting) {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    };
    
    // 统一处理用户交互事件
    const handleInteractionStart = () => {
      document.body.classList.add('user-is-interacting');
    };
    
    const handleInteractionEnd = () => {
      document.body.classList.remove('user-is-interacting');
      handleScroll();
    };
    
    const container = chatContainerRef.current;
    
    // 移动端触摸事件
    container.addEventListener('touchstart', handleInteractionStart, { passive: true });
    container.addEventListener('touchend', handleInteractionEnd, { passive: true });
    
    // 桌面端鼠标事件
    container.addEventListener('mousedown', handleInteractionStart);
    container.addEventListener('mouseup', handleInteractionEnd);
    
    // 滚动事件
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleInteractionStart);
      container.removeEventListener('touchend', handleInteractionEnd);
      container.removeEventListener('mousedown', handleInteractionStart);
      container.removeEventListener('mouseup', handleInteractionEnd);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [chatContainerRef, messagesLength]);

  // 优化消息流更新
  useEffect(() => {
    if (!selectedConversation?.messages || !autoScrollEnabled) return;
    
    const lastMessage = selectedConversation.messages[selectedConversation.messages.length - 1];
    if (!lastMessage) return;
    
    const updateScroll = () => {
      if (!chatContainerRef.current || !autoScrollEnabled) return;
      
      const shouldScroll = !document.body.classList.contains('user-is-interacting');
      if (shouldScroll) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };
    
    // 使用 requestAnimationFrame 优化滚动性能
    if (lastMessage.content) {
      requestAnimationFrame(updateScroll);
    }
  }, [selectedConversation?.messages, autoScrollEnabled]);

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
      console.log('[Chat] 检测到 cardInputPrompt 变化，设置输入框内容为:', cardInputPrompt);
      setContent(cardInputPrompt);
    }
  }, [cardInputPrompt]);

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
        // --- 确定API URL和Key基于appId ---
        let targetApiUrl = process.env.NEXT_PUBLIC_DIFY_API_URL || '/api/dify'; // 默认全局URL
        let targetApiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || ''; // 默认全局Key

        if (appConfig) {
          console.log(`[Card Send] Using App Config for appId: ${currentActiveAppId}`);
          targetApiKey = appConfig.apiKey;
          if (appConfig.apiUrl) {
            targetApiUrl = appConfig.apiUrl;
          }
        }

        console.log(`[Card Send] Final Dify Config - URL: ${targetApiUrl}, Key Used: ${targetApiKey ? 'Yes' : 'No'}`);

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
              console.log(`[Card Send Stream] Received/Confirmed Dify Conversation ID: ${conversationIdFromStream}`);
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

          if (autoScrollEnabled) {
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 50);
          }
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
          console.log('[Card Send Stream] Message processing complete');
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

          console.log('[Card Send Complete] Conversation saved:', finalConversationToSave.id, finalConversationToSave.name);
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
      // --- Start modification: Determine API URL and Key based on appId ---
      const currentAppId = selectedConversation.appId;
      let targetApiUrl = process.env.NEXT_PUBLIC_DIFY_API_URL || '/api/dify'; // Default global URL (or reverse proxy)
      let targetApiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || ''; // Default global Key

      if (currentAppId !== null && currentAppId !== undefined && appConfigs && appConfigs[currentAppId]) {
        const appConfig = appConfigs[currentAppId];
        console.log(`[Chat Send] Detected App Conversation (appId: ${currentAppId}). Using App Config:`, appConfig);
        targetApiKey = appConfig.apiKey;
        if (appConfig.apiUrl) {
          targetApiUrl = appConfig.apiUrl;
        }
        // If the app doesn't specify apiUrl, continue using the global default apiUrl
      } else {
        console.log(`[Chat Send] Detected Normal Conversation or App Config not found (appId: ${currentAppId}). Using Global Config.`);
      }

      console.log(`[Chat Send] Final Dify Config - URL: ${targetApiUrl}, Key Used: ${targetApiKey ? 'Yes' : 'No'}`);

      const difyClient = new DifyClient({
        apiUrl: targetApiUrl, // Use the finally determined URL
        debug: true
      });

      let conversationId = selectedConversation.conversationID || '';
      // --- End modification ---
      
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

      // --- Modification: Use the finally determined Key to call Dify API ---
      const chatStream = await difyClient.createChatStream({
        query: message.content,
        key: targetApiKey, // Use the finally determined Key
        user: user || 'unknown',
        conversationId, 
        inputs: {},
        autoGenerateName: selectedConversation.messages.length > 1 
      });
      // --- End modification ---

      // 保存 chatStream 引用以便可以中止
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

        // --- Modification: Title generation also needs to use the correct API Key ---
        const isPotentiallyNewConversationResponse = currentMessages.length === 2;

        // 1. Ensure conversationId is updated if received
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

        // 2. Trigger title generation ONLY if it's the first response, ID is confirmed, and not initiated yet
          if (isPotentiallyNewConversationResponse && !titleGenerationInitiated.current) {
            // Check again if conversationId is now valid before proceeding
            if (conversationId) {
            titleGenerationInitiated.current = true;
                // console.log(`[Parallel] Conversation ID (${conversationId}) confirmed for new convo. Starting title generation...`);

                // Determine API Key and URL here (ensure context is correct or pass necessary values)
                const titleApiUrl = targetApiUrl; // Reuse the URL determined for main chat
                const titleApiKey = targetApiKey; // Reuse the Key determined for main chat
                const titleUser = user || 'unknown'; // Get user from onSend context

            titlePromise.current = (async () => {
              try {
                    // console.log(`[Debug] Title Gen (onMessage) - Using titleApiUrl: ${titleApiUrl}`);
                    // console.log(`[Debug] Title Gen (onMessage) - Using titleApiKey is empty: ${titleApiKey === ''}`);

                const titleDifyClient = new DifyClient({
                  apiUrl: titleApiUrl,
                  debug: true
                });
                const generatedName = await titleDifyClient.generateConversationName(
                      conversationId, // Use the confirmed ID
                  titleApiKey,
                      titleUser
                );
                    console.log('[Parallel] Parallel title generation successful:', generatedName);
                return generatedName || null;
              } catch (error) {
                    console.error('[Parallel] Parallel title generation failed:', error);
                return null;
              }
            })();
            } else {
                console.warn('[Title Gen] Could not initiate title generation because conversationId is still missing after stream update.');
          }
        }
        // --- End title generation logic modification ---
        
        const streamUpdatedConversation = {
          ...updatedConversation,
          messages: currentMessages, // Use the locally updated messages
          conversationID: conversationId // Ensure conversationID is updated
        };
        
        homeDispatch({
          field: 'selectedConversation',
          value: streamUpdatedConversation
        });
        
        if (autoScrollEnabled) {
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 50);
        }
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
        console.log('Message processing complete');
        
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

        console.log('Conversation saved:', finalConversation.id, finalConversation.name);

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
  useEffect(() => {
    // 仅在消息流动结束且autoscroll启用时，确保滚动到底部
    if (!messageIsStreaming && autoScrollEnabled) {
      handleScrollDown();
    }
  }, [messageIsStreaming, autoScrollEnabled, handleScrollDown]);

  // 简化确保在新消息时的滚动行为
  useEffect(() => {
    // 只有当新消息到达且autoscroll启用时才滚动，但在模型生成过程中不滚动
    if (selectedConversation?.messages && autoScrollEnabled && !messageIsStreaming) {
      setTimeout(handleScrollDown, 100);
    }
  }, [selectedConversation?.messages, handleScrollDown, autoScrollEnabled, messageIsStreaming]);

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

  // --- handleStopConversation (Keep API call commented out) --- 
  const handleStopConversation = async () => { 
    console.log('停止按钮被点击，中止生成');
    stopConversationRef.current = true;
    homeDispatch({ field: 'messageIsStreaming', value: false });
    setModelWaiting(false);

    // 使用 chatStreamRef 中止当前流请求
    if (chatStreamRef.current) {
      try {
        chatStreamRef.current.abort();
      } catch (error) {
        console.error('中止流请求时发生错误:', error);
      }
      // 清除引用
      chatStreamRef.current = null;
    }

    // --- Call Dify Stop API ---
    if (currentTaskId) {
      try {
        // 获取当前对话的API Key和URL
        const currentAppId = selectedConversation?.appId;
        let targetApiUrl = process.env.NEXT_PUBLIC_DIFY_API_URL || '/api/dify';
        let targetApiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';

        if (currentAppId !== null && currentAppId !== undefined && appConfigs && appConfigs[currentAppId]) {
          const appConfig = appConfigs[currentAppId];
          targetApiKey = appConfig.apiKey;
          if (appConfig.apiUrl) {
            targetApiUrl = appConfig.apiUrl;
          }
        }

        // 创建新的DifyClient实例并调用停止API
        const difyClient = new DifyClient({
          apiUrl: targetApiUrl,
          debug: false
        });

        const result = await difyClient.stopChatStream(
          currentTaskId,
          targetApiKey,
          user || 'unknown'
        );
      } catch (error) {
        console.error('调用停止API时发生错误:', error);
      }
      // 清除任务ID
      setCurrentTaskId(null);
    }
    // --- END Call Dify Stop API ---

    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
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
          {messagesLength > 0 ? (
            // *** 1. Render Chat Messages (if messages exist) ***
            <div className="flex-1 overflow-y-auto">
              <div className="md:pt-6 pt-2">
                {/* Optional settings display */} 
                {showSettings && ( 
                  <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                    <div className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                    </div>
                  </div>
                )}

                {/* Message list */} 
                {selectedConversation?.messages?.map((message, index) => (
                  <MemoizedChatMessage
                    key={message.id || index}
                    message={message}
                    messageIndex={index}
                    onEdit={(editedMessage) => {
                      // Logic to handle message editing 
                      const deleteCount = (selectedConversation?.messages?.length || 0) - index;
                      onSend(editedMessage, deleteCount - 1);
                    }}
                    lightMode={currentTheme}
                     // Pass streaming/waiting state only to the last message 
                    isStreaming={index === messagesLength - 1 && messageIsStreaming}
                    isWaiting={index === messagesLength - 1 && modelWaiting}
                    userAvatar={user?.length === 8 ? "/teacher-avatar.png" : "/student-avatar.png"}
                    assistantAvatar="/logon.png"
                  />
                ))}

                 {/* Loading indicator */} 
                {<ChatLoader messageIsStreaming={messageIsStreaming} modelWaiting={modelWaiting} />}

                 {/* Bottom spacer for scrolling */} 
                <div  
                  style={{ height: `${bottomInputHeight + 60}px`, transition: 'none' }}  
                  ref={messagesEndRef}  
                />
              </div>
            </div>
          ) : isAppMode ? (
            // *** 2. Render App Initial Page (if no messages and appId exists) ***
            <div className="flex-1 overflow-auto p-4 h-full"> 
              {activeAppId === 1 && <DeepSeekAppPage />} 
              {activeAppId === 2 && <CourseHelperAppPage inputBoxHeight={inputBoxHeight} isInputExpanded={isInputExpanded} />} 
              {activeAppId === 3 && <CampusAssistantAppPage inputBoxHeight={inputBoxHeight} isInputExpanded={isInputExpanded} />} 
              {activeAppId === 4 && <TeacherAppPage inputBoxHeight={inputBoxHeight} isInputExpanded={isInputExpanded} />} 
            </div>
          ) : (
            // *** 3. Render General Welcome Screen (if no messages and no appId) ***
              <div className="flex flex-col items-center justify-center h-full md:min-h-screen sm:overflow-hidden">
              {/* Title Area */} 
                <div className="flex flex-col items-center text-center max-w-3xl w-full px-4 sm:px-8 welcome-text welcome-text-container"
                  style={{
                    /* Dynamic margin based on input expansion */ 
                    marginTop: !isInputExpanded
                      ? window.innerWidth < 768 ? '-20vh' : '-25vh'
                      : window.innerWidth < 768
                        ? `calc(-22vh - ${(inputBoxHeight - 65)}px)`
                        : `calc(-27vh - ${(inputBoxHeight - 65)}px)`
                  }}
                >
                 {/* Logo and Title */} 
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#CEFBFA] to-[#FCCD5E] rounded-lg blur-xl opacity-75 dark:opacity-60"></div>
                    <h1 className="relative text-4xl font-bold tracking-tight mb-4 md:mb-4 bg-gradient-to-r from-[#272727] to-[#696969] dark:from-[#CEFBFA] dark:to-[#FCCD5E] bg-clip-text text-transparent drop-shadow-sm welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '-0.5px' }}>eduhub.chat</h1>
                  </div>
                  <p className="text-lg font-medium md:mb-20 mb-0 md:block hidden text-[#333333] dark:text-[hsl(205deg,16%,77%)] welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.2px' }}>基于大语言模型的智能知识助手</p>
                </div>
                
               {/* Mobile specific content */} 
                <div className="md:hidden flex flex-col items-center justify-center mt-12 static">
                 {/* Guide text */} 
                  <div className="max-w-md mx-auto px-4 text-center mb-6">
                    <p className="text-lg text-[#666666] dark:text-[#A0AEC0] font-medium welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.1px' }}>
                      有什么可以帮到你？
                    </p>
                  </div>
                  {/* Function cards */} 
                  <div className="w-full px-0">
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                      <FunctionCards scrollToBottom={handleScrollDown} setContent={setContent} />
                    </div>
                  </div>
                </div>
                
               {/* Desktop function cards area */} 
                <div className="w-full absolute bottom-[18vh] px-4 hidden md:block"
                  style={{
                    /* Dynamic bottom position based on input expansion */ 
                    bottom: !isInputExpanded
                      ? '18vh'
                      : `calc(18vh - ${(inputBoxHeight - 65) / 2}px)`,
                    transition: 'none' 
                  }}
                >
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <FunctionCards scrollToBottom={handleScrollDown} setContent={setContent} />
                  </div>
                    </div>
                  </div>
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
                // 移动端欢迎界面不重新生成
                onRegenerate={isWelcomeScreen ? () => {} : (activeAppId === null ? () => { if (currentMessage) { onSend(currentMessage, 2); }} : () => {})}
                // 移动端欢迎界面不显示滚动按钮
                showScrollDownButton={!isWelcomeScreen && activeAppId === null && showScrollDownButton}
                isCentered={false} // 移动端输入框永远不居中
                showSidebar={showSidebar}
                isMobile={isMobile}
                handleStopConversation={handleStopConversation}
                messageIsStreaming={messageIsStreaming}
                isDisabled={isInputDisabled} // <-- 添加 isDisabled prop
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
                      showScrollDownButton={activeAppId === null && showScrollDownButton}
                      isCentered={false}
                    showSidebar={showSidebar}
                    isMobile={isMobile}
                    handleStopConversation={handleStopConversation}
                      messageIsStreaming={messageIsStreaming}
                    isDisabled={isInputDisabled} // <-- 添加 isDisabled prop
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
                         showScrollDownButton={false}
                      isCentered={true} // 桌面欢迎居中
                         showSidebar={showSidebar}
                         isMobile={isMobile}
                         handleStopConversation={handleStopConversation}
                      messageIsStreaming={messageIsStreaming}
                       isDisabled={isInputDisabled} // <-- 添加 isDisabled prop
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
});
Chat.displayName = 'Chat';
