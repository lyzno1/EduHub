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

import { getEndpoint, getModelEndpoint } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';

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
      models,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
      user,
      lightMode,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);
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

  // 监听滚动事件，根据需要显示滚动按钮
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;
      
      // 判断是否是初始状态（没有消息）
      const isInitialState = !selectedConversation || selectedConversation.messages.length === 0;
      
      // 添加一个标记，表示用户是否正在拖动滚动条
      const isUserDragging = document.body.classList.contains('user-is-dragging-scrollbar');
      
      if (scrollPosition > 100 && !scrollButtonLockRef.current && !isUserDragging) {
        // 距离底部超过阈值，禁用自动滚动
        setAutoScrollEnabled(false);
        
        // 只有在非初始状态(有消息)的情况下，才显示滚动按钮
        if (!isInitialState) {
          setShowScrollDownButton(true);
        } else {
          setShowScrollDownButton(false);
        }
      } else if (scrollPosition <= 100 && !isUserDragging) {
        // 距离底部在阈值内，启用自动滚动
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    };
    
    // 监听鼠标按下事件，检测用户是否开始拖动滚动条
    const handleMouseDown = (e: MouseEvent) => {
      // 检查鼠标点击是否在滚动条区域
      if (e.target instanceof Element && 
          (e.target.classList.contains('chat-scrollbar-custom-thumb') || 
           e.target.closest('.chat-scrollbar-custom-overlay'))) {
        document.body.classList.add('user-is-dragging-scrollbar');
      }
    };
    
    // 监听鼠标释放事件，检测用户是否停止拖动滚动条
    const handleMouseUp = () => {
      document.body.classList.remove('user-is-dragging-scrollbar');
    };
    
    chatContainerRef.current.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 初始检查一次状态
    handleScroll();
    
    return () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.removeEventListener('scroll', handleScroll);
      }
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selectedConversation, scrollButtonLockRef]);

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0, plugin: Plugin | null = null) => {
      // 是否存在选定的会话
      if (selectedConversation) {
        let updatedConversation: Conversation;
        // 如果deleteCount大于0，则从当前会话的消息数组中删除最后deleteCount条消息，
        // 并创建一个新的更新后的会话对象updatedConversation，将新的消息添加到其中。
        if (deleteCount) {
          const updatedMessages = [...selectedConversation.messages];
          for (let i = 0; i < deleteCount; i++) {
            updatedMessages.pop();
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...updatedMessages, message],
          };
        } else {
          // 如果deleteCount等于0，则直接创建一个新的更新后的会话对象updatedConversation，
          // 将新的消息添加到当前会话的消息数组中。
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
          };
        }
        
        // 更新状态
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });
        
        // 确保在发送消息时，视图滚动到底部
        setTimeout(() => {
          handleScrollDown();
        }, 50);
        
        const chatBody: ChatBody = {
          model: updatedConversation.model,
          messages: updatedConversation.messages,
          key: updatedConversation.model.key || "",
          prompt: updatedConversation.prompt,
          temperature: updatedConversation.temperature,
          conversationID: updatedConversation.conversationID,
          user: user,
        };
        // 使用动态API端点，根据模型类型选择
        const endpoint = plugin 
          ? getEndpoint(plugin) 
          : (updatedConversation.model.apiType 
             ? getModelEndpoint(updatedConversation.model.apiType)
             : '');
        
        if (!endpoint) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          toast.error(t('无法确定API端点，请检查模型配置'));
          return;
        }
        
        console.log("Using model:", updatedConversation.model.name);
        console.log("Model API type:", updatedConversation.model.apiType);
        console.log("Selected endpoint:", endpoint);
        
        let body;
        if (!plugin) {
          body = JSON.stringify(chatBody);
        } else {
          body = JSON.stringify({
            ...chatBody,
            googleAPIKey: pluginKeys
              .find((key) => key.pluginId === 'google-search')
              ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
            googleCSEId: pluginKeys
              .find((key) => key.pluginId === 'google-search')
              ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
          });
        }
        const controller = new AbortController();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body,
        });
        if (!response.ok) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          toast.error(response.statusText);
          return;
        }
        const data = response.body;
        if (!data) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          return;
        }
        if (!plugin) {
          if (updatedConversation.messages.length === 1) {
            // 获取消息对象的content属性，并根据内容长度进行定制化处理，将截取的内容作为会话的名称。
            const { content } = message;
            const customName =
              content.length > 30 ? content.substring(0, 30) + '...' : content;
            // 通过扩展运算符将新的会话名称添加到updatedConversation对象中。
            updatedConversation = {
              ...updatedConversation,
              name: customName,
            };
          }
          homeDispatch({ field: 'loading', value: false });
          const reader = data.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let isFirst = true;
          let accumulatedText = '';
          let text = '';
          while (!done) {
            if (stopConversationRef.current === true) {
              controller.abort();
              done = true;
              break;
            }
            const { value, done: doneReading } = await reader.read();
            done = doneReading;

            accumulatedText += decoder.decode(value);

            // 使用换行符（或其他分隔符）分割累积的文本，并处理每一个完整的 JSON 对象
            while (accumulatedText.includes('\n')) {
              const splitIndex = accumulatedText.indexOf('\n');
              const jsonText = accumulatedText.slice(0, splitIndex);

              const parsedMessage = JSON.parse(jsonText);
              const { answer: answer, conversation_id: newConversationId } =
                parsedMessage;
              console.log('answer', answer);

              const chunkValue = answer;
              if (chunkValue != undefined) {
                text += chunkValue;
              }
              // 第一次读取响应的数据块
              if (isFirst) {
                isFirst = false;
                // 创建一个新的消息数组updatedMessages，将当前会话（updatedConversation）原有的消息对象和一个新的消息对象添加进去。
                const updatedMessages: Message[] = [
                  ...updatedConversation.messages,
                  { role: 'assistant', content: chunkValue },
                ];
                // 更新updatedConversation对象，将新的消息数组updatedMessages赋值给messages字段。
                updatedConversation = {
                  ...updatedConversation,
                  messages: updatedMessages,
                };
                // 将更新后的updatedConversation对象派发给主页组件（Home），以更新选中的会话。
                homeDispatch({
                  field: 'selectedConversation',
                  value: updatedConversation,
                });
              } else {
                const updatedMessages: Message[] =
                  updatedConversation.messages.map((message, index) => {
                    if (index === updatedConversation.messages.length - 1) {
                      return {
                        ...message,
                        content: text,
                      };
                    }
                    return message;
                  });
                updatedConversation = {
                  ...updatedConversation,
                  messages: updatedMessages,
                };
                homeDispatch({
                  field: 'selectedConversation',
                  value: updatedConversation,
                });
              }
              accumulatedText = accumulatedText.slice(splitIndex + 1);

              // update conversation id
              if (newConversationId) {
                updatedConversation = {
                  ...updatedConversation,
                  conversationID: newConversationId,
                };
              }
            }
          }

          saveConversation(updatedConversation);
          const updatedConversations: Conversation[] = conversations.map(
            (conversation) => {
              if (conversation.id === selectedConversation.id) {
                return updatedConversation;
              }
              return conversation;
            },
          );
          if (updatedConversations.length === 0) {
            updatedConversations.push(updatedConversation);
          }
          homeDispatch({ field: 'conversations', value: updatedConversations });
          saveConversations(updatedConversations);
          homeDispatch({ field: 'messageIsStreaming', value: false });
        } else {
          const { answer } = await response.json();
          const updatedMessages: Message[] = [
            ...updatedConversation.messages,
            { role: 'assistant', content: answer },
          ];
          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages,
          };
          homeDispatch({
            field: 'selectedConversation',
            value: updatedConversation,
          });
          saveConversation(updatedConversation);
          const updatedConversations: Conversation[] = conversations.map(
            (conversation) => {
              if (conversation.id === selectedConversation.id) {
                return updatedConversation;
              }
              return conversation;
            },
          );
          if (updatedConversations.length === 0) {
            updatedConversations.push(updatedConversation);
          }
          homeDispatch({ field: 'conversations', value: updatedConversations });
          saveConversations(updatedConversations);
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
        }
      }
    },
    [
      apiKey,
      conversations,
      pluginKeys,
      selectedConversation,
      stopConversationRef,
      handleScrollDown,
    ],
  );

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
    const isDarkMode = lightMode === 'dark';
    
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
        bottom: 135px;
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
  }, [lightMode]); // 添加lightMode作为依赖，确保主题切换时更新样式

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
      className={`relative flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#343541] ${
        lightMode === 'red'
          ? 'bg-[#F2ECBE]'
          : lightMode === 'blue'
          ? 'bg-[#F6F4EB]'
          : lightMode === 'green'
          ? 'bg-[#FAF1E4]'
          : lightMode === 'purple'
          ? 'bg-[#C5DFF8]'
          : lightMode === 'brown'
          ? 'bg-[#F4EEE0]'
          : 'bg-white dark:bg-[#343541]'
      }`}
      style={{
        '--bg-color': lightMode === 'red'
          ? '#F2ECBE'
          : lightMode === 'blue'
          ? '#F6F4EB'
          : lightMode === 'green'
          ? '#FAF1E4'
          : lightMode === 'purple'
          ? '#C5DFF8'
          : lightMode === 'brown'
          ? '#F4EEE0'
          : '#FFFFFF',
        '--dark-bg-color': '#343541'
      } as React.CSSProperties}
    >
      <>
        {/* 顶部遮罩层，确保内容有足够的padding，只在有聊天记录时显示 */}
        {messagesLength > 0 && (
          <div 
            className="absolute top-0 left-0 right-[17px] z-10 h-[30px] bg-white dark:bg-[#343541]"
            style={{
              backgroundColor: lightMode === 'red'
                ? '#F2ECBE'
                : lightMode === 'blue'
                ? '#F6F4EB'
                : lightMode === 'green'
                ? '#FAF1E4'
                : lightMode === 'purple'
                ? '#C5DFF8'
                : lightMode === 'brown'
                ? '#F4EEE0'
                : lightMode === 'light'
                ? '#FFFFFF'
                : '#343541'
            }}
          ></div>
        )}

        <div
          className="flex-1 overflow-y-auto chat-container-scrollbar"
          ref={chatContainerRef}
        >
          {!messagesLength ? (
            <>
              <div className="flex flex-col items-center justify-center min-h-screen">
                {/* 标题区域 */}
                <div className="flex flex-col items-center text-center max-w-3xl w-full px-4 sm:px-8 -mt-[25vh] animate-fade-in"
                  style={{
                    marginTop: !isInputExpanded 
                      ? '-25vh' 
                      : `calc(-25vh - ${(inputBoxHeight - 65) / 2}px)`,
                    transition: 'none' // 移除过渡效果，确保立即变化
                  }}
                >
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#CEFBFA] to-[#FCCD5E] rounded-lg blur-xl opacity-75 dark:opacity-60"></div>
                    <h1 className="relative text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#272727] to-[#696969] dark:from-[#CEFBFA] dark:to-[#FCCD5E] bg-clip-text text-transparent drop-shadow-sm animate-slide-up" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '-0.5px' }}>eduhub.chat</h1>
                  </div>
                  <p className="text-lg font-medium mb-20 text-[#333333] dark:text-[hsl(205deg,16%,77%)] animate-slide-up-delay" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.2px' }}>基于大语言模型的智能知识助手</p>
                </div>
                
                {/* 功能卡片区域 */}
                <div className="w-full absolute bottom-[18vh] px-4"
                  style={{
                    bottom: !isInputExpanded
                      ? '18vh' 
                      : `calc(18vh - ${(inputBoxHeight - 65) / 2}px)`,
                    transition: 'none' // 移除过渡效果，确保立即变化
                  }}
                >
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <FunctionCards />
                  </div>
                </div>
                
                <div className="w-full mt-8">
                  <ModernChatInput
                    stopConversationRef={stopConversationRef}
                    textareaRef={textareaRef}
                    onSend={(message, plugin) => {
                      handleSend(message, 0, plugin);
                    }}
                    onScrollDownClick={handleScrollDown}
                    onRegenerate={() => {
                      if (currentMessage) {
                        handleSend(currentMessage, 2);
                      }
                    }}
                    showScrollDownButton={showScrollDownButton}
                    isCentered={true}
                    showSidebar={showSidebar}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="pt-6">
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
                      handleSend(editedMessage, deleteCount - 1);
                    }}
                  />
                ))}

                {loading && <ChatLoader />}

                {/* 添加底部空白区域，确保内容可见性 */}
                <div 
                  style={{ 
                    height: `${Math.max(230, bottomInputHeight + 160)}px`, // 增加高度以与滚动条下界保持一致
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
            className="absolute bottom-0 left-0 right-0 z-10"
            style={{
              height: '135px', // 与滚动条底部边界一致
              backgroundColor: lightMode === 'red'
                ? '#F2ECBE'
                : lightMode === 'blue'
                ? '#F6F4EB'
                : lightMode === 'green'
                ? '#FAF1E4'
                : lightMode === 'purple'
                ? '#C5DFF8'
                : lightMode === 'brown'
                ? '#F4EEE0'
                : lightMode === 'light'
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
            <ModernChatInput
              stopConversationRef={stopConversationRef}
              textareaRef={textareaRef}
              onSend={(message, plugin) => {
                handleSend(message, 0, plugin);
              }}
              onScrollDownClick={handleScrollDown}
              onRegenerate={() => {
                if (currentMessage) {
                  handleSend(currentMessage, 2);
                }
              }}
              showScrollDownButton={showScrollDownButton}
              isCentered={false} // 底部输入框永远不是中心状态
              showSidebar={showSidebar}
            />
          )}
        </div>
      </>
    </div>
  );
});
Chat.displayName = 'Chat';
