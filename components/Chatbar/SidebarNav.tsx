import { IconChevronLeft, IconMessagePlus, IconSearch, IconX } from '@tabler/icons-react';
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

  useEffect(() => {
    if (isSearching && selectedConversation) {
      setSearchTerm('');
      setIsSearching(false);
    }
  }, [selectedConversation, isSearching]);

  const displayedConversations = isSearching ? filteredConversations : conversations;
  const hasNoResults = isSearching && filteredConversations.length === 0;

  const handleClearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
  };

  return (
    <div 
      className={`fixed left-[60px] top-0 z-10 flex h-full w-[260px] flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-[#202123] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <button 
          className="flex h-10 flex-shrink-0 items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-[#202123] dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={handleNewConversation}
        >
          <IconMessagePlus size={16} />
          <span>{t('新建聊天')}</span>
        </button>
        
        <button 
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          onClick={onToggle}
          aria-label="关闭侧边栏"
        >
          <IconChevronLeft size={20} />
        </button>
      </div>
      
      <div className="px-2 py-3">
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
      
      <div className="flex-grow overflow-y-auto px-3 py-2">
        <div className="mb-2 px-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
          {isSearching ? (
            filteredConversations.length > 0 ? 
            `搜索结果 (${filteredConversations.length})` :
            '搜索结果'
          ) : '所有对话'}
        </div>
        
        {displayedConversations.length > 0 ? (
          <div className="flex flex-col gap-1">
            {displayedConversations.map((conversation) => (
              <ConversationComponent 
                key={conversation.id} 
                conversation={conversation}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            {hasNoResults ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="mb-2">
                  <IconSearch size={36} className="mx-auto text-gray-300 dark:text-gray-600" />
                </div>
                <p>未找到匹配 "{searchTerm}" 的对话</p>
                <button
                  className="mt-2 text-blue-500 hover:underline dark:text-blue-400"
                  onClick={handleClearSearch}
                >
                  {t('清除搜索')}
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>{t('无聊天记录')}</p>
                <button
                  className="mt-2 flex items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-blue-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  onClick={handleNewConversation}
                >
                  <IconMessagePlus size={16} />
                  {t('开始新的对话')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-200 p-4 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <Link 
          href="https://github.com/ifLab/eduhub" 
          target="_blank" 
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          EduHub © 2023 - 智能知识助手
        </Link>
      </div>
    </div>
  );
}; 