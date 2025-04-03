import { IconMessagePlus, IconSearch, IconX } from '@tabler/icons-react';
import { FC, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';
import { Conversation } from '@/types/chat';
import { ConversationComponent } from './ConversationComponent';
import Link from 'next/link';

interface Props {
  onToggle: () => void;
  isOpen: boolean;
}

export const SidebarNav: FC<Props> = ({ onToggle, isOpen }) => {
  const { t } = useTranslation('sidebar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const {
    state: { conversations, selectedConversation },
    handleNewConversation,
    handleSelectConversation,
  } = useContext(HomeContext);

  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
      const filtered = conversations.filter((conversation) =>
        conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setIsSearching(false);
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  const displayedConversations = isSearching ? filteredConversations : conversations;
  const hasNoResults = isSearching && filteredConversations.length === 0;

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    setIsSearching(false);
  };

  const handleCreateNewChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleNewConversation();
  };

  // 阻止事件冒泡到外部容器
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className={`fixed left-[60px] top-0 z-10 flex h-full w-[260px] flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-[#202123] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      onClick={stopPropagation}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex-1"></div>
        <button 
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          onClick={handleCreateNewChat}
          title={t('新建聊天')}
        >
          <IconMessagePlus size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <input
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-10 pr-10 text-sm text-gray-700 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:focus:border-blue-500"
              style={{ width: '100%' }}
              placeholder={t('搜索聊天...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                onClick={handleClearSearch}
                aria-label="清除搜索"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="px-2 pb-2">
          {hasNoResults ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-2">
              未找到相关聊天
            </div>
          ) : (
            displayedConversations.map((conversation) => (
              <ConversationComponent key={conversation.id} conversation={conversation} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};