import { useState, useEffect, useCallback, useRef, MutableRefObject } from 'react';
import { throttle } from '@/utils/data/throttle';
import { Conversation } from '@/types/chat'; // Assuming Conversation type path

interface UseChatScrollProps {
  chatContainerRef: MutableRefObject<HTMLDivElement | null>;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  selectedConversation: Conversation | undefined;
  messageIsStreaming: boolean;
}

export const useChatScroll = ({
  chatContainerRef,
  messagesEndRef,
  selectedConversation,
  messageIsStreaming,
}: UseChatScrollProps): { 
  showScrollDownButton: boolean; 
  handleScrollDown: () => void;
  autoScrollEnabled: boolean;
} => {
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState<boolean>(false);
  const scrollButtonLockRef = useRef<boolean>(false);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const messagesLength = selectedConversation?.messages?.length || 0;

  // Scrolls the chat container to the bottom smoothly.
  const handleScrollDown = useCallback(() => {
    if (chatContainerRef?.current) {
      isProgrammaticScrollRef.current = true;
      scrollButtonLockRef.current = true;
      setShowScrollDownButton(false);

      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });

      setAutoScrollEnabled(true);

      setTimeout(() => {
        scrollButtonLockRef.current = false;
      }, 1000); // Extended lock duration
    }
  }, [chatContainerRef]);

  // Scrolls precisely to the end of messages using messagesEndRef.
  const scrollDown = useCallback(() => {
    if (chatContainerRef?.current && messagesEndRef.current) {
      isProgrammaticScrollRef.current = true;
      scrollButtonLockRef.current = true;
      setShowScrollDownButton(false);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
        setAutoScrollEnabled(true);

        setTimeout(() => {
          scrollButtonLockRef.current = false;
        }, 1000); // Extended lock duration
      }, 10); // Small delay
    }
  }, [chatContainerRef, messagesEndRef]);

  // Throttled version of scrollDown for performance.
  const throttledScrollDown = useCallback(
    throttle(scrollDown, 100),
    [scrollDown]
  );

  // Effect 1: Scroll down on initial mount or when conversation changes if messages exist.
  useEffect(() => {
    if (messagesLength > 0) {
        // Use handleScrollDown for general scroll-to-bottom behavior on change
        setTimeout(() => {
            handleScrollDown();
        }, 100);
    }
    // Intentionally disable reacting to handleScrollDown to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id, messagesLength]);


  // Effect 2: Handle scroll events and update scroll button visibility based on user scroll.
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const target = chatContainerRef.current;
      if (!target) return;

      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = target;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;
      const bottomThreshold = 5;
      const isNearBottom = scrollPosition < bottomThreshold;

      if (!isNearBottom) {
        setAutoScrollEnabled(current => {
          if (current === true) return false;
          return current;
        });
        setShowScrollDownButton(current => {
          if (!current && !scrollButtonLockRef.current) return true;
          return current;
        });
      } else {
        setAutoScrollEnabled(current => {
          if (current === false) return true;
          return current;
        });
        setShowScrollDownButton(current => {
          if (current === true) return false;
          return current;
        });
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [chatContainerRef, autoScrollEnabled, showScrollDownButton]);


  // Effect 3: Scroll down automatically when new messages arrive or streaming ends, if autoScrollEnabled.
  useEffect(() => {
      if (!autoScrollEnabled) return;

      const lastMessage = selectedConversation?.messages[messagesLength - 1];
      if (!lastMessage) return;

      const updateScroll = () => {
          if (!chatContainerRef.current || !autoScrollEnabled) return;

          isProgrammaticScrollRef.current = true;
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });

      };

      if (lastMessage.content || !messageIsStreaming) {
           requestAnimationFrame(updateScroll);
       }

  }, [
    messageIsStreaming,
    autoScrollEnabled,
    chatContainerRef,
    messagesEndRef,
    messagesLength
  ]);

  return { showScrollDownButton, handleScrollDown, autoScrollEnabled };
}; 