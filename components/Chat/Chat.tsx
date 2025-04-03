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

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });
        const chatBody: ChatBody = {
          model: updatedConversation.model,
          messages: updatedConversation.messages,
          key: updatedConversation.model.key || "",
          prompt: updatedConversation.prompt,
          temperature: updatedConversation.temperature,
          conversationID: updatedConversation.conversationID,
          user: user,
        };
        const endpoint = plugin ? getEndpoint(plugin) : getModelEndpoint(updatedConversation.model.apiType);
        
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
    ],
  );

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 100; // 增加底部容差，让用户有更多空间浏览

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = useCallback(() => {
    if (chatContainerRef?.current) {
      // 计算需要滚动的距离 - 计算滚动容器高度并留出足够的底部空间 
      const container = chatContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      
      // 确保不会滚动到底部，而是在输入框上方一定距离停止
      const scrollToPosition = maxScrollTop - 60; // 保留60px的空间
      
      container.scrollTo({
        top: scrollToPosition > 0 ? scrollToPosition : 0,
        behavior: 'smooth', // 保持平滑滚动
      });
      setAutoScrollEnabled(true);
    }
  }, [chatContainerRef]);

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

  const scrollDown = () => {
    if (autoScrollEnabled && chatContainerRef?.current) {
      // 使用scrollIntoView确保消息区域滚动到底部，保留平滑效果但更快速
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      // 作为后备方案，也使用scrollTo
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  };
  const throttledScrollDown = throttle(scrollDown, 150); // 减小节流时间，让滚动更快响应

  useEffect(() => {
    // 消息流式传输时确保自动滚动
    if (messageIsStreaming) {
      throttledScrollDown();
    }
  }, [messageIsStreaming, throttledScrollDown]);

  // 确保在新消息时总是滚动到底部，但只有在已启用自动滚动时
  useEffect(() => {
    if (selectedConversation?.messages.length && autoScrollEnabled) {
      throttledScrollDown();
      
      // 设置当前消息
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2]
      );
    }
  }, [selectedConversation?.messages.length, throttledScrollDown, selectedConversation, autoScrollEnabled]);

  // 在初始加载或切换对话时滚动到底部
  useEffect(() => {
    if (
      selectedConversation?.messages && selectedConversation.messages.length > 0 &&
      !messageIsStreaming
    ) {
      setTimeout(() => {
        handleScrollDown();
      }, 100);
    }
  }, [selectedConversation?.id, handleScrollDown]);

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
        <div className="absolute top-4 left-4 z-30">
          <ModelSelectButton />
        </div>

        {/* 顶部遮罩层，确保内容不会超过模型选择按钮区域 */}
        <div 
          className="absolute top-0 left-0 w-full z-10 h-[60px] bg-white dark:bg-[#343541]"
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

        <div
          className="flex-1 overflow-y-auto pt-16"
          ref={chatContainerRef}
          onScroll={handleScroll}
        >
          {selectedConversation?.messages?.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="flex flex-col items-center text-center max-w-3xl w-full px-4 sm:px-8 -mt-60">
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">eduhub.chat</h1>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-20">基于大语言模型的新一代知识助手</p>
                </div>
                
                <div className="w-full mt-16">
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
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {showSettings && (
                <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                  <div className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                  </div>
                </div>
              )}

              {selectedConversation?.messages.map((message, index) => (
                <MemoizedChatMessage
                  key={index}
                  message={message}
                  messageIndex={index}
                  onEdit={(editedMessage) => {
                    const deleteCount =
                      selectedConversation?.messages?.length - index;
                    handleSend(editedMessage, deleteCount - 1);
                  }}
                />
              ))}

              {loading && <ChatLoader />}

              <div className="h-[200px]" ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 底部固定区域作为mask层，确保内容不会滚动到这个区域下 */}
        <div 
          className="absolute bottom-0 left-0 w-full z-10 h-[140px]"
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

        {/* 输入框区域，放在mask层上方 */}
        <div className="absolute bottom-0 left-0 w-full z-20">
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
            isCentered={selectedConversation?.messages?.length === 0}
          />
        </div>
      </>
    </div>
  );
});
Chat.displayName = 'Chat';
