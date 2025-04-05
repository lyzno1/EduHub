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
  const [inputHeight, setInputHeight] = useState<number>(65); // 默认高度

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
    
    // 调整高度
    adjustHeight();
  };

  // 创建一个辅助函数来处理调整高度
  const adjustHeight = useCallback(() => {
    // 移除延迟，直接调整高度
    if (textareaRef.current) {
      // 使用更稳定的方式重置高度，避免闪烁
      textareaRef.current.style.height = '1px'; // 先设置为1px确保内容能撑开高度
      
      // 获取内容实际需要的高度
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 220;
      
      // 如果内容为空，设置一个统一的最小高度
      // 由于增加了字体大小，最小高度也适当增加
      const newHeight = content.trim() === '' 
        ? 28  // 最小高度增加到28px，适应更大的字体
        : Math.min(scrollHeight, maxHeight);
      
      // 设置新高度
      textareaRef.current.style.height = `${newHeight}px`;
      
      // 处理滚动条，确保一致的行为
      // 即使内容不足，也保持滚动条的样式一致性，只是在需要时才显示滚动功能
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.overflow = 'auto';
        textareaRef.current.classList.add('scrollbar-thin');
      } else {
        textareaRef.current.style.overflow = 'hidden';
        // 仍然保留scrollbar-thin类，以便样式保持一致
        textareaRef.current.classList.add('scrollbar-thin');
      }
      
      // 确保容器高度与内容一致，避免抖动
      // 增加容器padding以适应更大的字体
      const containerPadding = 44; // 顶部和底部padding总和增加
      const newContainerHeight = Math.max(69, newHeight + containerPadding); // 最小高度也相应增加
      setInputHeight(newContainerHeight);
    }
  }, [textareaRef, content]);

  // 重置输入框
  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px'; // 增加到28px
      textareaRef.current.style.overflow = 'hidden';
      // 保持滚动条样式类
      textareaRef.current.classList.add('scrollbar-thin');
      setInputHeight(69); // 增加到69px
    }
  }, [textareaRef]);

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

    // 重置输入框高度
    resetHeight();

    if (window.innerWidth < 640 && textareaRef?.current) {
      textareaRef.current.blur();
    }
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

  // 当selectedConversation改变时，重置输入内容并调整高度
  useEffect(() => {
    if (selectedConversation?.id) {
      setContent('');
      resetHeight();
    }
  }, [selectedConversation?.id, resetHeight]);

  // 初始化高度设置和调整窗口大小时重新计算高度
  useEffect(() => {
    adjustHeight();
    
    // 添加窗口大小变化监听器
    window.addEventListener('resize', adjustHeight);
    return () => {
      window.removeEventListener('resize', adjustHeight);
    };
  }, [content, adjustHeight]);

  // 更新样式内容，确保平滑过渡和一致的padding
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
      /* 自定义滚动条样式 - 增强版 */
      .scrollbar-thin::-webkit-scrollbar {
        width: 6px !important;
        height: 6px !important;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent !important;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background: rgba(155, 155, 155, 0.5) !important;
        border-radius: 10px !important;
        border: none !important;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: rgba(155, 155, 155, 0.7) !important;
      }
      /* 暗黑模式下的滚动条 */
      .dark-mode .scrollbar-thin::-webkit-scrollbar-thumb,
      .chat-input-dark-mode .scrollbar-thin::-webkit-scrollbar-thumb {
        background: rgba(200, 200, 200, 0.3) !important;
      }
      .dark-mode .scrollbar-thin::-webkit-scrollbar-thumb:hover,
      .chat-input-dark-mode .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: rgba(200, 200, 200, 0.5) !important;
      }
      /* Firefox 支持 */
      .scrollbar-thin {
        scrollbar-width: thin !important;
        scrollbar-color: rgba(155, 155, 155, 0.5) transparent !important;
      }
      .dark-mode .scrollbar-thin,
      .chat-input-dark-mode .scrollbar-thin {
        scrollbar-color: rgba(200, 200, 200, 0.3) transparent !important;
      }
      /* 确保输入框容器的滚动条也正确显示 */
      .textarea-container-scrollbar::-webkit-scrollbar {
        width: 6px !important;
        height: 6px !important;
      }
      .textarea-container-scrollbar::-webkit-scrollbar-track {
        background: transparent !important;
      }
      .textarea-container-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(155, 155, 155, 0.5) !important;
        border-radius: 10px !important;
        border: none !important;
      }
      .textarea-container-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(155, 155, 155, 0.7) !important;
      }
      /* 暗黑模式下的容器滚动条 */
      .dark-mode .textarea-container-scrollbar::-webkit-scrollbar-thumb,
      .chat-input-dark-mode .textarea-container-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(200, 200, 200, 0.3) !important;
      }
      .dark-mode .textarea-container-scrollbar::-webkit-scrollbar-thumb:hover,
      .chat-input-dark-mode .textarea-container-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(200, 200, 200, 0.5) !important;
      }
      /* Firefox 支持容器滚动条 */
      .textarea-container-scrollbar {
        scrollbar-width: thin !important;
        scrollbar-color: rgba(155, 155, 155, 0.5) transparent !important;
      }
      .dark-mode .textarea-container-scrollbar,
      .chat-input-dark-mode .textarea-container-scrollbar {
        scrollbar-color: rgba(200, 200, 200, 0.3) transparent !important;
      }
      /* 平滑过渡效果 - 使用更平滑的过渡 */
      .textarea-transition {
        transition: none !important; /* 改为直接变化，无过渡 */
      }
      /* 输入区域容器样式 */
      .input-container {
        transition: none !important; /* 改为直接变化，无过渡 */
      }
      /* 输入区域内容容器 */
      .input-content-container {
        transition: none !important; /* 改为直接变化，无过渡 */
        padding-top: 14px !important;
        padding-bottom: 12px !important;
      }
      /* 添加滚动按钮动画 */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
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
  }, [lightMode]);

  // 更新高度时，也更新data属性
  useEffect(() => {
    if (inputContainerRef.current) {
      inputContainerRef.current.setAttribute('data-input-height', inputHeight.toString());
    }
  }, [inputHeight]);

  // 根据是否有消息决定输入框容器位置
  return (
    <div
      className={isCentered 
        ? "absolute top-1/2 left-0 w-full px-4 pb-8 z-20 transform -translate-y-1/2" // 居中模式继续使用绝对定位
        : "absolute bottom-0 left-0 w-full px-4 pb-2 z-20" // 底部模式继续使用绝对定位
      }
      ref={inputContainerRef}
      data-input-height={inputHeight}
    >
      <div
        className={`relative flex flex-col rounded-3xl input-container ${isDarkMode() ? 'chat-input-dark-bg chat-input-dark-mode' : ''}`}
        style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          backgroundColor: isDarkMode() ? '#343541' : getBgColor(),
          border: isDarkMode() ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid transparent',
          boxShadow: isDarkMode() ? '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px -1px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 8px 15px -3px rgba(0, 0, 0, 0.1), 0 12px 20px -5px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* 这里是真正的输入区，高度根据内容动态变化但不会影响外部布局 */}
        <div 
          className={`min-h-[65px] overflow-y-auto rounded-t-3xl px-6 ${isDarkMode() ? 'chat-input-dark-bg' : ''} input-content-container textarea-container-scrollbar`}
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: isDarkMode() ? '#343541' : getBgColor(),
            maxHeight: '260px', // 统一设置为容器最大高度
          }}
        >
          <textarea
            ref={textareaRef as MutableRefObject<HTMLTextAreaElement>}
            className={`w-full flex-grow resize-none border-0 p-0 text-[16px] focus:outline-none focus:ring-0 ${isDarkMode() ? 'modern-input-dark' : 'modern-input-light'} textarea-transition scrollbar-thin`}
            style={{
              backgroundColor: 'transparent',
              color: isDarkMode() ? '#FFFFFF' : '#1A1A1A',
              minHeight: '28px',
              maxHeight: '220px', // 统一设置为输入框最大高度
              transition: 'none', // 改为直接变化，无过渡
              lineHeight: '1.5', // 增加行高以提高可读性
            }}
            placeholder={t('有什么可以帮您的吗？') || ''}
            value={content}
            rows={1}
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={adjustHeight}
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
        <div className="fixed bottom-[120px] right-8 z-50 animate-fade-in" style={{ 
          transition: "opacity 0.3s ease",
          animation: "fadeIn 0.3s ease-in-out"
        }}>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: isDarkMode() ? 'rgba(75, 85, 99, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              color: isDarkMode() ? '#d1d5db' : '#6b7280',
              boxShadow: isDarkMode() ? '0 2px 8px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
              transform: 'translateZ(0)',
              willChange: 'transform, opacity',
              transition: 'transform 0.2s ease, opacity 0.2s ease'
            }}
            onClick={onScrollDownClick}
          >
            <IconArrowUp size={20} className="rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}; 