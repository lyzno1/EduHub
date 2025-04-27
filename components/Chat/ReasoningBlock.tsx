import React, { useState, useEffect, FC, useRef } from 'react';
import {
  IconAtom,
  IconChevronUp,
  IconChevronDown,
} from '@tabler/icons-react';
import Spinner from '../Spinner/Spinner'; // Import the Spinner component
// Remove unused imports if they were only for preprocessing
// import { updateConversation } from '@/utils/app/conversation';
// import { Message } from '@/types/chat';

// --- Helper Functions (Needed within ReasoningBlock) ---
const hasEndFlag = (children: any): boolean => {
  if (typeof children === 'string')
    return children.includes('[ENDREASONINGFLAG]');

  if (Array.isArray(children))
    return children.some(child => hasEndFlag(child));

  // Check props.children which might be an element with further children
  if (React.isValidElement(children) && children.props && typeof children.props === 'object' && 'children' in children.props)
      return hasEndFlag(children.props.children);


  return false;
};

const removeEndFlag = (children: any): any => {
  if (typeof children === 'string')
    return children.replace('[ENDREASONINGFLAG]', '');

  if (Array.isArray(children))
    return children.map(child => removeEndFlag(child));

  // Recursively remove from props.children
  if (React.isValidElement(children) && children.props && typeof children.props === 'object' && 'children' in children.props) {
       // Explicitly define the props type for cloneElement
       const newProps: React.Attributes & { children?: React.ReactNode } = {
            ...children.props, // Now safe to spread
            children: removeEndFlag(children.props.children), // Now safe to access
       };
       return React.cloneElement(
          children,
          newProps
       );
  }
  // Return child as is if it's not a string, array, or element with children to process
  return children;
};
// --- End Helper Functions ---


interface ReasoningBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  lightMode: string;
  // node?: any; // From ReactMarkdown if needed
  // Props like 'data-reasoning-block' are no longer relevant here
}

// We accept className passed down from ReactMarkdown's component mapping
const ReasoningBlock: FC<ReasoningBlockProps> = ({ children, lightMode, className, ...props }) => {
  const [isComplete, setIsComplete] = useState(() => hasEndFlag(children));
  const [isOpen, setIsOpen] = useState(true);
  // Remove ellipsis state and effect
  // const [ellipsis, setEllipsis] = useState('');
  // const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to update completion status when children change (due to streaming)
  useEffect(() => {
    setIsComplete(hasEndFlag(children));
  }, [children]);

  // Remove ellipsis animation effect
  // useEffect(() => {
  //   // ... (effect logic for ellipsis)
  // }, [isComplete]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const displayContent = removeEndFlag(children);

  return (
    <div
      {...props}
      className={`reasoning-box-container my-2 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-850 dark:border-gray-700/40 ${className || ''}`}
    >
      {/* Header */}
      <div
        className={`reasoning-box-header flex items-center justify-between px-3 py-2 list-none 
                   ${!isComplete ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50'} 
                   bg-gray-50 dark:bg-gray-700/30 
                   border-b border-gray-200 dark:border-gray-700/40 
                   font-medium text-sm text-gray-600 dark:text-gray-300 transition-colors rounded-t-md 
                   select-none`}
        onClick={handleToggle}
      >
        <span className="flex items-center gap-2">
          <IconAtom size={16} className="text-blue-500" />
          {/* Conditional rendering for Spinner */} 
          {!isComplete ? (
            <>
              正在推理
              {/* Use Spinner component, remove invalid 'loading' prop */}
              <Spinner className="h-3 w-3 text-gray-600 dark:text-gray-300 ml-1" /> 
            </>
          ) : (
            "已完成推理"
          )}
        </span>
        {isComplete && (isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />)}
      </div>

      {/* Content Area */}
      <div 
        className={`reasoning-box-content overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out 
                   ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'} 
                   pl-5 pr-5 py-2 border-l-4 border-gray-300 dark:border-gray-600 
                   text-sm text-gray-600 dark:text-gray-300 leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 
                   bg-transparent dark:bg-transparent 
                   mt-1 mb-1 ml-1`}
      >
        {/* Render the cleaned content */}
        {displayContent}
      </div>
    </div>
  );
};

export default ReasoningBlock; 