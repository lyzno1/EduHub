import { IconArrowUp, IconPlus, IconX, IconHelpCircle } from '@tabler/icons-react';
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
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  onSend: (message: Message, plugin: Plugin | null) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
  isCentered?: boolean;
  showSidebar?: boolean;
  isMobile?: boolean;
  handleStopConversation: () => void;
  messageIsStreaming: boolean;
  isDisabled?: boolean;
}

export const ModernChatInput = ({
  content,
  setContent,
  onSend,
  onRegenerate,
  onScrollDownClick,
  stopConversationRef,
  textareaRef,
  showScrollDownButton,
  isCentered,
  showSidebar,
  isMobile = false,
  handleStopConversation,
  messageIsStreaming,
  isDisabled,
}: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      lightMode,
      selectedGlobalModelName,
      activeAppId
    },
  } = useContext(HomeContext);

  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPluginSelect, setShowPluginSelect] = useState<boolean>(false);
  const [activePlugin, setActivePlugin] = useState<Plugin | null>(null);
  const [inputHeight, setInputHeight] = useState<number>(65); // 默认高度
  // 只在移动端添加键盘状态跟踪
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  const inputContainerRef = useRef<HTMLDivElement>(null);
  
  // 检测是否为移动设备
  const isDeviceMobile = isMobile || (typeof window !== 'undefined' && window.innerWidth < 640);
  
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
    adjustHeight(value);
  };

  // 创建一个辅助函数来处理调整高度
  const adjustHeight = useCallback((currentContent: string) => {
    // 移除延迟，直接调整高度
    if (textareaRef.current) {
      // 使用更稳定的方式重置高度，避免闪烁
      textareaRef.current.style.height = '1px'; // 先设置为1px确保内容能撑开高度
      
      // 获取内容实际需要的高度
      const scrollHeight = textareaRef.current.scrollHeight;
      // 移动端时使用更小的最大高度限制
      const maxHeight = isMobile ? 150 : 220;
      
      // 如果内容为空，设置一个统一的最小高度
      // 由于增加了字体大小，最小高度也适当增加
      const newHeight = currentContent.trim() === '' 
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
      // 移动端时使用更小的padding
      const containerPadding = isMobile ? 38 : 44; 
      const newContainerHeight = Math.max(isMobile ? 60 : 69, newHeight + containerPadding); 
      setInputHeight(newContainerHeight);
    }
  }, [textareaRef, isMobile]);

  // 重置输入框
  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px'; // 增加到28px
      textareaRef.current.style.overflow = 'hidden';
      // 保持滚动条样式类
      textareaRef.current.classList.add('scrollbar-thin');
      setInputHeight(isMobile ? 60 : 69); // 根据设备调整高度
    }
  }, [textareaRef, isMobile]);

  const handleSend = () => {
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
    adjustHeight(content);
    
    const handleResize = () => adjustHeight(content);
    // 添加窗口大小变化监听器
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [content, adjustHeight]);

  // 在组件内添加一个处理滚动事件的函数
  const handleWheel = useCallback((e: React.WheelEvent<HTMLTextAreaElement>) => {
    // 检查文本区域是否需要滚动
    const textarea = e.currentTarget;
    const isScrollable = textarea.scrollHeight > textarea.clientHeight;
    
    if (isScrollable) {
      // 检查是否到达边界
      const isAtTop = textarea.scrollTop === 0;
      const isAtBottom = textarea.scrollTop + textarea.clientHeight >= textarea.scrollHeight;
      
      // 根据滚动方向和是否在边界决定是否阻止冒泡
      if ((e.deltaY < 0 && !isAtTop) || (e.deltaY > 0 && !isAtBottom)) {
        e.stopPropagation();
      }
    }
  }, []);

  // 处理触摸事件，防止必要时的滚动冒泡
  const handleTextareaTouchMove = useCallback((e: React.TouchEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const isScrollable = textarea.scrollHeight > textarea.clientHeight;
    
    if (isScrollable) {
      // 确保文本区域可以独立滚动
      e.stopPropagation();
    }
  }, []);

  // 添加移动端焦点处理
  const handleFocus = useCallback(() => {
    if (isDeviceMobile) {
      setIsKeyboardOpen(true);
      // 仅在移动端添加键盘弹出标记
      document.documentElement.classList.add('keyboard-open');
    }
  }, [isDeviceMobile]);

  const handleBlur = useCallback(() => {
    if (isDeviceMobile) {
      setIsKeyboardOpen(false);
      // 移除键盘弹出标记
      document.documentElement.classList.remove('keyboard-open');
    }
  }, [isDeviceMobile]);

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
      /* 移动端样式优化 */
      .mobile-input-container {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }
      /* 添加滚动按钮动画 */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
      }
      
      /* 移动端样式 - 仅在小屏幕上应用 */
      @media (max-width: 767px) {
        .mobile-input-rounded {
          border-radius: 8px 8px 0 0 !important;
        }
        .mobile-input-shadow {
          box-shadow: 0 -3px 8px rgba(0, 0, 0, 0.08) !important;
        }
        .mobile-input-padding {
          padding-top: 3px !important;
        }
        /* 优化移动端滚动 */
        .input-content-container {
          -webkit-overflow-scrolling: touch !important; /* 增强iOS滚动体验 */
        }
        textarea.scrollbar-thin {
          -webkit-overflow-scrolling: touch !important;
        }
        
        /* 键盘弹出时的样式 - 仅限移动端 */
        html.keyboard-open .min-h-screen {
          height: auto !important;
        }
        
        html.keyboard-open .welcome-text {
          visibility: visible !important;
          opacity: 1 !important;
        }
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

  // 添加媒体查询样式
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 创建样式表
    const styleEl = document.createElement('style');
    styleEl.id = 'chat-welcome-mobile-styles';
    
    // 设置样式内容
    styleEl.innerHTML = `
      @media (max-width: 640px) {
        .welcome-text-container {
          position: static !important;
        }
        
        /* 防止欢迎页面滚动 */
        .chat-container-scrollbar:not(.flex-1) {
          overflow: hidden !important;
        }
        
        /* 确保输入框在欢迎页面定位正确 */
        .chat-welcome-input {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
        }
      }
    `;
    
    // 添加到头部
    document.head.appendChild(styleEl);
    
    // 清理函数
    return () => {
      const existingStyle = document.getElementById('chat-welcome-mobile-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // 更新高度时，也更新data属性
  useEffect(() => {
    if (inputContainerRef.current) {
      inputContainerRef.current.setAttribute('data-input-height', inputHeight.toString());
    }
  }, [inputHeight]);

  return (
    <div 
      className={`${isCentered 
        ? "absolute top-1/2 left-0 w-full px-4 pb-8 z-10 transform -translate-y-1/2 chat-welcome-input" // 居中模式继续使用绝对定位
        : isDeviceMobile 
          ? "w-full px-0 pb-0 z-10 absolute bottom-0 left-0 right-0 chat-welcome-input" // 移动端底部模式，移除内边距
          : "absolute bottom-0 left-0 w-full px-2 sm:px-4 pb-2 z-10 chat-welcome-input"
       } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      ref={inputContainerRef}
      data-input-height={inputHeight}
      title={isDisabled ? "请先选择一个应用卡片" : ""}
    >
      <div
        className={`relative flex flex-col rounded-xl sm:rounded-3xl input-container ${isDarkMode() ? 'chat-input-dark-bg chat-input-dark-mode' : ''} ${!isCentered && isDeviceMobile ? 'mobile-input-rounded' : ''}`}
        style={{ 
          maxWidth: !isCentered && isDeviceMobile ? '100%' : '800px', 
          width: !isCentered && isDeviceMobile ? '100%' : 'auto',
          margin: !isCentered && isDeviceMobile ? '0' : '0 auto',
          backgroundColor: isDarkMode() ? '#343541' : getBgColor(),
          border: isDarkMode() ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid transparent',
          boxShadow: isDarkMode() 
            ? '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px -1px rgba(0, 0, 0, 0.3)' 
            : isDeviceMobile && !isCentered
              ? '0 -2px 8px rgba(0, 0, 0, 0.05)' 
              : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 8px 15px -3px rgba(0, 0, 0, 0.1), 0 12px 20px -5px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* 这里是真正的输入区，高度根据内容动态变化但不会影响外部布局 */}
        <div 
          className={`${isDeviceMobile ? 'min-h-[45px]' : 'min-h-[50px] sm:min-h-[65px]'} overflow-y-auto ${isDeviceMobile ? 'rounded-t-xl' : 'rounded-t-xl sm:rounded-t-3xl'} ${isDeviceMobile ? 'px-3' : 'px-3 sm:px-6'} ${isDarkMode() ? 'chat-input-dark-bg' : ''} input-content-container textarea-container-scrollbar ${isDeviceMobile ? 'mobile-input-container' : ''} ${!isCentered && isDeviceMobile ? 'mobile-input-rounded' : ''}`}
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: isDarkMode() ? '#343541' : getBgColor(),
            maxHeight: isDeviceMobile ? '180px' : '260px', // 根据设备类型调整最大高度
          }}
        >
          <textarea
            ref={textareaRef as MutableRefObject<HTMLTextAreaElement>}
            className={`w-full flex-grow resize-none border-0 ${isDeviceMobile ? 'pt-3 mobile-input-padding' : 'p-0'} ${isDeviceMobile ? 'text-[14px]' : 'text-[15px] sm:text-[16px]'} focus:outline-none focus:ring-0 ${isDarkMode() ? 'modern-input-dark' : 'modern-input-light'} textarea-transition scrollbar-thin ${isDisabled ? 'cursor-not-allowed' : ''}`}
            style={{
              backgroundColor: 'transparent',
              color: isDarkMode() ? 'hsl(205deg, 16%, 77%)' : '#333333',
              minHeight: isDeviceMobile ? '20px' : '24px',
              maxHeight: isDeviceMobile ? '150px' : '220px', // 根据设备类型调整最大高度
              transition: 'none', // 改为直接变化，无过渡
              lineHeight: isDeviceMobile ? '1.3' : '1.5', // 移动端使用更紧凑的行高
              fontFamily: "'PingFang SC', Arial, sans-serif", // 添加字体样式
              letterSpacing: '0.2px', // 轻微调整字母间距
              paddingLeft: isDeviceMobile ? '2px' : '0',
              // 在移动端上确保可以选择和复制文本
              WebkitUserSelect: 'text',
              userSelect: 'text',
            }}
            placeholder={t('你想了解什么？') || ''}
            value={content}
            rows={1}
            disabled={isDisabled}
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={() => adjustHeight(content)}
            onWheel={handleWheel}
            onTouchMove={handleTextareaTouchMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        {/* 按钮区域，高度固定 */}
        <div 
          className={`${isDeviceMobile ? 'h-[32px]' : 'h-[36px] sm:h-[42px]'} relative ${isDeviceMobile ? 'rounded-b-xl' : 'rounded-b-xl sm:rounded-b-3xl'} flex items-center px-3`}
          style={{ 
            backgroundColor: isDarkMode() ? '#343541' : getBgColor()
          }}
        >
          {/* 左下角模型名称显示区域 - 使用 data-tooltip */}
          { 
            (activeAppId === null || activeAppId === 0) && // 条件1：没有正在激活的应用
            (!selectedConversation || selectedConversation.appId === null || selectedConversation.appId === 0) && // 条件2：当前选中的对话是全局的（或不存在）
            selectedGlobalModelName // 条件3：有全局模型名称
            ? (
             <div
               className="flex items-center px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-600 text-xs text-gray-600 dark:text-gray-300 mr-auto" // 移除 pointer-events-none
             >
               <span className="truncate max-w-[100px] sm:max-w-[150px]"> 
                 {selectedGlobalModelName}
               </span>
               {/* 将 data-tooltip 添加到包裹图标的 span */}
               <span 
                 className="ml-1 flex-shrink-0 cursor-help" 
                 data-tooltip="点击左下角设置按钮切换全局模型" // 使用 data-tooltip
                 data-placement="right" // 设置 tooltip 位置 (可调整)
               >
                 <IconHelpCircle 
                   size={14} 
                   className="text-gray-400 dark:text-gray-500" 
                 />
               </span>
             </div>
          ) : null}

          {/* 暂时隐藏更多选项按钮 - 如果取消注释，需要调整模型指示器的空间 */}
          {/* <button ... > <IconPlus /> </button> */}

          {/* 发送/停止按钮保持在右侧 */}
          {messageIsStreaming ? (
            <button
              className={`absolute top-1/2 -translate-y-1/2 right-2.5 flex ${isDeviceMobile ? 'h-7 w-7' : 'h-8 w-8 sm:h-9 sm:w-9'} items-center justify-center rounded-full z-10`}
              style={{
                backgroundColor: '#000000',
                opacity: 1,
                cursor: 'pointer',
                color: '#FFFFFF' 
              }}
              onClick={handleStopConversation}
              aria-label="停止生成"
            >
              <div style={{ width: isMobile ? '10px' : '12px', height: isMobile ? '10px' : '12px', backgroundColor: 'white' }}></div>
            </button>
          ) : (
            <button
              className={`absolute top-1/2 -translate-y-1/2 right-2.5 flex ${isDeviceMobile ? 'h-7 w-7' : 'h-8 w-8 sm:h-9 sm:w-9'} items-center justify-center rounded-full z-10`}
              style={{
                color: '#FFFFFF',
                boxShadow: isDarkMode() ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none',
                backgroundColor: '#000000',
                opacity: !content?.trim() ? 0.3 : 1,
                cursor: !content?.trim() ? 'default' : 'pointer' 
              }}
              onClick={handleSend}
              aria-label="发送消息"
              disabled={!content?.trim()}
            >
              <IconArrowUp size={isMobile ? 14 : 16} className={isMobile ? '' : 'sm:text-[18px]'} />
            </button>
          )}
        </div>
        
        {activePlugin && (
          <div 
            className={`flex items-center border-t px-3 py-2 ${isDeviceMobile ? 'text-[10px]' : 'text-xs'}`}
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
        <div className={`fixed ${isDeviceMobile ? 'bottom-[80px]' : 'bottom-[120px]'} right-4 sm:right-8 z-50 animate-fade-in`} style={{ 
          transition: "opacity 0.3s ease",
          animation: "fadeIn 0.3s ease-in-out"
        }}>
          <button
            className={`flex ${isDeviceMobile ? 'h-9 w-9' : 'h-10 w-10 sm:h-12 sm:w-12'} items-center justify-center rounded-full transition-all duration-300 hover:scale-105`}
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
            <IconArrowUp size={isDeviceMobile ? 16 : 18} className="rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}; 