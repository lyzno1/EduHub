import React, { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface MessageListProps {
  messages: Message[];
  isMobile?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isMobile
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={cn(
      'flex flex-col gap-4 overflow-y-auto',
      isMobile ? 'px-2' : 'px-4'
    )}>
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            'flex w-full',
            message.role === 'assistant' ? 'justify-start' : 'justify-end'
          )}
        >
          <div className={cn(
            'max-w-[85%] rounded-lg p-3',
            message.role === 'assistant' 
              ? 'bg-gray-100 text-gray-800' 
              : 'bg-primary text-white',
            isMobile ? 'text-sm' : 'text-base'
          )}>
            {message.content}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}; 