import { useState, useEffect, useCallback, useRef, MutableRefObject } from 'react';
import { throttle } from '@/utils/data/throttle';

interface UseChatScrollProps {
  chatContainerRef: MutableRefObject<HTMLDivElement | null>;
  // messagesEndRef is no longer needed for automatic streaming scroll
  // selectedConversation and messageIsStreaming are no longer needed for auto-scroll logic
}

export const useChatScroll = ({
  chatContainerRef,
}: UseChatScrollProps): { 
  showScrollDownButton: boolean; 
  handleScrollDown: () => void;
  // autoScrollEnabled is removed
} => {
  // Remove autoScrollEnabled state
  // const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState<boolean>(false);
  // Ref to distinguish programmatic scroll (from button click) vs user scroll
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const programmaticScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Simple function to scroll smoothly to the bottom.
  const handleScrollDown = useCallback(() => {
    if (chatContainerRef?.current) {
      isProgrammaticScrollRef.current = true; // Mark as programmatic
      // No longer need to setAutoScrollEnabled(true);
      setShowScrollDownButton(false); // Hide button immediately

      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });

      // Reset the flag after a short delay
      if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
      }, 500); // Adjust timeout if needed
    }
  }, [chatContainerRef]);

  // Remove Effect 1 (initial scroll based on conversation change)
  // useEffect(() => { ... });

  // Effect to handle scroll events ONLY for showing/hiding the scroll down button.
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const target = chatContainerRef.current;
      if (!target) return;

      // If the scroll was triggered by our button click, ignore it
      if (isProgrammaticScrollRef.current) {
         // If the timeout is active, don't reset the flag here yet
         if (!programmaticScrollTimeoutRef.current) {
             isProgrammaticScrollRef.current = false;
         }
        return;
      }

      // User-initiated scroll detected
      const { scrollTop, scrollHeight, clientHeight } = target;
      const bottomThreshold = 10; // Pixels threshold
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + bottomThreshold;

      // Show button only if user scrolled up away from the bottom
      // No longer need to update autoScrollEnabled
      setShowScrollDownButton(!isNearBottom);
    };

    const throttledHandleScroll = throttle(handleScroll, 150); // Throttle scroll events

    container.addEventListener('scroll', throttledHandleScroll);

    // Cleanup
    return () => {
      container.removeEventListener('scroll', throttledHandleScroll);
      if (programmaticScrollTimeoutRef.current) {
          clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, [chatContainerRef]); // Re-run only if the container ref changes

  // Remove Effect 3 (auto-scrolling on message/stream changes)
  // useEffect(() => { ... });

  // Return only the button state and the manual scroll function.
  return { showScrollDownButton, handleScrollDown };
}; 