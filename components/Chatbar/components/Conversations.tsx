import { Conversation } from '@/types/chat';
import { ConversationComponent } from './Conversation';
import { useTranslation } from 'next-i18next';

interface Props {
  conversations: Conversation[];
}

export const Conversations = ({ conversations }: Props) => {
  const { t } = useTranslation('chat');
  const newChatName = t('New Conversation');
  
  // 过滤出没有文件夹的对话，并按照新对话在前的顺序排序
  const filteredConversations = [...conversations]
    .filter((conversation) => !conversation.folderId)
    .sort((a, b) => {
      // 将空的新聊天放在最前面
      if (a.messages.length === 0 && a.name === newChatName) return -1;
      if (b.messages.length === 0 && b.name === newChatName) return 1;
      
      // 根据ID排序，确保最新创建的在前面
      return 0;
    });

  return (
    <div className="flex w-full flex-col gap-1">
      {filteredConversations.map((conversation) => (
        <ConversationComponent key={conversation.id} conversation={conversation} />
      ))}
    </div>
  );
};
