import React from 'react';
import { IconX, IconHelp, IconLoader } from '@tabler/icons-react';
import { useMetadata } from '@/context/MetadataContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const metadata = useMetadata();

  if (!isOpen) {
    return null;
  }

  // Correctly format content: replace \n with actual newline, \t with spaces
  const formatContent = (content: string | undefined) => {
    if (!content) return '';
    // Ensure newlines and tabs are preserved correctly for <pre>
    return content.replace(/\\n/g, '\n').replace(/\\t/g, '    ');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" // Slightly darker backdrop
      onClick={onClose}
    >
      <div
        // Changed dark mode background from dark:bg-gray-850 to dark:bg-[#202123] for better dark mode adaptation
        className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-[#202123] shadow-xl p-6 pt-8 md:p-8 md:pt-10 border border-transparent dark:border-gray-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button styling adjusted */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          onClick={onClose}
          aria-label="关闭"
        >
          <IconX size={22} />
        </button>

        {/* Title styling adjusted */}
        <div className="flex items-center mb-6">
          <IconHelp size={24} className="mr-2.5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            关于 BistuCopilot {/* Updated Title */}
          </h2>
        </div>

        {/* Content area styling: removed prose, added specific styles */}
        <div className="text-sm text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[65vh] pr-3 custom-scrollbar">
          {metadata ? (
            // Styling for <pre> tag: improved readability and colors
            <pre
              // Ensure pre background contrasts well with the new dialog background
              className="whitespace-pre-wrap font-mono text-[13.5px] leading-relaxed bg-gray-50 dark:bg-gray-800/60 p-4 rounded-md border border-gray-200 dark:border-gray-700"
            >
              {formatContent(metadata.aboutContent)}
            </pre>
          ) : (
            // Loading state styling adjusted
            <div className="flex items-center justify-center h-24 text-gray-500 dark:text-gray-400">
              <IconLoader size={28} className="animate-spin mr-3" />
              <span>正在加载关于信息...</span>
            </div>
          )}
        </div>

        {/* Optional: Add a subtle bottom padding or divider if needed */}
        {/* <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700/50"></div> */}
      </div>
    </div>
  );
};

// Add this CSS globally or in a relevant CSS file for custom scrollbar (optional)
/*
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}
*/