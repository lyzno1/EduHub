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
  // 保存当前选中的对话
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
  
  // 同时更新对话历史中的对应对话
  const conversationHistory = localStorage.getItem('conversationHistory');
  if (conversationHistory) {
    const conversations: Conversation[] = JSON.parse(conversationHistory);
    const updatedConversations = conversations.map((c) => {
      if (c.id === conversation.id) {
        return conversation;
      }
      return c;
    });
    localStorage.setItem('conversationHistory', JSON.stringify(updatedConversations));
  }
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};
