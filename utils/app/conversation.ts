import { Conversation } from '@/types/chat';

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = (conversations: Conversation[]) => {
  // 确保新聊天在最上方，先排序再保存
  const sortedConversations = [...conversations].sort((a, b) => {
    // 空聊天（无消息的新聊天）排在最前面
    if (a.messages.length === 0 && a.name.includes('New Conversation')) return -1;
    if (b.messages.length === 0 && b.name.includes('New Conversation')) return 1;
    return 0;
  });
  
  localStorage.setItem('conversationHistory', JSON.stringify(sortedConversations));
};
