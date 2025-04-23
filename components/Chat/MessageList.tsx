import React, { MutableRefObject } from 'react';
import { Message } from '@/types/chat';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ChatLoader } from './ChatLoader';

// Define ThemeMode locally or import if shared
type ThemeMode = 'light' | 'dark' | 'red' | 'blue' | 'green' | 'purple' | 'brown';

interface MessageListProps {
  messages: Message[];
  messageIsStreaming: boolean;
  modelWaiting: boolean;
  currentTheme: ThemeMode;
  user: string | null | undefined; // Adjust type as needed
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  bottomInputHeight: number;
  onEdit: (editedMessage: Message, index: number) => void; // Callback for message edit
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  messageIsStreaming,
  modelWaiting,
  currentTheme,
  user,
  messagesEndRef,
  bottomInputHeight,
  onEdit,
}) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="md:pt-6 pt-2">
        {/* Message list */}
        {messages.map((message, index) => (
          <MemoizedChatMessage
            key={message.id || index}
            message={message}
            messageIndex={index}
            onEdit={(editedMessage) => {
              // Call the passed-in onEdit handler with the message and its index
              onEdit(editedMessage, index);
            }}
            lightMode={currentTheme}
            // Pass streaming/waiting state only to the last message
            isStreaming={index === messages.length - 1 && messageIsStreaming}
            isWaiting={index === messages.length - 1 && modelWaiting}
            // Determine avatar based on user prop (adjust logic if user type changes)
            userAvatar={typeof user === 'string' && user.length === 8 ? "/teacher-avatar.png" : "/student-avatar.png"}
            assistantAvatar="/logon.png"
          />
        ))}

        {/* Loading indicator */}
        <ChatLoader messageIsStreaming={messageIsStreaming} modelWaiting={modelWaiting} />

        {/* Bottom spacer for scrolling */}
        <div
          style={{ height: `${bottomInputHeight + 60}px`, transition: 'none' }}
          ref={messagesEndRef}
        />
      </div>
    </div>
  );
};

MessageList.displayName = 'MessageList'; 