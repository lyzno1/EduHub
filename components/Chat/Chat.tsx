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
          key: updatedConversation.model.key,
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
      const bottomTolerance = 30;

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
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
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
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          setShowScrollDownButton(false);
        }
      },
      {
        root: null,
        threshold: 0.5,
      },
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);

  useEffect(() => {
    if (
      selectedConversation?.messages?.length > 0 &&
      !messageIsStreaming
    ) {
      setTimeout(() => {
        handleScrollDown();
      }, 100);
    }
  }, [selectedConversation?.messages?.length, messageIsStreaming, handleScrollDown]);

  return (
    <div
      className={`relative flex-1 overflow-hidden ${
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
          : 'bg-[#F6F6F6] dark:bg-[#343541]'
      }`}
    >
      <>
        <div
          className="flex-1 overflow-y-auto pb-64"
          ref={chatContainerRef}
          onScroll={handleScroll}
        >
          {selectedConversation?.messages?.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center h-full">
                <div className="flex flex-col items-center absolute left-0 right-0 mx-auto bottom-[50%] mb-[100px]">
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-2">eduhub.chat</h1>
                  <p className="text-lg text-gray-600 dark:text-gray-300">基于大语言模型的新一代知识助手</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 顶部导航栏 */}
              <div
                className={`sticky top-0 z-10 flex justify-between items-center border-b border-gray-200 px-4 py-2 dark:border-gray-800 ${
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
                    : 'bg-[#F6F6F6] dark:bg-[#343541]'
                } dark:text-neutral-200`}
              >
                <div className="font-medium text-sm">{selectedConversation.name}</div>
                
                <div className="flex items-center gap-2">
                  <button
                    className="cursor-pointer rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={onClearAll}
                    title="清除所有消息"
                  >
                    <IconClearAll size={18} />
                  </button>
                </div>
              </div>
              {showSettings && (
                <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                  <div className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                    <ModelSelect />
                  </div>
                </div>
              )}

              {selectedConversation?.messages.map((message, index) => (
                <MemoizedChatMessage
                  key={index}
                  message={message}
                  messageIndex={index}
                  onEdit={(editedMessage) => {
                    //编辑消息后，删除编辑的消息后面的所有消息，然后发送编辑后的消息。
                    const deleteCount =
                      selectedConversation?.messages?.length - index;
                    // handleSend是一个回调函数，用来处理用户发送消息的逻辑。
                    handleSend(editedMessage, deleteCount - 1);
                  }}
                />
              ))}

              {loading && <ChatLoader />}

              {/* 回复消息下方的空白区域 */}
              <div
                className={`h-[200px] ${
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
                    : 'bg-[#F6F6F6] dark:bg-[#343541]'
                }`}
                ref={messagesEndRef}
              />
            </>
          )}
        </div>

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
        />
      </>
    </div>
  );
});
Chat.displayName = 'Chat';
