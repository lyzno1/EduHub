import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconTrash,
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

  const copyOnClick = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setMessageCopied(true);
      setTimeout(() => {
        setMessageCopied(false);
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

  return (
    <div className={`flex justify-center py-3 w-full`}>
      <div className={`w-full max-w-3xl px-4 sm:px-8`}>
        {isUser ? (
          // 用户消息
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              <div className="group">
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
                  <div className="flex items-end gap-2">
                    <div className="invisible group-hover:visible flex flex-row items-center space-x-1">
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={toggleEditing}
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={handleDeleteMessage}
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                    <div className="bg-blue-50 text-gray-900 dark:bg-blue-900 dark:text-white px-4 py-3 rounded-2xl rounded-tr-none text-sm leading-relaxed border border-blue-100 dark:border-blue-800 shadow-sm font-medium">
                      {message.content}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // AI助手消息 - 移除气泡样式，让它占据全宽
          <div className="w-full group relative pb-8">
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <span>AI助手</span>
            </div>
            <div className="w-full text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
              <MemoizedReactMarkdown
                className="prose dark:prose-invert prose-p:my-1 prose-pre:my-2 max-w-none"
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeMathjax]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    if (children.length) {
                      if (children[0] == '▍') {
                        return <span className="animate-pulse cursor-default mt-1">▍</span>;
                      }

                      children[0] = (children[0] as string).replace('`▍`', '▍');
                      
                      // 不需要对行内代码做特殊处理，React Markdown已经处理掉了反引号
                    }

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
                  th({ children }) {
                    return (
                      <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="break-words border border-black px-3 py-1 dark:border-white">
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {`${message.content}${
                  messageIsStreaming && messageIndex == (selectedConversation?.messages.length ?? 0) - 1 ? '`▍`' : ''
                }`}
              </MemoizedReactMarkdown>
            </div>
            {/* 复制按钮移到左下角，默认隐藏，悬停显示 */}
            <div className="absolute bottom-0 left-0 invisible group-hover:visible z-10">
              <button
                className={`flex items-center justify-center rounded-md px-2 py-1 text-xs ${
                  messagedCopied ? 'text-green-500 bg-green-50' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
                } transition-colors duration-200 shadow-sm`}
                onClick={copyOnClick}
                onMouseDown={(e) => e.preventDefault()}
              >
                {messagedCopied ? <IconCheck size={16} className="mr-1" /> : <IconCopy size={16} className="mr-1" />}
                <span>{messagedCopied ? "已复制" : "复制"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';
