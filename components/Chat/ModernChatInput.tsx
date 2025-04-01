import { IconArrowUp, IconPlus, IconX } from '@tabler/icons-react';
import {
  KeyboardEvent,
  MutableRefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

interface Props {
  onSend: (message: Message, plugin: Plugin | null) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
  isCentered?: boolean;
}

export const ModernChatInput = ({
  onSend,
  onRegenerate,
  onScrollDownClick,
  stopConversationRef,
  textareaRef,
  showScrollDownButton,
  isCentered,
}: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      messageIsStreaming,
    },
  } = useContext(HomeContext);

  const [content, setContent] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPluginSelect, setShowPluginSelect] = useState<boolean>(false);
  const [activePlugin, setActivePlugin] = useState<Plugin | null>(null);

  const inputContainerRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      return;
    }
    
    onSend({ role: 'user', content }, activePlugin);
    setContent('');
    setActivePlugin(null);

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
    
    // 强化滚动到底部的逻辑，使用多次尝试确保滚动生效
    setTimeout(() => {
      onScrollDownClick();
      // 再次尝试滚动，确保真正到达底部
      setTimeout(onScrollDownClick, 150);
      setTimeout(onScrollDownClick, 300);
    }, 50);
  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && !e.shiftKey && isTyping) {
      setIsTyping(false);
    } else if (e.key === 'Enter' && e.shiftKey) {
      setIsTyping(true);
    }
  };

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, textareaRef]);

  // 创建输入框内容（确保在两种状态下完全一致）
  const renderInputBox = () => (
    <div
      className="relative flex flex-col rounded-3xl border border-gray-300 bg-white shadow-[0_0_15px_rgba(0,0,0,0.10)] dark:border-gray-700 dark:bg-[#40414f]"
      style={{ maxWidth: '800px', margin: '0 auto' }}
    >
      <textarea
        ref={textareaRef as MutableRefObject<HTMLTextAreaElement>}
        className="min-h-[120px] w-full resize-none rounded-3xl border-0 bg-transparent p-5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-white"
        placeholder={t('有什么可以帮您的吗？') || ''}
        value={content}
        rows={1}
        onCompositionStart={() => setIsTyping(true)}
        onCompositionEnd={() => setIsTyping(false)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      
      <button
        className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        onClick={() => setShowPluginSelect(!showPluginSelect)}
        aria-label="更多选项"
      >
        <IconPlus size={18} />
      </button>

      <button
        className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
        onClick={messageIsStreaming ? handleStopConversation : handleSend}
        aria-label={messageIsStreaming ? "停止生成" : "发送消息"}
        disabled={!messageIsStreaming && (!content || messageIsStreaming)}
      >
        {messageIsStreaming ? (
          <IconX size={18} />
        ) : (
          <IconArrowUp size={18} />
        )}
      </button>
      
      {activePlugin && (
        <div className="flex items-center border-t border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <span className="mr-2">使用插件:</span>
          <span className="font-medium">{activePlugin.name}</span>
          <button
            className="ml-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
            onClick={() => setActivePlugin(null)}
          >
            取消
          </button>
        </div>
      )}
    </div>
  );

  // 根据是否有消息决定输入框容器位置
  return (
    <div
      className={isCentered 
        ? "absolute left-0 right-0 mx-auto bottom-[30%] w-full max-w-3xl px-4 sm:px-8 transition-all duration-500" 
        : "absolute bottom-0 left-0 w-full px-4 pb-8 transition-all duration-500 z-10"
      }
      ref={inputContainerRef}
    >
      <div
        className="relative flex flex-col rounded-3xl border border-gray-300 bg-white shadow-[0_0_15px_rgba(0,0,0,0.10)] dark:border-gray-700 dark:bg-[#40414f]"
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        <textarea
          ref={textareaRef as MutableRefObject<HTMLTextAreaElement>}
          className="min-h-[120px] w-full resize-none rounded-3xl border-0 bg-transparent p-5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-white"
          placeholder={t('有什么可以帮您的吗？') || ''}
          value={content}
          rows={1}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        
        <button
          className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          onClick={() => setShowPluginSelect(!showPluginSelect)}
          aria-label="更多选项"
        >
          <IconPlus size={18} />
        </button>

        <button
          className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
          onClick={messageIsStreaming ? handleStopConversation : handleSend}
          aria-label={messageIsStreaming ? "停止生成" : "发送消息"}
          disabled={!messageIsStreaming && (!content || messageIsStreaming)}
        >
          {messageIsStreaming ? (
            <IconX size={18} />
          ) : (
            <IconArrowUp size={18} />
          )}
        </button>
        
        {activePlugin && (
          <div className="flex items-center border-t border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <span className="mr-2">使用插件:</span>
            <span className="font-medium">{activePlugin.name}</span>
            <button
              className="ml-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
              onClick={() => setActivePlugin(null)}
            >
              取消
            </button>
          </div>
        )}
      </div>

      {showScrollDownButton && (
        <div className="fixed bottom-[120px] right-8">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-md hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            onClick={onScrollDownClick}
          >
            <IconArrowUp size={18} className="rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}; 