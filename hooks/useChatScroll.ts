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
  const messagesLength = selectedConversation?.messages?.length || 0;

  // Scrolls the chat container to the bottom smoothly.
  const handleScrollDown = useCallback(() => {
    if (chatContainerRef?.current) {
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


  // Effect 2: Handle scroll events, user interaction, and update scroll button visibility.
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!chatContainerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;

      const isInitialState = !selectedConversation || selectedConversation.messages.length === 0;
      const isUserInteracting = document.body.classList.contains('user-is-interacting');

      if (scrollPosition > 100 && !scrollButtonLockRef.current && !isUserInteracting) {
        setAutoScrollEnabled(false);
        if (!isInitialState) {
          setShowScrollDownButton(true);
        } else {
          setShowScrollDownButton(false); // Don't show button on welcome screen
        }
      } else if (scrollPosition <= 100 && !isUserInteracting) {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    };

    const handleInteractionStart = () => {
      document.body.classList.add('user-is-interacting');
    };

    const handleInteractionEnd = () => {
      document.body.classList.remove('user-is-interacting');
      // Re-evaluate scroll state after interaction ends
      handleScroll();
    };

    // Touch events
    container.addEventListener('touchstart', handleInteractionStart, { passive: true });
    container.addEventListener('touchend', handleInteractionEnd, { passive: true });
    // Mouse events
    container.addEventListener('mousedown', handleInteractionStart);
    container.addEventListener('mouseup', handleInteractionEnd);
    // Scroll event
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleInteractionStart);
      container.removeEventListener('touchend', handleInteractionEnd);
      container.removeEventListener('mousedown', handleInteractionStart);
      container.removeEventListener('mouseup', handleInteractionEnd);
      container.removeEventListener('scroll', handleScroll);
      // Ensure class is removed on unmount/cleanup
      document.body.classList.remove('user-is-interacting');
    };
  }, [chatContainerRef, selectedConversation, messagesLength]); // Dependencies


  // Effect 3: Scroll down automatically when new messages arrive or streaming ends, if autoScrollEnabled.
  useEffect(() => {
      if (!autoScrollEnabled) return;

      const lastMessage = selectedConversation?.messages[messagesLength - 1];
      if (!lastMessage) return;

      // Scrolls down when message content updates (streaming) or when streaming stops
      const updateScroll = () => {
          if (!chatContainerRef.current || !autoScrollEnabled) return;

          // Only scroll if user is not actively interacting
          const shouldScroll = !document.body.classList.contains('user-is-interacting');
          if (shouldScroll) {
              // Use precise scroll for streaming updates
              messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
          }
      };

      // Scroll when message content exists or streaming finishes
       if (lastMessage.content || !messageIsStreaming) {
           requestAnimationFrame(updateScroll);
       }

  }, [
    selectedConversation?.messages, // React to message list changes
    messageIsStreaming, // React to streaming state changes
    autoScrollEnabled,
    chatContainerRef,
    messagesEndRef,
    messagesLength // Include messagesLength to react to new messages being added
  ]);

  return { showScrollDownButton, handleScrollDown, autoScrollEnabled };
}; 