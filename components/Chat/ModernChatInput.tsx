import { IconArrowUp, IconPlus, IconX } from '@tabler/icons-react';
import {
  KeyboardEvent,
  MutableRefObject,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
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
  showSidebar?: boolean;
}

export const ModernChatInput = ({
  onSend,
  onRegenerate,
  onScrollDownClick,
  stopConversationRef,
  textareaRef,
  showScrollDownButton,
  isCentered,
  showSidebar,
}: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      messageIsStreaming,
      lightMode,
    },
  } = useContext(HomeContext);

  const [content, setContent] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPluginSelect, setShowPluginSelect] = useState<boolean>(false);
  const [activePlugin, setActivePlugin] = useState<Plugin | null>(null);

  const inputContainerRef = useRef<HTMLDivElement>(null);

  // getBgColor实现为记忆化函数，避免不必要的重新计算
  const getBgColor = useCallback(() => {
    if (lightMode === 'red') return '#F2ECBE';
    if (lightMode === 'blue') return '#F6F4EB';
    if (lightMode === 'green') return '#FAF1E4';
    if (lightMode === 'purple') return '#C5DFF8';
    if (lightMode === 'brown') return '#F4EEE0';
    return 'white';
  }, [lightMode]);

  // 黑暗模式固定颜色
  const DARK_MODE_COLOR = '#343541';

  // 判断是否为深色模式
  const isDarkMode = useCallback(() => {
    return lightMode === 'dark';
  }, [lightMode]);

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
    
    // 发送消息
    onSend({ role: 'user', content }, activePlugin);
    setContent('');
    setActivePlugin(null);

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
    
    // 简单直接的方式：等DOM更新后，找到最后一个用户消息气泡并滚动
    setTimeout(() => {
      const chatContainer = document.querySelector('.flex-1.overflow-y-auto');
      if (chatContainer) {
        // 强制滚动到顶部，这样用户消息就会显示在顶部
        chatContainer.scrollTop = 0;
        console.log('消息已发送，聊天区域已滚动到顶部');
      }
    }, 100);
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
      // 不再需要设置固定高度，因为外层div已经控制了高度
      // 只关注光标位置
      if (content) {
        const len = content.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }
  }, [content, textareaRef]);

  // 当selectedConversation改变时，重置输入内容
  useEffect(() => {
    if (selectedConversation?.id) {
      setContent(''); // 确保切换对话时，输入框是空的
    }
  }, [selectedConversation?.id]);

  // 添加自定义样式表，处理placeholder样式
  useEffect(() => {
    // 创建样式表
    const styleEl = document.createElement('style');
    // 确保ID唯一，避免重复添加
    styleEl.id = 'modern-chat-input-styles';
    
    // 设置样式内容
    styleEl.innerHTML = `
      .modern-input-dark::placeholder {
        color: rgba(156, 163, 175, 0.6) !important;
      }
      .modern-input-light::placeholder {
        color: rgba(107, 114, 128, 0.6) !important;
      }
      .chat-input-dark-bg {
        background-color: #343541 !important;
      }
      .chat-input-dark-mode {
        background-color: #343541 !important;
        border: 1px solid rgba(55, 65, 81, 0.5) !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px -1px rgba(0, 0, 0, 0.3) !important;
      }
    `;
    
    // 更新或添加样式表
    const existingStyle = document.getElementById('modern-chat-input-styles');
    if (existingStyle) {
      existingStyle.innerHTML = styleEl.innerHTML;
    } else {
      document.head.appendChild(styleEl);
    }
    
    // 组件卸载时移除样式表
    return () => {
      const existingStyle = document.getElementById('modern-chat-input-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [lightMode]); // 添加lightMode作为依赖项

  // 根据是否有消息决定输入框容器位置
  return (
    <div
      className={isCentered 
        ? "absolute bottom-0 left-0 w-full px-4 pb-8 z-20 transform translate-y-[-43vh]" 
        : "absolute bottom-0 left-0 w-full px-4 pb-2 z-20 transform translate-y-[-2vh]"
      }
      ref={inputContainerRef}
    >
      <div
        className={`relative flex flex-col rounded-3xl ${isDarkMode() ? 'chat-input-dark-bg chat-input-dark-mode' : ''}`}
        style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          backgroundColor: isDarkMode() ? '#343541' : getBgColor(),
          border: isDarkMode() ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid transparent',
          boxShadow: isDarkMode() ? '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px -1px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 8px 15px -3px rgba(0, 0, 0, 0.1), 0 12px 20px -5px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* 这里是真正的输入区，高度是固定的 */}
        <div 
          className={`h-[65px] overflow-y-auto rounded-t-3xl pt-4 px-5 ${isDarkMode() ? 'chat-input-dark-bg' : ''}`}
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: isDarkMode() ? '#343541' : getBgColor()
          }}
        >
          <textarea
            ref={textareaRef as MutableRefObject<HTMLTextAreaElement>}
            className={`w-full flex-grow resize-none border-0 p-0 text-[14px] focus:outline-none focus:ring-0 ${isDarkMode() ? 'modern-input-dark' : 'modern-input-light'}`}
            style={{
              backgroundColor: 'transparent',
              color: isDarkMode() ? '#FFFFFF' : '#1A1A1A',
              minHeight: '100%', 
              paddingTop: '3px',
            }}
            placeholder={t('有什么可以帮您的吗？') || ''}
            value={content}
            rows={1}
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        {/* 按钮区域，高度固定 */}
        <div 
          className="h-[42px] relative rounded-b-3xl"
          style={{ 
            backgroundColor: isDarkMode() ? '#343541' : getBgColor()
          }}
        >
          <button
            className="absolute top-[45%] -translate-y-1/2 left-2.5 flex h-9 w-9 items-center justify-center rounded-full z-10"
            style={{
              backgroundColor: isDarkMode() ? '#4b5563' : '#f3f4f6',
              color: isDarkMode() ? '#d1d5db' : '#6b7280',
              boxShadow: isDarkMode() ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
            }}
            onClick={() => setShowPluginSelect(!showPluginSelect)}
            aria-label="更多选项"
          >
            <IconPlus size={18} />
          </button>

          <button
            className="absolute top-[45%] -translate-y-1/2 right-2.5 flex h-9 w-9 items-center justify-center rounded-full z-10"
            style={{
              backgroundColor: isDarkMode() ? '#1f2937' : '#000000',
              color: '#FFFFFF',
              boxShadow: isDarkMode() ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none'
            }}
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
        </div>
        
        {activePlugin && (
          <div 
            className="flex items-center border-t px-3 py-2 text-xs"
            style={{ 
              backgroundColor: isDarkMode() ? '#343541' : getBgColor(),
              borderColor: isDarkMode() ? '#4b5563' : '#e5e7eb',
              color: isDarkMode() ? '#9ca3af' : '#6b7280'
            }}
          >
            <span className="mr-2">使用插件:</span>
            <span className="font-medium">{activePlugin.name}</span>
            <button
              className="ml-2"
              style={{
                color: isDarkMode() ? '#60a5fa' : '#3b82f6'
              }}
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
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: isDarkMode() ? '#4b5563' : '#FFFFFF',
              color: isDarkMode() ? '#d1d5db' : '#6b7280',
              boxShadow: isDarkMode() ? '0 2px 4px rgba(0, 0, 0, 0.4)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            }}
            onClick={onScrollDownClick}
          >
            <IconArrowUp size={18} className="rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}; 