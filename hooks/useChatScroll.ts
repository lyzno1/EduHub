import { useState, useEffect, useCallback, useRef, MutableRefObject } from 'react';
import { throttle } from '@/utils/data/throttle';

interface UseChatScrollProps {
  chatContainerRef: MutableRefObject<HTMLDivElement | null>;
  lastUserMessageSelector: string; // Selector for the last user message element
  // messagesEndRef is no longer needed for automatic streaming scroll
  // selectedConversation and messageIsStreaming are no longer needed for auto-scroll logic
}

export const useChatScroll = ({
  chatContainerRef,
  lastUserMessageSelector, // Destructure the new prop
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

  // Effect to handle scroll events for showing/hiding the scroll down button.
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
      const userMessages = target.querySelectorAll(lastUserMessageSelector);
      let isLastUserMessageVisible = true; // Default to true if no user messages

      if (userMessages.length > 0) {
          const lastUserMessage = userMessages[userMessages.length - 1];
          const containerRect = target.getBoundingClientRect();
          const lastMessageRect = lastUserMessage.getBoundingClientRect();
          const visibilityThreshold = 5; // Pixels threshold

          // Check if the bottom of the message is within the container's visible bottom edge
          isLastUserMessageVisible = lastMessageRect.bottom <= containerRect.bottom + visibilityThreshold;

      } else {
          // Fallback: If no user messages, use the original logic (check if near bottom)
          const { scrollTop, scrollHeight, clientHeight } = target;
          const bottomThreshold = 10; // Pixels threshold
          isLastUserMessageVisible = scrollHeight - scrollTop <= clientHeight + bottomThreshold;
      }


      // Show button only if the relevant element (last user msg or bottom) is NOT visible
      // No longer need to update autoScrollEnabled
      setShowScrollDownButton(!isLastUserMessageVisible);
    };

    const throttledHandleScroll = throttle(handleScroll, 150); // Throttle scroll events

    // Initial check in case the content loads scrolled up
    handleScroll();

    container.addEventListener('scroll', throttledHandleScroll);

    // Observe changes in children that might affect scroll height or message visibility
    const resizeObserver = new ResizeObserver(throttledHandleScroll);
    resizeObserver.observe(container);
    // Also observe direct children changes which might add/remove messages
    const mutationObserver = new MutationObserver(throttledHandleScroll);
    mutationObserver.observe(container, { childList: true, subtree: true });


    // Cleanup
    return () => {
      container.removeEventListener('scroll', throttledHandleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (programmaticScrollTimeoutRef.current) {
          clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
    // Add lastUserMessageSelector to dependencies
  }, [chatContainerRef, lastUserMessageSelector]);

  // Remove Effect 3 (auto-scrolling on message/stream changes)
  // useEffect(() => { ... });

  // Return only the button state and the manual scroll function.
  return { showScrollDownButton, handleScrollDown };
}; 