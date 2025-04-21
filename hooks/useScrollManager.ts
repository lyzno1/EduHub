import { RefObject, useState, useEffect, useCallback, useRef } from 'react';
import { Conversation } from '@/types/chat';
import { throttle } from '@/utils/data/throttle';

interface UseScrollManagerProps {
  chatContainerRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  messagesLength: number;
  selectedConversationId?: string;
  messageIsStreaming: boolean;
}

interface UseScrollManagerResult {
  autoScrollEnabled: boolean;
  showScrollDownButton: boolean;
  scrollToBottom: () => void;
  scrollDownPrecise: () => void;
}

/**
 * 管理聊天区域的滚动功能
 * 
 * @param props 配置参数
 * @returns 滚动状态和控制函数
 */
export const useScrollManager = (props: UseScrollManagerProps): UseScrollManagerResult => {
  const {
    chatContainerRef,
    messagesEndRef,
    messagesLength,
    selectedConversationId,
    messageIsStreaming
  } = props;

  // 内部状态
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState<boolean>(false);
  
  // 防止按钮状态在短时间内频繁变化的锁
  const scrollButtonLockRef = useRef<boolean>(false);

  // 滚动到底部的函数 (使用 scrollTo 方法)
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef?.current) {
      // 锁定滚动按钮状态变化，防止闪烁
      scrollButtonLockRef.current = true;
      // 立即隐藏按钮
      setShowScrollDownButton(false);
      
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      
      setAutoScrollEnabled(true);
      
      // 滚动动画完成后解锁，延长时间
      setTimeout(() => {
        scrollButtonLockRef.current = false;
      }, 1000);
    }
  }, [chatContainerRef]);

  // 用于精确滚动到消息末尾的函数 (使用 scrollIntoView 方法)
  const scrollDownPrecise = useCallback(() => {
    if (chatContainerRef?.current && messagesEndRef.current) {
      // 锁定滚动按钮状态变化，防止闪烁
      scrollButtonLockRef.current = true;
      // 设置按钮立即隐藏
      setShowScrollDownButton(false);
      
      // 延迟滚动一小段时间，确保按钮状态已更新
      setTimeout(() => {
        // 使用 messagesEndRef 实现精确滚动
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
        
        setAutoScrollEnabled(true);
        
        // 滚动动画完成后解锁 - 延长锁定时间
        setTimeout(() => {
          scrollButtonLockRef.current = false;
        }, 1000);
      }, 10);
    }
  }, [chatContainerRef, messagesEndRef]);
  
  // 使用节流减少 scrollDownPrecise 的调用频率
  const throttledScrollDown = useCallback(
    throttle(scrollDownPrecise, 100),
    [scrollDownPrecise]
  );

  // 确保组件挂载和对话切换时自动滚动到底部
  useEffect(() => {
    // 如果有消息，在组件挂载或对话切换时自动滚动到底部
    if (messagesLength > 0) {
      // 简单地直接调用滚动函数
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [selectedConversationId, scrollToBottom, messagesLength]); // 只在对话ID变化时触发

  // 监听滚动事件，同时支持触摸和鼠标事件
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;
      
      const isInitialState = messagesLength === 0;
      const isUserInteracting = document.body.classList.contains('user-is-interacting');
      
      if (scrollPosition > 100 && !scrollButtonLockRef.current && !isUserInteracting) {
        setAutoScrollEnabled(false);
        if (!isInitialState) {
          setShowScrollDownButton(true);
        } else {
          setShowScrollDownButton(false);
        }
      } else if (scrollPosition <= 100 && !isUserInteracting) {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    };
    
    // 统一处理用户交互事件
    const handleInteractionStart = () => {
      document.body.classList.add('user-is-interacting');
    };
    
    const handleInteractionEnd = () => {
      document.body.classList.remove('user-is-interacting');
      handleScroll();
    };
    
    const container = chatContainerRef.current;
    
    // 移动端触摸事件
    container.addEventListener('touchstart', handleInteractionStart, { passive: true });
    container.addEventListener('touchend', handleInteractionEnd, { passive: true });
    
    // 桌面端鼠标事件
    container.addEventListener('mousedown', handleInteractionStart);
    container.addEventListener('mouseup', handleInteractionEnd);
    
    // 滚动事件
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleInteractionStart);
      container.removeEventListener('touchend', handleInteractionEnd);
      container.removeEventListener('mousedown', handleInteractionStart);
      container.removeEventListener('mouseup', handleInteractionEnd);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [chatContainerRef, messagesLength]);

  // 优化消息流更新
  useEffect(() => {
    if (messagesLength === 0 || !autoScrollEnabled) return;
    
    const updateScroll = () => {
      if (!chatContainerRef.current || !autoScrollEnabled) return;
      
      const shouldScroll = !document.body.classList.contains('user-is-interacting');
      if (shouldScroll) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };
    
    // 使用 requestAnimationFrame 优化滚动性能
    requestAnimationFrame(updateScroll);
  }, [messagesLength, autoScrollEnabled, chatContainerRef]);

  return {
    autoScrollEnabled,
    showScrollDownButton,
    scrollToBottom,
    scrollDownPrecise
  };
}; 