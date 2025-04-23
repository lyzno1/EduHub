import { useState, useEffect } from 'react';

interface UseInputHeightObserverProps {
  messagesLength: number;
  // messageIsStreaming might not be strictly needed if messagesLength dictates the input mode
  // messageIsStreaming: boolean;
}

interface UseInputHeightObserverReturn {
  inputBoxHeight: number;
  isInputExpanded: boolean;
  bottomInputHeight: number;
}

export const useInputHeightObserver = ({
  messagesLength,
}: UseInputHeightObserverProps): UseInputHeightObserverReturn => {
  const [inputBoxHeight, setInputBoxHeight] = useState<number>(65); // Default height for welcome input
  const [isInputExpanded, setIsInputExpanded] = useState<boolean>(false);
  const [bottomInputHeight, setBottomInputHeight] = useState<number>(65); // Default height for chat input

  // Effect 1: Observe welcome screen input height (when no messages)
  useEffect(() => {
    // Only observe if there are no messages (welcome screen)
    if (messagesLength > 0) {
      // Reset welcome input state if messages appear
      setInputBoxHeight(65);
      setIsInputExpanded(false);
      return;
    }

    // Selector for the welcome screen's input container (adjust if needed)
    // This selector targets the desktop welcome input specifically.
    // Mobile input might need separate handling or a more general selector if structure differs significantly.
    const inputContainer = document.querySelector('.w-full.md\\:max-w-\\[800px\\].md\\:mx-auto.px-0.mx-0 .md\\:block [data-input-height]');
    if (!inputContainer) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-input-height') {
          const height = parseInt(inputContainer.getAttribute('data-input-height') || '65', 10);
          // Update only if height changes significantly
          if (Math.abs(height - inputBoxHeight) >= 5) {
            setInputBoxHeight(height);
            setIsInputExpanded(height > 70); // Assuming > 70 means expanded
          }
        }
      });
    });

    observer.observe(inputContainer, { attributes: true });

    // Initial check in case attribute is already set
    const initialHeight = parseInt(inputContainer.getAttribute('data-input-height') || '65', 10);
    setInputBoxHeight(initialHeight);
    setIsInputExpanded(initialHeight > 70);

    return () => {
      observer.disconnect();
    };
  }, [messagesLength, inputBoxHeight]); // Rerun if messagesLength changes or inputBoxHeight changes

  // Effect 2: Observe chat screen input height (when messages exist)
  useEffect(() => {
    // Only observe if there are messages
    if (messagesLength === 0) {
        // Reset bottom input state if messages are cleared
        setBottomInputHeight(65);
        return;
    }

    // Selector for the chat screen's bottom input container (adjust if needed)
    const bottomInputContainer = document.querySelector('.absolute.bottom-0.left-0.w-full.z-20 [data-input-height]');
    if (!bottomInputContainer) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-input-height') {
          const height = parseInt(bottomInputContainer.getAttribute('data-input-height') || '65', 10);
          // Update only if height changes significantly
          if (Math.abs(height - bottomInputHeight) >= 5) {
            setBottomInputHeight(height);
          }
        }
      });
    });

    observer.observe(bottomInputContainer, { attributes: true });

    // Initial check
    const initialHeight = parseInt(bottomInputContainer.getAttribute('data-input-height') || '65', 10);
    setBottomInputHeight(initialHeight);


    return () => {
      observer.disconnect();
    };
  }, [messagesLength, bottomInputHeight]); // Rerun if messagesLength changes or bottomInputHeight changes

  return { inputBoxHeight, isInputExpanded, bottomInputHeight };
}; 