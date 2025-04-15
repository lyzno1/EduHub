import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconAtom,
  IconChevronUp,
  IconChevronDown
} from '@tabler/icons-react';

import React, { useState } from 'react';
import { FC, memo, useContext, useEffect, useRef } from 'react';

import { useTranslation } from 'next-i18next';

import { updateConversation } from '@/utils/app/conversation';

import { Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';

interface StyledDetailsProps {
  children?: React.ReactNode;
  messageIndex: number;
  lastMessageIndex: number;
  lightMode: string;
  [key: string]: any;
}

const StyledDetails: FC<StyledDetailsProps> = ({ 
  children, 
  messageIndex, 
  lastMessageIndex, 
  lightMode,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(props.open || false);
  let summaryNode: React.ReactNode = null;
  let otherChildren: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === 'summary') {
      summaryNode = child;
    } else {
      otherChildren.push(child);
    }
  });

  const titleText = "推理过程";

  const handleToggle = (e: React.MouseEvent<HTMLElement>) => {
    setIsOpen(e.currentTarget.parentElement?.hasAttribute('open') ?? false);
  };

  return (
    <details
      {...props}
      className={`my-2 overflow-hidden bg-white dark:bg-gray-850 rounded-lg border border-gray-200 dark:border-gray-700/40 shadow-sm`}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary
        className="flex items-center justify-between px-3 py-2 cursor-pointer list-none 
                   bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 
                   border-b border-gray-200 dark:border-gray-700/40 
                   font-medium text-sm text-gray-600 dark:text-gray-300 transition-colors rounded-t-md 
                   select-none"
        onClick={handleToggle}
      >
        <span className="flex items-center gap-2">
          <IconAtom size={16} className="text-blue-500" />
          {titleText}
        </span>
        {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
      </summary>

      <div 
        className={`pl-5 py-2 border-l-4 border-gray-300 dark:border-gray-600 
                   prose prose-sm dark:prose-invert max-w-none 
                   prose-p:my-0 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 
                   [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 
                   bg-transparent 
                   transition-all duration-300 
                   mt-1 mb-1 ml-1`}
      >
        {otherChildren}
      </div>
    </details>
  );
};

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void;
  lightMode: string;
}

export const ChatMessage: FC<Props> = memo(({ message, messageIndex, onEdit, lightMode }) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, conversations, currentMessage, messageIsStreaming },
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

  const copyOnClick = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setMessageCopied(true);
      setTimeout(() => {
        setMessageCopied(false);
      }, 2000);
    });
  };

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

  const isUser = message.role === 'user';
  const isEmptyAssistantMessage = !isUser && message.content === '';

  if (isEmptyAssistantMessage && !messageIsStreaming) {
    return null;
  }

  const lastMessageIndex = (selectedConversation?.messages.length ?? 0) - 1;

  return (
    <div className={`flex justify-center py-3 w-full`}>
      <div className={`w-full max-w-[800px] px-2 sm:px-4`}>
        {isUser ? (
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
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600/30 dark:to-gray-700/30 text-gray-900 dark:text-gray-100 px-4 py-3 rounded-[20px] text-sm leading-relaxed shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] font-medium whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    
                    <div className="absolute bottom-2 right-0 flex items-center gap-1.5 invisible group-hover:visible">
                      <button
                        className={`flex items-center justify-center rounded-md p-1 px-1.5 text-xs
                        text-gray-500 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800
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
          <div className="w-full">
            <div className="max-w-none w-full">
              <MemoizedReactMarkdown
                className="prose dark:prose-invert max-w-none w-full"
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeMathjax, rehypeRaw as any]}
                components={{
                  details: (props) => (
                    <StyledDetails 
                      {...props} 
                      messageIndex={messageIndex} 
                      lastMessageIndex={lastMessageIndex}
                      lightMode={lightMode}
                    />
                  ),
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isPotentiallyStreaming = messageIsStreaming && messageIndex === lastMessageIndex;

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
                }}
              >
                {message.content || (messageIsStreaming && messageIndex === lastMessageIndex ? '▍' : '')}
              </MemoizedReactMarkdown>

              {message.content && !messageIsStreaming && (
                 <div className="relative mt-2 flex justify-start">
                   <button
                    className={`flex items-center justify-center rounded-md p-1 px-1.5 text-xs
                    text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700
                    transition-colors duration-200 shadow-sm`}
                    onClick={copyOnClick}
                    data-tooltip={messagedCopied ? "已复制到剪贴板" : "复制消息内容"}
                    data-placement="bottom"
                  >
                    {messagedCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </button>
                </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';

