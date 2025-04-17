import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconAtom,
  IconChevronUp,
  IconChevronDown
} from '@tabler/icons-react';

import React, { useState, useEffect } from 'react';
import { FC, memo, useContext, useRef } from 'react';

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
import ReactMarkdown, { Options, Components as ReactMarkdownComponents } from 'react-markdown';

// Define the new ReasoningBox component
interface ReasoningBoxProps {
  children?: React.ReactNode;
  lightMode: string;
  isStreaming: boolean;
}

const ReasoningBox: FC<ReasoningBoxProps> = ({ children, lightMode, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [ellipsis, setEllipsis] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isStreaming) {
      intervalRef.current = setInterval(() => {
        setEllipsis(prev => {
          if (prev.length >= 3) return '.';
          return prev + '.';
        });
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setEllipsis('');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isStreaming]);

  const handleToggle = () => {
    if (isStreaming) {
      return;
    }
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={`reasoning-box-container my-2 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-850 dark:border-gray-700/40`}
    >
      {/* Clickable Summary part */}
      <div
        className={`reasoning-box-header flex items-center justify-between px-3 py-2 list-none 
                   ${isStreaming ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50'} 
                   bg-gray-50 dark:bg-gray-700/30 
                   border-b border-gray-200 dark:border-gray-700/40 
                   font-medium text-sm text-gray-600 dark:text-gray-300 transition-colors rounded-t-md 
                   select-none`}
        onClick={handleToggle}
      >
        <span className="flex items-center gap-2">
          <IconAtom size={16} className="text-blue-500" />
          {isStreaming ? (
            `正在推理${ellipsis}`
          ) : (
            "已完成推理"
          )}
        </span>
        {!isStreaming && (isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />)}
      </div>

      {/* Content area - Apply animation classes here */}
      <div 
        className={`reasoning-box-content overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out 
                   ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} 
                   /* Keep original styles below, including padding/margin */
                   pl-5 pr-5 py-2 border-l-4 border-gray-300 dark:border-gray-600 
                   prose prose-sm dark:prose-invert max-w-none 
                   [&_p]:text-gray-500 dark:[&_p]:text-gray-400 
                   [&_li]:text-gray-500 dark:[&_li]:text-gray-400 
                   prose-p:my-0 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 
                   [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 
                   bg-transparent dark:bg-transparent 
                   mt-1 mb-1 ml-1`}
                   // Reverted: py-2, mt-1, mb-1 are back in static classes
      >
        {children}
      </div>
    </div>
  );
};

// Define components map type (only details and code needed here now)
interface CustomComponents extends ReactMarkdownComponents {
  details?: React.FC<any>; 
  code?: React.FC<any>; 
}

// Define ReasoningBox component (assuming it exists above or is imported)
// interface ReasoningBoxProps { ... }
// const ReasoningBox: FC<ReasoningBoxProps> = ({...}) => { ... };

/**
 * @component StreamingMarkdownRenderer
 * 
 * Handles rendering Markdown content that might contain special block tags
 * (like <think>) requiring custom rendering within a container (ReasoningBox)
 * while supporting streaming output correctly.
 * 
 * --- How it works ---
 * 1. State (`parts`): Stores the content segmented into three parts: 
 *    `before` (content before the first special tag),
 *    `think` (content inside the first special tag found),
 *    `after` (content after the first special tag's closing tag).
 * 2. Parsing (`useEffect`): When the input `content` changes, it parses the string:
 *    - It looks for the *first* occurrence of any tag listed in `customBoxTags`.
 *    - It splits the content based on the found tag and its closing tag.
 *    - Updates the `parts` state.
 * 3. Rendering: It always renders three potential sections using MemoizedReactMarkdown:
 *    - The `before` part.
 *    - The `think` part, wrapped inside a `ReasoningBox`.
 *    - The `after` part.
 *    Empty parts simply don't render anything.
 * 4. Streaming Indicator (`▍`): Appended to the last non-empty part during streaming.
 * 
 * --- Extensibility ---
 * To add support for a new tag (e.g., `<reflect>`) that should also be rendered 
 * inside a ReasoningBox:
 * 1. Add the tag name (lowercase, without brackets) to the `customBoxTags` array 
 *    within this component's definition.
 *    Example: `const customBoxTags = ['think', 'reflect'];`
 * 2. No other changes are typically needed, as the parsing logic will automatically
 *    detect the first occurrence of any tag in the list and the rendering logic 
 *    will place its content in the ReasoningBox.
 * 
 * --- Limitations ---
 * - Only handles the *first* occurrence of a special tag in the `customBoxTags` list.
 * - Does not support nesting of these special tags.
 * - Assumes tags are lowercase in the `customBoxTags` array and performs case-insensitive matching.
 */
interface StreamingMarkdownRendererProps {
  content: string; // Raw content string
  isStreaming: boolean;
  lightMode: string;
  components: CustomComponents;
}

interface ContentParts {
  before: string;
  think: string | null;
  after: string;
}

const StreamingMarkdownRenderer: FC<StreamingMarkdownRendererProps> = ({ 
  content,
  isStreaming,
  lightMode,
  components 
}) => {
  const [parts, setParts] = useState<ContentParts>({ before: '', think: null, after: '' });

  // Effect to parse content and update parts state
  useEffect(() => {
    const thinkStartTag = '<think>';
    const thinkEndTag = '</think>';
    let beforeContent = '';
    let thinkContent: string | null = null;
    let afterContent = '';

    const startIndex = content.indexOf(thinkStartTag);
    
    if (startIndex === -1) {
      // No <think> tag found
      beforeContent = content;
    } else {
      beforeContent = content.substring(0, startIndex);
      const endIndex = content.indexOf(thinkEndTag, startIndex + thinkStartTag.length);
      
      if (endIndex === -1) {
        // <think> tag found, but no closing tag yet
        thinkContent = content.substring(startIndex + thinkStartTag.length);
      } else {
        // Both tags found
        thinkContent = content.substring(startIndex + thinkStartTag.length, endIndex);
        afterContent = content.substring(endIndex + thinkEndTag.length);
      }
    }
    
    setParts({ before: beforeContent, think: thinkContent, after: afterContent });

  }, [content]); // Depend only on content

  // Determine where to place the streaming indicator
  const streamingIndicator = isStreaming ? '' : ''; // Always empty string now
  let beforeSuffix = '';
  let thinkSuffix = '';
  let afterSuffix = '';

  // This block becomes redundant but harmless
  if (isStreaming) {
    if (parts.after) {
      afterSuffix = streamingIndicator;
    } else if (parts.think !== null) {
      thinkSuffix = streamingIndicator;
    } else {
      beforeSuffix = streamingIndicator;
    }
  }

  return (
    <>
      {/* Render part before think block */} 
      {parts.before && (
        <MemoizedReactMarkdown
          className="prose dark:prose-invert max-w-none w-full text-gray-900 dark:text-gray-100"
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw as any, rehypeMathjax]}
          components={components}
        >
          {parts.before + beforeSuffix}
        </MemoizedReactMarkdown>
      )}

      {/* Render think block if it exists */} 
      {parts.think !== null && (
        <ReasoningBox lightMode={lightMode} isStreaming={isStreaming}>
          <MemoizedReactMarkdown
            className="prose dark:prose-invert max-w-none w-full text-gray-900 dark:text-gray-100"
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw as any, rehypeMathjax]}
            components={components}
          >
            {parts.think + thinkSuffix}
          </MemoizedReactMarkdown>
        </ReasoningBox>
      )}

      {/* Render part after think block */} 
      {parts.after && (
        <MemoizedReactMarkdown
          className="prose dark:prose-invert max-w-none w-full text-gray-900 dark:text-gray-100"
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw as any, rehypeMathjax]}
          components={components}
        >
          {parts.after + afterSuffix}
        </MemoizedReactMarkdown>
      )}
    </>
  );
};
// --- End StreamingMarkdownRenderer Component --- 

