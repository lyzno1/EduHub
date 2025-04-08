import {
  IconCheck,
  IconCopy,
  IconEdit,
} from '@tabler/icons-react';

import React from 'react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { updateConversation } from '@/utils/app/conversation';

import { Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void
}

export const ChatMessage: FC<Props> = memo(({ message, messageIndex, onEdit }) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, conversations, currentMessage, messageIsStreaming, lightMode },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState(message.content);
  const [messagedCopied, setMessageCopied] = useState(false);
  const [userMessageCopied, setUserMessageCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleEditMessage = () => {
    if (message.content != messageContent) {
      if (selectedConversation && onEdit) {
        onEdit({ ...message, content: messageContent });
      }
    }
    setIsEditing(false);
  };

  const handleDeleteMessage = () => {
    if (!selectedConversation) return;

    const { messages } = selectedConversation;
    const findIndex = messages.findIndex((elm) => elm === message);

    if (findIndex < 0) return;

    if (
      findIndex < messages.length - 1 &&
      messages[findIndex + 1].role === 'assistant'
    ) {
      messages.splice(findIndex, 2);
    } else {
      messages.splice(findIndex, 1);
    }
    const updatedConversation = {
      ...selectedConversation,
      messages,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );
    homeDispatch({ field: 'selectedConversation', value: single });
    homeDispatch({ field: 'conversations', value: all });
  };

  const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
      e.preventDefault();
      handleEditMessage();
    }
  };

  // 复制模型输出内容
  const copyOnClick = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setMessageCopied(true);
      setTimeout(() => {
        setMessageCopied(false);
      }, 2000);
    });
  };

  // 复制用户输入内容
  const copyUserMessage = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setUserMessageCopied(true);
      setTimeout(() => {
        setUserMessageCopied(false);
      }, 2000);
    });
  };

  useEffect(() => {
    setMessageContent(message.content);
  }, [message.content]);


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // 判断是否为用户消息
  const isUser = message.role === 'user';
  // 判断是否为空的助手消息（等待流式输出）
  const isEmptyAssistantMessage = !isUser && message.content === '';

  // 如果是空的助手消息，直接返回 null
  if (isEmptyAssistantMessage && !messageIsStreaming) {
    return null;
  }

  return (
    <div className={`flex justify-center py-3 w-full`}>
      <div className={`w-full max-w-[800px] px-2 sm:px-4`}>
        {isUser ? (
          // 用户消息
          <div className="flex justify-end">
            <div className="max-w-[75%]">
              <div className="group relative">
                {isEditing ? (
                  <div className="flex w-full flex-col">
                    <textarea
                      ref={textareaRef}
                      className="w-full resize-none whitespace-pre-wrap border border-gray-300 bg-white rounded-2xl p-3 focus:outline-none focus:border-blue-500"
                      value={messageContent}
                      onChange={handleInputChange}
                      onKeyDown={handlePressEnter}
                      onCompositionStart={() => setIsTyping(true)}
                      onCompositionEnd={() => setIsTyping(false)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        overflow: 'hidden',
                      }}
                    />

                    <div className="mt-2 flex justify-end space-x-2">
                      <button
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-100"
                        onClick={() => {
                          setMessageContent(message.content);
                          setIsEditing(false);
                        }}
                      >
                        {t('取消')}
                      </button>
                      <button
                        className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                        onClick={handleEditMessage}
                        disabled={messageContent.trim().length <= 0}
                      >
                        {t('保存')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative pb-8">
                    <div className="bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100 px-4 py-3 rounded-[20px] text-sm leading-relaxed border border-gray-200 dark:border-gray-600 shadow-sm font-medium">
                      {message.content}
                    </div>
                    
                    {/* 用户消息的操作按钮，位于气泡下方，悬停显示 */}
                    <div className="absolute bottom-2 right-0 flex items-center gap-1.5 invisible group-hover:visible">
                      <button
                        className={`flex items-center justify-center rounded-md p-1 px-1.5 text-xs
                        text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700
                        transition-colors duration-200 shadow-sm`}
                        onClick={copyUserMessage}
                        data-tooltip={userMessageCopied ? "已复制到剪贴板" : "复制消息内容"}
                        data-placement="bottom"
                      >
                        {userMessageCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </button>
                      <button
                        className={`flex items-center justify-center rounded-md p-1 px-1.5 text-xs
                        text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700
                        transition-colors duration-200 shadow-sm`}
                        onClick={toggleEditing}
                        data-tooltip="编辑消息"
                        data-placement="bottom"
                      >
                        <IconEdit size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 助手消息
          <div className="w-full">
            <div className="prose dark:prose-invert prose-p:my-1 prose-pre:my-2 max-w-none w-full">
              <MemoizedReactMarkdown
                className="prose dark:prose-invert prose-p:my-1 prose-pre:my-2 max-w-none w-full"
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeMathjax]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');

                    return !inline ? (
                      <CodeBlock
                        key={Math.random()}
                        language={(match && match[1]) || ''}
                        value={String(children).replace(/\n$/, '')}
                        {...props}
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-2">
                        <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                          {children}
                        </table>
                      </div>
                    );
                  },
                }}
              >
                {message.content || (messageIsStreaming ? '▍' : '')}
              </MemoizedReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';
