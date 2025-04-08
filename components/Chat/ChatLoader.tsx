import React from 'react';
import { FC, useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';

interface Props {
  messageIsStreaming: boolean;
}

export const ChatLoader: FC<Props> = ({ messageIsStreaming }) => {
  const { state: { lightMode } } = useContext(HomeContext);
  
  if (!messageIsStreaming) return null;

  return (
    <div className="flex justify-center py-0 w-full">
      <div className="w-full max-w-[800px] px-2 sm:px-4">
        <div className="flex items-start">
          <div className="relative my-2">
            <span className="inline-block w-3 h-3 rounded-full bg-black dark:bg-white animate-pulse-dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
};
