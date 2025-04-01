import React from 'react';
import { FC, useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';

interface Props { }

export const ChatLoader: FC<Props> = () => {
  const { state: { lightMode } } = useContext(HomeContext);
  
  return (
    <div className="flex justify-center py-3 w-full">
      <div className="w-full max-w-3xl px-4 sm:px-8">
        <div className="w-full">
          <div className="flex items-start">
            <div className="relative my-2">
              <span className="inline-block w-3 h-3 rounded-full bg-black dark:bg-white animate-pulse-dot"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
