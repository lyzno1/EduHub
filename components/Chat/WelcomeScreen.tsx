import React from 'react';
import { FunctionCards } from './FunctionCards';

interface WelcomeScreenProps {
  inputBoxHeight: number;
  isInputExpanded: boolean;
  handleScrollDown: () => void;
  setContent: React.Dispatch<React.SetStateAction<string>>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  inputBoxHeight,
  isInputExpanded,
  handleScrollDown,
  setContent,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full md:min-h-screen sm:overflow-hidden">
      {/* Title Area */}
      <div className="flex flex-col items-center text-center max-w-3xl w-full px-4 sm:px-8 welcome-text welcome-text-container"
        style={{
          /* Dynamic margin based on input expansion */
          marginTop: !isInputExpanded
            ? window.innerWidth < 768 ? '-20vh' : '-25vh'
            : window.innerWidth < 768
              ? `calc(-22vh - ${(inputBoxHeight - 65)}px)`
              : `calc(-27vh - ${(inputBoxHeight - 65)}px)`
        }}
      >
        {/* Logo and Title */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#CEFBFA] to-[#FCCD5E] rounded-lg blur-xl opacity-75 dark:opacity-60"></div>
          <h1 className="relative text-4xl font-bold tracking-tight mb-4 md:mb-4 bg-gradient-to-r from-[#272727] to-[#696969] dark:from-[#CEFBFA] dark:to-[#FCCD5E] bg-clip-text text-transparent drop-shadow-sm welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '-0.5px' }}>eduhub.chat</h1>
        </div>
        <p className="text-lg font-medium md:mb-20 mb-0 md:block hidden text-[#333333] dark:text-[hsl(205deg,16%,77%)] welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.2px' }}>基于大语言模型的智能知识助手</p>
      </div>

      {/* Mobile specific content */}
      <div className="md:hidden flex flex-col items-center justify-center mt-12 static">
        {/* Guide text */}
        <div className="max-w-md mx-auto px-4 text-center mb-6">
          <p className="text-lg text-[#666666] dark:text-[#A0AEC0] font-medium welcome-text" style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.1px' }}>
            有什么可以帮到你？
          </p>
        </div>
        {/* Function cards */}
        <div className="w-full px-0">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <FunctionCards scrollToBottom={handleScrollDown} setContent={setContent} />
          </div>
        </div>
      </div>

      {/* Desktop function cards area */}
      <div className="w-full absolute bottom-[18vh] px-4 hidden md:block"
        style={{
          /* Dynamic bottom position based on input expansion */
          bottom: !isInputExpanded
            ? '18vh'
            : `calc(18vh - ${(inputBoxHeight - 65) / 2}px)`,
          transition: 'none'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <FunctionCards scrollToBottom={handleScrollDown} setContent={setContent} />
        </div>
      </div>
    </div>
  );
};

WelcomeScreen.displayName = 'WelcomeScreen'; 