export interface Props {
  message: Message;
  messageIndex: number;
  lightMode: string;
  onEdit?: (editedMessage: Message) => void;
  isStreaming?: boolean;
  isWaiting?: boolean;
  userAvatar?: string;
  assistantAvatar?: string;
}

export const ChatMessage: FC<Props> = memo(({ message, messageIndex, onEdit, lightMode, isStreaming, isWaiting, userAvatar, assistantAvatar }) => {
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
  const isCurrentStreamingMessage = messageIsStreaming && messageIndex === lastMessageIndex;

  // Define the components mapping (details and code)
  const markdownComponents: CustomComponents = {
    details: ({ node, children, ...props }): React.ReactElement | null => {
      const contentWithoutSummary = React.Children.toArray(children).filter(
        (child) => !(React.isValidElement(child) && child.type === 'summary')
      );
      return (
        <ReasoningBox lightMode={lightMode} isStreaming={isCurrentStreamingMessage}>
          {contentWithoutSummary}
        </ReasoningBox>
      );
    },
    code: ({ node, inline, className, children, ...props }) => {
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
  };

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
              <StreamingMarkdownRenderer 
                content={message.content || ''} 
                isStreaming={isCurrentStreamingMessage}
                lightMode={lightMode}
                components={markdownComponents}
              />

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

