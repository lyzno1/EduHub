import { IconMessage, IconPencil, IconTrash } from '@tabler/icons-react';
import { useContext, useState } from 'react';

import HomeContext from '@/pages/api/home/home.context';

import { Conversation } from '@/types/chat';

interface Props {
  conversation: Conversation;
}

export const ConversationComponent = ({ conversation }: Props) => {
  const {
    state: { selectedConversation },
    handleSelectConversation,
    handleDeleteConversation,
    handleUpdateConversation,
  } = useContext(HomeContext);
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>(conversation.name);
  
  const isSelected = selectedConversation?.id === conversation.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectConversation(conversation);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversation.deletable) {
      if (confirm(`确定要删除对话 "${conversation.name}" 吗？`)) {
        handleDeleteConversation(conversation.id);
      }
    }
  };

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setNewName(conversation.name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (newName.trim()) {
      if (handleUpdateConversation) {
        handleUpdateConversation(conversation, {
          key: 'name',
          value: newName.trim(),
        });
      }
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={`group flex cursor-pointer items-center rounded-md px-3 py-2 transition-colors dark:hover:bg-gray-800 ${
        isSelected 
          ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white' 
          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300'
      }`}
      onClick={handleClick}
    >
      <div className={`mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
        isSelected 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      }`}>
        <IconMessage size={16} />
      </div>
      
      <div className="flex-1 overflow-hidden text-sm font-medium">
        {isEditing ? (
          <form onSubmit={handleNameSubmit} onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              value={newName}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              autoFocus
            />
          </form>
        ) : (
          <div className="truncate">{conversation.name}</div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {conversation.deletable && (
          <>
            <button
              className="invisible rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 group-hover:visible"
              onClick={handleStartEditing}
              aria-label="编辑对话名称"
              onMouseDown={(e) => e.preventDefault()}
            >
              <IconPencil size={16} />
            </button>
            <button
              className="invisible rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-red-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-red-400 group-hover:visible"
              onClick={handleDelete}
              aria-label="删除对话"
              onMouseDown={(e) => e.preventDefault()}
            >
              <IconTrash size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}; 