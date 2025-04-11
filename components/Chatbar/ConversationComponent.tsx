import { IconMessage, IconPencil, IconTrash } from '@tabler/icons-react';
import { useContext, useState, useRef, useEffect } from 'react';

import HomeContext from '@/pages/api/home/home.context';

import { Conversation } from '@/types/chat';
import ConfirmPopover from '../ui/ConfirmPopover';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  
  // 用于定位气泡位置的引用
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  
  const isSelected = selectedConversation?.id === conversation.id;

  // 点击外部关闭删除确认
  useEffect(() => {
    if (!showDeleteConfirm) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (deleteButtonRef.current && !deleteButtonRef.current.contains(event.target as Node)) {
        setShowDeleteConfirm(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteConfirm]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectConversation(conversation);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (conversation.deletable) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    handleDeleteConversation(conversation.id);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setShowDeleteConfirm(false);
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
      className={`group relative flex cursor-pointer items-center rounded-md px-3 py-2 transition-colors dark:hover:bg-gray-800 ${
        isSelected 
          ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white' 
          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300'
      }`}
      onClick={handleClick}
    >
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
              style={{ fontFamily: "'PingFang SC', Arial, sans-serif" }}
            />
          </form>
        ) : (
          <div className="truncate" style={{ fontFamily: "'PingFang SC', Arial, sans-serif" }}>{conversation.name}</div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {conversation.deletable && (
          <>
            <button
              className="opacity-0 rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStartEditing(e);
              }}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={(e) => e.preventDefault()}
              onMouseLeave={(e) => e.preventDefault()}
              data-tooltip="编辑对话名称"
              data-placement="top"
            >
              <IconPencil size={16} />
            </button>
            <button
              id={`delete-button-${conversation.id}`}
              ref={deleteButtonRef}
              className={`relative rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-red-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-red-400 transition-all ${showDeleteConfirm ? 'text-red-500 dark:text-red-400 bg-gray-200 dark:bg-gray-700' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(e);
              }}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={(e) => e.preventDefault()}
              onMouseLeave={(e) => e.preventDefault()}
              data-tooltip="删除对话"
              data-placement="top"
            >
              <IconTrash size={16} />
            </button>
          </>
        )}
      </div>
      
      {/* 删除确认气泡 */}
      {showDeleteConfirm && conversation.deletable && (
        <ConfirmPopover
          isOpen={showDeleteConfirm}
          message={`确定删除?`}
          confirmText="删除"
          cancelText="取消"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          type="danger"
          position="left"
        />
      )}
    </div>
  );
}; 