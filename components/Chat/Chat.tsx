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
import { ModelSelect } from './ModelSelect';
import { ModelSelectButton } from './ModelSelectButton';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';
import { FunctionCards } from './FunctionCards';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { streamDifyChat } from '@/services/useApiService';
import { DifyClient } from '../../services/dify/client';
import { API_PATHS } from '@/services/dify/constants';

// 添加主题类型定义
type ThemeMode = 'light' | 'dark' | 'red' | 'blue' | 'green' | 'purple' | 'brown';

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
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  // 类型断言确保 lightMode 的类型正确
  const currentTheme = lightMode as ThemeMode;

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messageIsStreaming, setMessageIsStreaming] = useState<boolean>(false);
  // 添加一个锁定变量，防止按钮状态在短时间内频繁变化
  const scrollButtonLockRef = useRef<boolean>(false);

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
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

      // 使用统一的消息处理逻辑
      const chatStream = await difyClient.createChatStream({
        query: message.content,
        key: apiKey,
        user: user || 'unknown',
        conversationId, // 使用已存在的conversationId或空字符串
        inputs: {},
        autoGenerateName: true
      });

      let fullResponse = '';
      
      chatStream.onMessage((chunk: string) => {
        setMessageIsStreaming(true);
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
          conversationId = chatStream.conversationId;
          
          // 同时立即更新所有对话列表中的相应对话ID
          const updatedConversationsWithId = conversations.map(conv => 
            conv.id === selectedConversation.id 
              ? {...conv, conversationID: conversationId} 
              : conv
          );
          
          homeDispatch({
            field: 'conversations',
            value: updatedConversationsWithId
          });
          
          // 保存到本地存储
          saveConversations(updatedConversationsWithId);
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
        
        // 优化滚动逻辑，统一移动端和桌面端
        if (autoScrollEnabled) {
          // 使用requestAnimationFrame来优化滚动性能
          requestAnimationFrame(() => {
            if (chatContainerRef.current) {
              const container = chatContainerRef.current;
              const { scrollHeight, scrollTop, clientHeight } = container;
              const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
              
              // 只有当接近底部时才滚动，避免用户主动滚动时干扰
              if (isNearBottom) {
                // 平滑滚动到底部
                container.scrollTo({
                  top: scrollHeight,
                  behavior: isMobile ? 'auto' : 'smooth' // 移动端使用即时滚动，桌面端使用平滑滚动
                });
              }
            }
          });
        }
      });

      chatStream.onError((error: Error) => {
        console.error('处理消息时错误:', error);
        setMessageIsStreaming(false);
        
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
        setMessageIsStreaming(false);
        
        // 确保使用最新的conversationId
        if (chatStream.conversationId && (!conversationId || conversationId === '')) {
          conversationId = chatStream.conversationId;
          console.log('完成时收到的conversationId:', conversationId);
        }
        
        // 保存完整的对话 - 不需要额外添加助手消息，因为已经在流式响应中更新了
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
        
        // 确保对话列表中的对话也被更新
        const updatedConversations = conversations.map(conv => 
          conv.id === finalConversation.id ? finalConversation : conv
        );
        homeDispatch({
          field: 'conversations',
          value: updatedConversations
        });
        saveConversations(updatedConversations);
      });

    } catch (error) {
      console.error('处理消息时错误:', error);
      setMessageIsStreaming(false);
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
          {!messagesLength ? (
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
                
                <div className="w-full mt-8 md:static md:bottom-auto md:left-auto md:right-auto md:mt-8 fixed bottom-0 left-0 right-0">
                  <div className="w-full md:max-w-[800px] md:mx-auto px-0 mx-0">
                    <div className="md:block">
                      <ModernChatInput
                        stopConversationRef={stopConversationRef}
                        textareaRef={textareaRef}
                        onSend={(message) => {
                          onSend(message, 0);
                        }}
                        onScrollDownClick={handleScrollDown}
                        onRegenerate={() => {
                          if (currentMessage) {
                            onSend(currentMessage, 2);
                          }
                        }}
                        showScrollDownButton={showScrollDownButton}
                        isCentered={window.innerWidth >= 768}
                        showSidebar={showSidebar}
                        isMobile={window.innerWidth < 768}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="md:pt-6 pt-2">
                {showSettings && (
                  <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                    <div className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                    </div>
                  </div>
                )}

                {selectedConversation?.messages?.map((message, index) => (
                  <MemoizedChatMessage
                    key={index}
                    message={message}
                    messageIndex={index}
                    onEdit={(editedMessage) => {
                      // 安全地处理deleteCount
                      const deleteCount = messagesLength - index;
                      onSend(editedMessage, deleteCount - 1);
                    }}
                  />
                ))}

                {messageIsStreaming && <ChatLoader messageIsStreaming={messageIsStreaming} />}

                {/* 添加底部空白区域，确保内容可见性 */}
                <div 
                  style={{ 
                    height: window.innerWidth < 768 
                      ? `${Math.max(100, bottomInputHeight + 50)}px` // 移动端使用更小的底部空间
                      : `${Math.max(120, bottomInputHeight + 60)}px`, // 桌面端减小底部空间，与输入框上方基本平齐
                    transition: 'none' // 改为直接变化，移除平滑过渡
                  }} 
                  ref={messagesEndRef} 
                />
              </div>
            </>
          )}
        </div>

        {/* 底部固定挡板区域 - 确保文字被遮挡，不会穿过输入框 */}
        {messagesLength > 0 && (
          <div 
            className="absolute bottom-0 left-0 right-0 z-10 md:block hidden"
            style={{
              height: '85px', // 减少遮挡高度，与底部空白区域匹配
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
                : '#343541',
              transition: 'none',
              pointerEvents: 'none' // 确保不阻止鼠标事件
            }}
          ></div>
        )}

        {/* 输入框区域 */}
        <div className="absolute bottom-0 left-0 w-full z-20">
          {/* 只在有消息时显示底部输入框 */}
          {messagesLength > 0 && (
            <div className="w-full md:absolute md:bottom-0 md:left-0 md:right-auto fixed bottom-0 left-0 right-0">
              <div className="w-full md:max-w-full px-0">
                <ModernChatInput
                  stopConversationRef={stopConversationRef}
                  textareaRef={textareaRef}
                  onSend={(message) => {
                    onSend(message, 0);
                  }}
                  onScrollDownClick={handleScrollDown}
                  onRegenerate={() => {
                    if (currentMessage) {
                      onSend(currentMessage, 2);
                    }
                  }}
                  showScrollDownButton={showScrollDownButton}
                  isCentered={false} // 底部输入框永远不是中心状态
                  showSidebar={showSidebar}
                  isMobile={window.innerWidth < 768}
                />
              </div>
            </div>
          )}
        </div>
      </>
    </div>
  );
});
Chat.displayName = 'Chat';
