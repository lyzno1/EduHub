import {
  IconCheck,
  IconCopy,
  IconEdit,
} from '@tabler/icons-react';

import React, { useState, useEffect, FC, memo, useContext, useRef } from 'react';

import { useTranslation } from 'next-i18next';

import { updateConversation } from '@/utils/app/conversation';

import { Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import ReactMarkdown, { Options, Components as ReactMarkdownComponents } from 'react-markdown';
import ReasoningBlock from './ReasoningBlock';

// --- Revised Preprocessing Function ---
const preprocessReasoningTags = (content: string): string => {
  if (typeof content !== 'string') return content;

  let processedContent = content;

  // 1. Replace opening <think> specifically, ensuring newline if present
  // Tries to match <think> possibly followed by a newline
  processedContent = processedContent.replace(/<think>(\n)?/g, '<details data-reasoning-block="true">\n');

  // 2. Replace closing </think> specifically, ensuring newline and adding flag
  // Tries to match newline (optional) followed by </think>
  processedContent = processedContent.replace(/(\n)?<\/think>/g, '\n[ENDREASONINGFLAG]</details>');


   // 3. Handle potential $$..$$ within the block for KaTeX - Run AFTER tag conversion
   // Target content within the marked <details> blocks
   // This regex needs to be robust against partial matches during streaming
   processedContent = processedContent.replace(/(<details data-reasoning-block="true"[^>]*>)([\s\S]*?)(\[ENDREASONINGFLAG\]<\/details>)/g, (match, startTag, innerContent, endTag) => {
        // Escape $$ only within the inner content part
       const katexProcessed = innerContent.replaceAll(/\$\$([\s\S]*?)\$\$/g, '`$$$$$1$$$$`');
       return `${startTag}${katexProcessed}${endTag}`; // Reconstruct with the flag and closing tag
   });


  // IMPORTANT: We are NOT converting existing <details> tags anymore.
  // The component mapping will ONLY handle <details> created from <think>.

  return processedContent;
};

// --- Function for Empty Check (Uses the stripping logic) ---
const checkCleanedContentIsEmpty = (rawContent: string): boolean => {
    if (typeof rawContent !== 'string') return true;
    let cleaned = rawContent;
    // Prioritize removing the details block structure first
    cleaned = cleaned.replace(/<details data-reasoning-block="true"[^>]*>[\s\S]*?\[ENDREASONINGFLAG\]<\/details>/g, '');
    // Fallback to removing think tags if details weren't found
     if (cleaned === rawContent) {
          cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
     }
    return cleaned.trim() === '';
};

// --- Revised Component Mapping ---
// Define components map type - Map 'details' created from 'think'
interface CustomComponents extends ReactMarkdownComponents {
  code?: React.FC<any>; 
  details?: React.FC<any>; // Will only be used for our marked details
}

/**
 * @component StreamingMarkdownRenderer
 * 
 * Preprocesses Markdown content to convert <think>/<details> into marked <details> tags
 * with an internal [ENDREASONINGFLAG]. Renders the processed content, mapping the
 * marked <details> tags to the ReasoningBlock component.
 */
interface StreamingMarkdownRendererProps {
  content: string; // Raw Markdown content (will be preprocessed)
  lightMode: string;
  components: Omit<CustomComponents, 'details'>; // Base components
}

const StreamingMarkdownRenderer: FC<StreamingMarkdownRendererProps> = ({ 
  content,
  lightMode,
  components, // Base components like 'code'
}) => {

  // Preprocess the content BEFORE passing to ReactMarkdown
  const processedContent = preprocessReasoningTags(content);

  // Define the components map for ReactMarkdown
  const enhancedComponents: CustomComponents = {
    ...components, // Include base components
    // Map ONLY 'details' tag to ReasoningBlock
    details: (props: any) => {
      // Rely on the data attribute added during preprocessing
      if (props['data-reasoning-block'] === 'true') {
           // Pass lightMode and children (which contain the content + flag)
          return <ReasoningBlock lightMode={lightMode} {...props} />;
      }
      // Render standard details if NOT marked by us (preserves normal details usage)
      return <details {...props}>{props.children}</details>;
    },
  };

  // Render the PREPROCESSED content
  return (
        <MemoizedReactMarkdown
          className="prose dark:prose-invert max-w-none w-full text-gray-900 dark:text-gray-100"
          remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeRaw as any]} // rehypeRaw is essential
      components={enhancedComponents}
    >
      {processedContent}
        </MemoizedReactMarkdown>
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

// --- cleanReasoningContent needs adjustment ---
// Helper function ONLY for cleaning content for copying/empty checks
// Needs to work on RAW content
const cleanReasoningContent = (rawContent: string): string => {
    if (typeof rawContent !== 'string') return rawContent;
    let cleaned = rawContent;
    // Just remove the <think> tags for cleaning
    cleaned = cleaned.replace(/<think>([\s\S]*?)<\/think>/g, '$1');
    // Also remove any standard details tags if they shouldn't be copied/checked
    // cleaned = cleaned.replace(/<details[^>]*>([\s\S]*?)<\/details>/g, '$1');
    // The ENDREASONINGFLAG should not exist in rawContent
    return cleaned.trim();
};


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

   // --- Handlers remain the same ---
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

    const copyUserMessage = () => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(message.content).then(() => {
        setUserMessageCopied(true);
        setTimeout(() => {
            setUserMessageCopied(false);
        }, 2000);
        });
    };

  // --- Final copyOnClick (Copies the RAW content) ---
  const copyOnClick = () => {
    if (!navigator.clipboard) return;
    const contentToCopy = message.content || ''; // Get the raw content directly

    // Log what is being copied
    // console.log("Copying raw content:", JSON.stringify(contentToCopy));

    // Remove the .replace() logic entirely
    // const contentToCopy = rawContent.replace(/<think>([\s\S]*?)<\/think>/g, '$1').trim(); // REMOVE THIS LINE

    navigator.clipboard.writeText(contentToCopy).then(() => {
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

  const isUser = message.role === 'user';

  // --- Use updated empty check ---
  const isEmptyAssistantMessage = !isUser && checkCleanedContentIsEmpty(message.content || '');
  if (isEmptyAssistantMessage && !messageIsStreaming) {
    return null;
  }

  // Define the base components mapping (passed to StreamingMarkdownRenderer)
   const markdownComponents: Omit<CustomComponents, 'details'> = { // Exclude 'details'
    code: ({ node, inline, className, children, ...props }) => {
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
     // Add other base component mappings if needed (p, a, img...)
  };


  return (
    <div className={`flex justify-center py-3 w-full`}>
      <div className={`w-full max-w-[800px] px-2 sm:px-4`}>
        {isUser ? (
          // --- User Message Rendering (remains the same) ---
          <div className="flex justify-end">
            {/* ... existing user message JSX ... */}
            <div className="max-w-[75%]">
               {/* ... existing user message JSX ... */}
              <div className="group relative">
                {isEditing ? (
                  <div className="flex w-full flex-col">
                    <textarea
                      ref={textareaRef}
                      className="w-full resize-none whitespace-pre-wrap border border-gray-300 bg-white rounded-2xl p-3 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
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
                    <div className="absolute bottom-2 right-0 flex items-center gap-1.5 flex md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
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
          // --- Assistant Message Rendering ---
          <div className="w-full">
            <div className="max-w-none w-full">
              {/* StreamingMarkdownRenderer uses preprocessing internally now */}
              <StreamingMarkdownRenderer 
                content={message.content || ''} 
                lightMode={lightMode}
                components={markdownComponents}
              />
              {/* Copy button shown when not streaming */}
              {message.content && !messageIsStreaming && (
                 <div className="relative mt-2 flex justify-start">
                   <button
                    className={`flex items-center justify-center rounded-md p-1 px-1.5 text-xs
                    text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700
                    transition-colors duration-200 shadow-sm`}
                    onClick={copyOnClick} // Uses updated logic
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

