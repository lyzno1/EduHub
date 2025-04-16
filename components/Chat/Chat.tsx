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

import { useTranslation } from 'next-i18next';

import { getEndpoint, getDifyClient } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation } from '@/types/chat';
import { Plugin } from '@/types/plugin';
import { Message } from '@/services/dify/types';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ModernChatInput } from './ModernChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { FunctionCards } from './FunctionCards';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { streamDifyChat } from '@/services/useApiService';
import { DifyClient } from '../../services/dify/client';
import { API_PATHS } from '@/services/dify/constants';

// 添加主题类型定义
type ThemeMode = 'light' | 'dark' | 'red' | 'blue' | 'green' | 'purple' | 'brown';

// --- 导入应用页面组件 ---
import { CampusAssistantAppPage } from '@/components/AppPages/CampusAssistantAppPage';
import { CourseHelperAppPage } from '@/components/AppPages/CourseHelperAppPage';
import { DeepSeekAppPage } from '@/components/AppPages/DeepSeekAppPage';
import { TeacherAppPage } from '@/components/AppPages/TeacherAppPage';
// --- END 导入 ---

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
  showSidebar?: boolean;
}

export const Chat = memo(({ stopConversationRef, showSidebar = false }: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      conversations,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      modelError,
      loading,
      prompts,
      user,
      lightMode,
      activeAppId,
      messageIsStreaming,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
    startConversationFromActiveApp,
  } = useContext(HomeContext);

  // 类型断言确保 lightMode 的类型正确
  const currentTheme = lightMode as ThemeMode;

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
  }, [selectedConversation]);

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

  const onSend = async (message: Message, deleteCount = 0) => {
    if (!selectedConversation) return;
    
    // --- ADD Reset title generation flags for this send operation ---
    titleGenerationInitiated.current = false;
    titlePromise.current = null;
    // --- END ADD ---

    try {
      const difyClient = new DifyClient({
        apiUrl: process.env.NEXT_PUBLIC_DIFY_API_URL,
        debug: true
      });

      const apiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';
      
      // 重要：使用selectedConversation中的id作为对话ID
      // 如果conversationID为空，则保持为空，让API生成新的ID
      // 这样确保新建对话时的ID与发送消息时使用的ID一致
      let conversationId = selectedConversation.conversationID || '';
      // 使用状态变量，而不是临时检测，确保一致性
      // const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      console.log('对话ID信息:', {
        conversationId: conversationId,
        selectedConversationId: selectedConversation.id,
        messages: selectedConversation.messages.length
      });

      // 添加用户消息到对话
      const updatedMessages = [...selectedConversation.messages];
      if (deleteCount) {
        updatedMessages.splice(-deleteCount);
      }
      updatedMessages.push(message);
      
      // 添加一个空的助手消息用于流式输出
      updatedMessages.push({
        role: 'assistant',
        content: ''
      });
      
      const updatedConversation = {
        ...selectedConversation,
        messages: updatedMessages
      };
      
      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation
      });

      // 无论是移动端还是电脑端，都统一设置状态，确保显示黑点
      // console.log('设置等待状态: messageIsStreaming=true, modelWaiting=true');
      homeDispatch({ field: 'messageIsStreaming', value: true });
      setModelWaiting(true);
      
      // 强制滚动到底部，确保用户消息可见
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 50);

      // 使用统一的消息处理逻辑
      const chatStream = await difyClient.createChatStream({
        query: message.content,
        key: apiKey,
        user: user || 'unknown',
        conversationId, // 使用已存在的conversationId或空字符串
        inputs: {},
        // 判断是否是第一次发送消息，如果是则设置auto_generate_name为false
        // 因为我们会使用异步方式生成标题
        autoGenerateName: selectedConversation.messages.length > 1 // 仅非首次发送消息时使用自动生成标题
      });

      let fullResponse = '';
      // --- ADD local halt flag ---
      let isStreamHalted = false;
      // --- END ADD ---

      chatStream.onMessage((chunk: string) => {
        // --- MODIFY stop logic ---
        // First, check if this stream has already been halted permanently
        if (isStreamHalted) {
          return;
        }
        // Then, check the trigger ref from the stop button
        if (stopConversationRef.current) {
          console.log('Stop signal detected inside onMessage. Halting stream permanently for this request.');
          isStreamHalted = true; // Set the permanent halt flag for this specific stream
          // UI state should already be updated by handleStopConversation for immediate feedback
          // Optional: Attempt to close the underlying stream if possible
          // if (chatStream.close) chatStream.close();
          return; // Stop processing this chunk
        }
        // --- END MODIFY ---

        // Original logic starts here
        homeDispatch({ field: 'messageIsStreaming', value: true }); // Ensure state is correct on first valid chunk
        setModelWaiting(false); // Turn off the waiting indicator once we get data
        // console.log('接收到模型响应，设置modelWaiting=false');
        
        const updatedMessages = [...updatedConversation.messages];
        
        // 添加细粒度的处理，确保即使是很小的chunk也能即时显示
        fullResponse += chunk;
        
        // 更新助手消息（最后一条消息）
        const assistantMessageIndex = updatedMessages.length - 1;
        updatedMessages[assistantMessageIndex] = {
          role: 'assistant',
          content: fullResponse
        };
        
        // 保存后端返回的conversationId，并更新全局状态
        if (chatStream.conversationId && (!conversationId || conversationId === '')) {
          // --- 新增日志记录点 ---
          console.log(`[Dify] 收到新对话的 Conversation ID: ${chatStream.conversationId}`); 
          // ----------------------
          
          const newConversationId = chatStream.conversationId;
          conversationId = newConversationId; // Update local variable

          // 同时立即更新所有对话列表中的相应对话ID
          const updatedConversationsWithId = conversations.map(conv =>
            conv.id === selectedConversation.id
              ? { ...conv, conversationID: newConversationId }
              : conv
          );
          homeDispatch({
            field: 'conversations',
            value: updatedConversationsWithId
          });
          saveConversations(updatedConversationsWithId);

          // --- Start Parallel Title Generation ONLY when ID is first confirmed AND it's a new convo response ---
          // Check if this is the first response phase (user msg + assistant msg)
          const isPotentiallyNewConversationResponse = updatedMessages.length === 2;
          if (isPotentiallyNewConversationResponse && !titleGenerationInitiated.current) {
            titleGenerationInitiated.current = true;
            console.log(`[Parallel] Conversation ID (${newConversationId}) confirmed for new convo. Starting title generation...`);

            titlePromise.current = (async () => {
              try {
                // Use a separate client instance or ensure thread-safety if reusing
                const titleDifyClient = new DifyClient({
                  apiUrl: process.env.NEXT_PUBLIC_DIFY_API_URL,
                  debug: true // Set to false in production
                });
                const titleApiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';
                const generatedName = await titleDifyClient.generateConversationName(
                  newConversationId, // Use the confirmed ID from the stream
                  titleApiKey,
                  user || 'unknown'
                );
                console.log('[Parallel] 并行生成对话标题成功:', generatedName);
                return generatedName || null; // Return null if empty/falsy
              } catch (error) {
                console.error('[Parallel] 并行生成对话标题失败:', error);
                return null; // Return null on error to indicate failure
              }
            })();
          }
          // --- End Parallel Title Generation Trigger ---
        }
        
        const streamUpdatedConversation = {
          ...updatedConversation,
          messages: updatedMessages,
          conversationID: conversationId
        };
        
        // 使用非批量更新方式，确保每个字符都能立即显示
        homeDispatch({
          field: 'selectedConversation',
          value: streamUpdatedConversation
        });
        
        // 如果是第一个chunk，强制滚动到底部
        if (fullResponse.length <= chunk.length) {
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 50);
        }
      });

      chatStream.onError((error: Error) => {
        // --- ADD halt check ---
        if (isStreamHalted) {
          console.log('Stream was halted, ignoring error callback.');
          return;
        }
        // --- END ADD ---
        // Optional: Check stop signal at the beginning (redundant if handleStopConversation sets state)
        // if (stopConversationRef.current) {
        //    console.log('Stop signal detected inside onError. Skipping error handling actions.');
        //    return;
        // }
        console.error('处理消息时错误:', error);
        homeDispatch({ field: 'messageIsStreaming', value: false });
        setModelWaiting(false);
        
        // 如果是会话不存在的错误，清除会话ID并重试
        if (error.message.includes('Conversation Not Exists')) {
          const resetConversation = {
            ...selectedConversation,
            conversationID: ''
          };
          homeDispatch({
            field: 'selectedConversation',
            value: resetConversation
          });
          // 重新发送消息
          onSend(message, deleteCount);
          return;
        }
        
        toast.error(error.message);
      });

      chatStream.onComplete(() => {
        // --- ADD halt check --- FIRST!
        if (isStreamHalted) {
          console.log('Stream was halted, skipping title generation and final updates.');
          return;
        }
        // --- END ADD ---

        console.log('消息处理已完成');
        
        // 所有消息处理完成后，重置流状态
        homeDispatch({ field: 'messageIsStreaming', value: false });
        setModelWaiting(false);
        
        // 将最终结果保存到对话列表中
        const updatedMessages = [...updatedConversation.messages];
        
        // 确保最后一条消息是助手消息且内容正确
        const lastMessageIndex = updatedMessages.length - 1;
        if (updatedMessages[lastMessageIndex].role === 'assistant') {
          updatedMessages[lastMessageIndex].content = fullResponse;
        }
        
        const finalConversation = {
          ...updatedConversation,
          messages: updatedMessages,
          conversationID: conversationId
        };
        
        homeDispatch({
          field: 'selectedConversation',
          value: finalConversation
        });
        
        saveConversation(finalConversation);
        
        // 判断是否是新建的对话（第一条消息发送后）
        // 通过检查消息数量判断是否是首次对话（仅用户消息+AI回复共2条）
        const isNewConversation = updatedMessages.length === 2;
        
        // 如果是新对话且标题生成已启动，则处理结果
        // --- MODIFY Title Generation Logic ---
        if (isNewConversation && titleGenerationInitiated.current && titlePromise.current) {
          console.log('检测到新对话完成，开始处理已启动的标题生成...');

          // --- ADD Placeholder Title Update (Keep existing logic) ---
          const placeholderTitle = "正在生成标题...";
          const conversationWithPlaceholder = {
            ...finalConversation,
            name: placeholderTitle
          };
          // Update conversation list immediately with placeholder
          const updatedConversationsWithPlaceholder = conversations.map(conv =>
            conv.id === conversationWithPlaceholder.id ? conversationWithPlaceholder : conv
          );
          homeDispatch({ field: 'conversations', value: updatedConversationsWithPlaceholder });
          saveConversations(updatedConversationsWithPlaceholder);
          // --- END ADD ---

          // Start an IIFE to handle the promise resolution and UI update
          (async () => {
            try {
              // Wait for the parallel generation promise to resolve
              console.log("等待并行标题生成结果...");
              const generatedName = await titlePromise.current;
              console.log('并行标题生成结果:', generatedName);

              // --- MODIFY Check for empty/nullish result ---
              if (generatedName) {
                // Title generation successful and has content
                // 设置标题动画正在进行中
                setTitleAnimationInProgress(true);
                setCurrentDisplayTitle('');

                // 清除可能存在的旧计时器
                if (titleIntervalRef.current) {
                  clearInterval(titleIntervalRef.current);
                }

                // 创建带有打字效果的对话，存储在全局状态中
                const targetTitle = generatedName;
                let currentIndex = 0;

                // 使用setInterval创建稳定的打字效果，更快的速度
                titleIntervalRef.current = setInterval(() => {
                  // 增加字符
                  currentIndex++;

                  // 构建当前显示的标题
                  const displayTitle = targetTitle.substring(0, currentIndex);
                  setCurrentDisplayTitle(displayTitle);

                  // 创建一个包含当前显示标题的对话对象
                  const conversationWithPartialName = {
                    ...finalConversation,
                    name: displayTitle
                  };

                  // --- MODIFY State Updates ---
                  // Update ONLY the list, NOT selectedConversation directly
                  const updatedConversationsWithPartialName = conversations.map(conv =>
                    conv.id === conversationWithPartialName.id ? conversationWithPartialName : conv
                  );
                  homeDispatch({
                    field: 'conversations',
                    value: updatedConversationsWithPartialName
                  });
                  // REMOVED: homeDispatch({ field: 'selectedConversation', value: conversationWithPartialName });
                  // --- END MODIFY ---

                  // 当所有字符显示完成后
                  if (currentIndex >= targetTitle.length) {
                    // 清除计时器
                    if (titleIntervalRef.current) {
                      clearInterval(titleIntervalRef.current);
                      titleIntervalRef.current = null;
                    }

                    // 设置标题动画完成
                    setTitleAnimationInProgress(false);

                    // 确保最终标题正确显示
                    const finalConversationWithName = {
                      ...finalConversation,
                      name: targetTitle
                    };

                    // --- MODIFY Final State Updates ---
                    // Update ONLY the list finally, NOT selectedConversation
                    const finalUpdatedConversations = conversations.map(conv =>
                      conv.id === finalConversationWithName.id ? finalConversationWithName : conv
                    );
                    homeDispatch({
                      field: 'conversations',
                      value: finalUpdatedConversations
                    });
                    // REMOVED: homeDispatch({ field: 'selectedConversation', value: finalConversationWithName });

                    // 保存到本地存储 (Keep saving both list and individual)
                    saveConversation(finalConversationWithName);
                    saveConversations(finalUpdatedConversations);
                    // --- END MODIFY ---
                  }
                }, 30); // Use faster typing speed (e.g., 30ms)

              } else {
                // Title generation succeeded (or failed returning null) but result is empty/nullish
                console.log('并行生成标题成功但结果为空或失败，设置备选标题。');
                setTitleAnimationInProgress(false); // Ensure animation state is reset

                // --- ADD Fallback Title Logic (Keep existing logic) ---
                const userFirstMessage = finalConversation?.messages?.[0]?.content;
                const fallbackTitle = userFirstMessage
                  ? userFirstMessage.substring(0, 20) + (userFirstMessage.length > 20 ? '...' : '')
                  : "未命名对话";

                console.log(`设置备选标题: "${fallbackTitle}"`);

                const conversationWithFallbackTitle = {
                  ...finalConversation,
                  name: fallbackTitle,
                };

                const updatedConversationsWithFallback = conversations.map(conv =>
                  conv.id === conversationWithFallbackTitle.id ? conversationWithFallbackTitle : conv
                );
                homeDispatch({
                  field: 'conversations',
                  value: updatedConversationsWithFallback
                });

                saveConversation(conversationWithFallbackTitle);
                saveConversations(updatedConversationsWithFallback);
                // --- END ADD ---
              }
            } catch (error) {
              // This catch block now primarily handles errors from awaiting the promise itself,
              // though the inner async function also has its own catch.
              console.error('处理并行标题生成结果时出错:', error);
              setTitleAnimationInProgress(false);

              // --- ADD Fallback Title Logic (Keep existing logic) ---
              const userFirstMessage = finalConversation?.messages?.[0]?.content;
              const fallbackTitle = userFirstMessage
                ? userFirstMessage.substring(0, 20) + (userFirstMessage.length > 20 ? '...' : '')
                : "未命名对话";

              console.log(`处理结果出错，设置为备选标题: "${fallbackTitle}"`);

              const conversationWithFallbackTitle = {
                ...finalConversation,
                name: fallbackTitle,
              };

              const updatedConversationsWithFallback = conversations.map(conv =>
                conv.id === conversationWithFallbackTitle.id ? conversationWithFallbackTitle : conv
              );
              homeDispatch({
                field: 'conversations',
                value: updatedConversationsWithFallback
              });

              saveConversation(conversationWithFallbackTitle);
              saveConversations(updatedConversationsWithFallback);
              // --- END ADD ---
            }
          })();
        } else if (isNewConversation && conversationId) {
          // Fallback for the original logic if parallel generation somehow wasn't triggered
          // (This part might be removed if confident in the parallel trigger)
          console.log('[Fallback] 开始原始的异步生成对话标题...');
          // --- Existing logic from before parallel implementation ---
          const placeholderTitle = "正在生成标题...";
          const conversationWithPlaceholder = {
            ...finalConversation,
            name: placeholderTitle
          };
          // Update conversation list immediately with placeholder
          const updatedConversationsWithPlaceholder = conversations.map(conv =>
            conv.id === conversationWithPlaceholder.id ? conversationWithPlaceholder : conv
          );
          homeDispatch({ field: 'conversations', value: updatedConversationsWithPlaceholder });
          saveConversations(updatedConversationsWithPlaceholder);

          (async () => {
            try {
              const difyClient = new DifyClient({
                apiUrl: process.env.NEXT_PUBLIC_DIFY_API_URL,
                debug: true
              });

              const apiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';
              const generatedName = await difyClient.generateConversationName(
                conversationId,
                apiKey,
                user || 'unknown'
              );

              console.log('成功生成对话标题:', generatedName);

              // --- MODIFY Check for empty/nullish result ---
              if (generatedName) {
                // Title generation successful and has content
                setTitleAnimationInProgress(true);
                setCurrentDisplayTitle('');

                if (titleIntervalRef.current) {
                  clearInterval(titleIntervalRef.current);
                }

                const targetTitle = generatedName;
                let currentIndex = 0;

                titleIntervalRef.current = setInterval(() => {
                  currentIndex++;
                  const displayTitle = targetTitle.substring(0, currentIndex);
                  setCurrentDisplayTitle(displayTitle);

                  const conversationWithPartialName = {
                    ...finalConversation,
                    name: displayTitle
                  };

                  const updatedConversationsWithPartialName = conversations.map(conv =>
                    conv.id === conversationWithPartialName.id ? conversationWithPartialName : conv
                  );
                  homeDispatch({
                    field: 'conversations',
                    value: updatedConversationsWithPartialName
                  });

                  if (currentIndex >= targetTitle.length) {
                    if (titleIntervalRef.current) {
                      clearInterval(titleIntervalRef.current);
                      titleIntervalRef.current = null;
                    }
                    setTitleAnimationInProgress(false);

                    const finalConversationWithName = {
                      ...finalConversation,
                      name: targetTitle
                    };

                    const finalUpdatedConversations = conversations.map(conv =>
                      conv.id === finalConversationWithName.id ? finalConversationWithName : conv
                    );
                    homeDispatch({
                      field: 'conversations',
                      value: finalUpdatedConversations
                    });

                    saveConversation(finalConversationWithName);
                    saveConversations(finalUpdatedConversations);
                  }
                }, 30);
              } else {
                // Title generation succeeded but returned empty/nullish value
                console.log('生成标题成功，但结果为空，设置备选标题。');
                setTitleAnimationInProgress(false);

                const userFirstMessage = finalConversation?.messages?.[0]?.content;
                const fallbackTitle = userFirstMessage
                  ? userFirstMessage.substring(0, 20) + (userFirstMessage.length > 20 ? '...' : '')
                  : "未命名对话";

                console.log(`设置备选标题: "${fallbackTitle}"`);

                const conversationWithFallbackTitle = {
                  ...finalConversation,
                  name: fallbackTitle,
                };

                const updatedConversationsWithFallback = conversations.map(conv =>
                  conv.id === conversationWithFallbackTitle.id ? conversationWithFallbackTitle : conv
                );
                homeDispatch({
                  field: 'conversations',
                  value: updatedConversationsWithFallback
                });

                saveConversation(conversationWithFallbackTitle);
                saveConversations(updatedConversationsWithFallback);
              }
            } catch (error) {
              // Handle API call errors
              console.error('生成对话标题失败 (API Error):', error);
              setTitleAnimationInProgress(false);

              const userFirstMessage = finalConversation?.messages?.[0]?.content;
              const fallbackTitle = userFirstMessage
                ? userFirstMessage.substring(0, 20) + (userFirstMessage.length > 20 ? '...' : '')
                : "未命名对话";

              console.log(`生成标题失败，设置为备选标题: "${fallbackTitle}"`);

              const conversationWithFallbackTitle = {
                ...finalConversation,
                name: fallbackTitle,
              };

              const updatedConversationsWithFallback = conversations.map(conv =>
                conv.id === conversationWithFallbackTitle.id ? conversationWithFallbackTitle : conv
              );
              homeDispatch({
                field: 'conversations',
                value: updatedConversationsWithFallback
              });

              saveConversation(conversationWithFallbackTitle);
              saveConversations(updatedConversationsWithFallback);
            }
          })();
        }
        // --- END MODIFY ---
      });

    } catch (error) {
      console.error('处理消息时错误:', error);
      homeDispatch({ field: 'messageIsStreaming', value: false });
      toast.error(error instanceof Error ? error.message : '发送消息失败');
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

  // --- MODIFY handleStopConversation --- (Restore immediate state update for UX)
  const handleStopConversation = () => {
    console.log('Stop button clicked, setting stopConversationRef to true and updating UI state.');
    stopConversationRef.current = true;
    // Immediately update state for instant UI feedback
    homeDispatch({ field: 'messageIsStreaming', value: false });
    setModelWaiting(false);

    // --- ADD Saving Logic ---
    // Save the current state immediately when stopping
    if (selectedConversation) {
      // Get the most recent state directly (assuming context updates are reasonably fast)
      const conversationToSave = { ...selectedConversation }; 
      
      // Ensure the last message (potentially partial assistant response) is included
      // Note: The state might not capture the *absolute* last chunk if clicked extremely fast,
      // but this captures the state at the time of the click event.
      
      saveConversation(conversationToSave);

      // Update the conversations list as well
      const updatedConversations = conversations.map(conv =>
        conv.id === conversationToSave.id ? conversationToSave : conv
      );
      // Use homeDispatch directly as it's available in the component scope
      homeDispatch({ field: 'conversations', value: updatedConversations }); 
      saveConversations(updatedConversations);
      console.log('Conversation state saved upon stopping.');
    }
    // --- END ADD ---

    setTimeout(() => {
      stopConversationRef.current = false;
      console.log('Resetting stopConversationRef to false after timeout.');
    }, 1000); // Timeout remains to allow the next send operation
  };
  // --- END MODIFY ---

  // 监听自定义事件，当对话被停止时重置状态 (This useEffect might be redundant now, consider removing later)
  useEffect(() => {
    const handleStopConversationEvent = () => {
      setModelWaiting(false);
      homeDispatch({ field: 'messageIsStreaming', value: false });
    };
    
    // 添加自定义事件监听器
    document.addEventListener('chatStopConversation', handleStopConversationEvent);
    
    return () => {
      document.removeEventListener('chatStopConversation', handleStopConversationEvent);
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

  const isWelcomeScreen = activeAppId === null && !messagesLength;
  const isStandardChat = activeAppId === null && messagesLength > 0;
  const isAppMode = activeAppId !== null;

  return (
    <div
      className={`relative flex-1 flex flex-col overflow-y-auto bg-white dark:bg-[#343541] ${
        currentTheme === 'red'
          ? 'bg-[#F2ECBE]'
          : currentTheme === 'blue'
          ? 'bg-[#F6F4EB]'
          : currentTheme === 'green'
          ? 'bg-[#FAF1E4]'
          : currentTheme === 'purple'
          ? 'bg-[#C5DFF8]'
          : currentTheme === 'brown'
          ? 'bg-[#F4EEE0]'
          : 'bg-white dark:bg-[#343541]'
      }`}
      style={{
        '--bg-color': currentTheme === 'red'
          ? '#F2ECBE'
          : currentTheme === 'blue'
          ? '#F6F4EB'
          : currentTheme === 'green'
          ? '#FAF1E4'
          : currentTheme === 'purple'
          ? '#C5DFF8'
          : currentTheme === 'brown'
          ? '#F4EEE0'
          : '#FFFFFF',
        '--dark-bg-color': '#343541'
      } as React.CSSProperties}
    >
      <>
        {/* 顶部遮罩层，确保内容有足够的padding，只在有聊天记录时显示 */}
        {messagesLength > 0 && (
          <div 
            className="absolute top-0 left-0 right-[17px] z-10 h-[30px] md:block hidden bg-white dark:bg-[#343541]"
            style={{
              backgroundColor: currentTheme === 'red'
                ? '#F2ECBE'
                : currentTheme === 'blue'
                ? '#F6F4EB'
                : currentTheme === 'green'
                ? '#FAF1E4'
                : currentTheme === 'purple'
                ? '#C5DFF8'
                : currentTheme === 'brown'
                ? '#F4EEE0'
                : currentTheme === 'light'
                ? '#FFFFFF'
                : '#343541'
            }}
          ></div>
        )}

        <div
          className={`${!messagesLength ? 'h-full' : 'flex-1 overflow-y-auto'} chat-container-scrollbar`}
          ref={chatContainerRef}
        >
          {/* === 主要渲染逻辑 === */}
          {isAppMode ? (
            // *** 应用模式渲染 ***
            <div className="flex-1 overflow-auto p-4 h-full"> 
              {/* 应用组件 */} 
              {activeAppId === 1 && <DeepSeekAppPage />} 
              {activeAppId === 2 && <CourseHelperAppPage inputBoxHeight={inputBoxHeight} isInputExpanded={isInputExpanded} />} 
              {activeAppId === 3 && <CampusAssistantAppPage inputBoxHeight={inputBoxHeight} isInputExpanded={isInputExpanded} />} 
              {activeAppId === 4 && <TeacherAppPage inputBoxHeight={inputBoxHeight} isInputExpanded={isInputExpanded} />} 
            </div>
          ) : isWelcomeScreen ? (
            // ** 欢迎屏幕 **
            <>
              <div className="flex flex-col items-center justify-center h-full md:min-h-screen sm:overflow-hidden">
                {/* 标题区域 */}
                <div className="flex flex-col items-center text-center max-w-3xl w-full px-4 sm:px-8 welcome-text welcome-text-container"
                  style={{
                    marginTop: !isInputExpanded
                      ? window.innerWidth < 768 ? '-20vh' : '-25vh'
                      : window.innerWidth < 768
                        ? `calc(-20vh - ${(inputBoxHeight - 65) / 2}px)`
                        : `calc(-25vh - ${(inputBoxHeight - 65) / 2}px)`
                  }}
                >
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#CEFBFA] to-[#FCCD5E] rounded-lg blur-xl opacity-75 dark:opacity-60"></div>
                    <h1 className="relative text-4xl font-bold tracking-tight mb-4 md:mb-4 bg-gradient-to-r from-[#272727] to-[#696969] dark:from-[#CEFBFA] dark:to-[#FCCD5E] bg-clip-text text-transparent drop-shadow-sm welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '-0.5px' }}>eduhub.chat</h1>
                  </div>
                  <p className="text-lg font-medium md:mb-20 mb-0 md:block hidden text-[#333333] dark:text-[hsl(205deg,16%,77%)] welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.2px' }}>基于大语言模型的智能知识助手</p>
                </div>
                
                {/* 移动端内容容器 - 只在移动端显示 */}
                <div className="md:hidden flex flex-col items-center justify-center mt-12 static">
                  {/* 引导文字 */}
                  <div className="max-w-md mx-auto px-4 text-center mb-6">
                    <p className="text-lg text-[#666666] dark:text-[#A0AEC0] font-medium welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.1px' }}>
                      有什么可以帮到你？
                    </p>
                  </div>
                  
                  {/* 功能卡片 - 移动端版本 */}
                  <div className="w-full px-0">
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                      <FunctionCards />
                    </div>
                  </div>
                </div>
                
                {/* 桌面端功能卡片区域 - 只在桌面端显示 */}
                <div className="w-full absolute bottom-[18vh] px-4 hidden md:block"
                  style={{
                    bottom: !isInputExpanded
                      ? '18vh'
                      : `calc(18vh - ${(inputBoxHeight - 65) / 2}px)`,
                    transition: 'none' // 确保直接变化，无过渡效果
                  }}
                >
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <FunctionCards />
                  </div>
                </div>

                {/* --- RESTORE Inner Input Box for Welcome Screen --- */}
                <div className="w-full mt-8 md:static md:bottom-auto md:left-auto md:right-auto md:mt-8 fixed bottom-0 left-0 right-0"> 
                  <div className="w-full md:max-w-[800px] md:mx-auto px-0 mx-0"> 
                     <div className="md:block"> 
                       <ModernChatInput 
                         key="welcome-input" // Specific key for welcome
                         stopConversationRef={stopConversationRef}
                         textareaRef={textareaRef}
                         onSend={(message) => { onSend(message, 0); }}
                         onScrollDownClick={handleScrollDown}
                         onRegenerate={() => { if (currentMessage && activeAppId === null) { onSend(currentMessage, 2); } }}
                         showScrollDownButton={false} // Welcome screen never shows scroll down
                         isCentered={true} // Welcome screen input is centered
                         showSidebar={showSidebar}
                         isMobile={isMobile}
                         handleStopConversation={handleStopConversation}
                         messageIsStreaming={messageIsStreaming} 
                       /> 
                     </div> 
                   </div> 
                 </div> 
                {/* --- END RESTORE --- */} 
              </div>
            </>
          ) : (
            // ** 标准聊天消息列表 **
            <div className="flex-1 overflow-y-auto">
              <div className="md:pt-6 pt-2">
                {showSettings && (
                  <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                    <div className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                    </div>
                  </div>
                )}

                {selectedConversation?.messages?.map((message, index) => (
                  <MemoizedChatMessage
                    key={message.id || index}
                    message={message}
                    messageIndex={index}
                    onEdit={(editedMessage) => {
                      const deleteCount = messagesLength - index;
                      onSend(editedMessage, deleteCount - 1);
                    }}
                    lightMode={currentTheme}
                  />
                ))}

                {/* ChatLoader 使用全局状态 */}
                {<ChatLoader messageIsStreaming={messageIsStreaming} modelWaiting={modelWaiting} />}

                {/* 添加底部空白区域，确保内容可见性 */}
                <div 
                  style={{ height: `${bottomInputHeight + 60}px`, transition: 'none' }} 
                  ref={messagesEndRef} 
                />
              </div>
            </div>
          )}
          {/* === END 主要渲染逻辑修改 === */}
        </div>

        {/* 底部遮罩层 (只在标准聊天模式显示) */}
        {isStandardChat && (
          <div 
             // ... styles ...
          ></div>
        )}

        {/* === Bottom Fixed Input Box Area (NOT for Welcome Screen) === */}
        {/* --- Add condition: Render only if NOT welcome screen --- */} 
        {!isWelcomeScreen && (
          <div className="absolute bottom-0 left-0 w-full z-20">
               <div className={`w-full md:absolute md:bottom-0 md:left-0 md:right-auto fixed bottom-0 left-0 right-0 ${isAppMode ? 'app-input-mode' : ''}`}> 
                <div className="w-full md:max-w-[800px] mx-auto px-0">
                  {/* --- Bottom Input Instance --- */} 
                  <ModernChatInput
                    // Use key to differentiate from welcome input if needed, or based on convo/app id
                    key={activeAppId !== null ? `app-${activeAppId}` : selectedConversation?.id || 'chat'}
                    stopConversationRef={stopConversationRef}
                    textareaRef={textareaRef}
                    onSend={(message) => {
                      onSend(message, 0);
                    }}
                    onScrollDownClick={handleScrollDown}
                    onRegenerate={activeAppId === null ? () => {
                      if (currentMessage) { onSend(currentMessage, 2); }
                    } : () => {}} // Provide empty fn for apps
                    showScrollDownButton={activeAppId === null && showScrollDownButton} // Only for standard chat
                    isCentered={false} // Bottom input is never centered
                    showSidebar={showSidebar}
                    isMobile={isMobile}
                    handleStopConversation={handleStopConversation}
                    messageIsStreaming={messageIsStreaming}
                  />
                </div>
              </div>
          </div>
        )}
        {/* === END Bottom Fixed Input Box Area === */}
      </>
    </div>
  );
});
Chat.displayName = 'Chat';
