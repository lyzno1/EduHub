import React, { useContext, useState } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconSearch, IconBook, IconCode, IconBrain, IconRobot, IconSchool, IconUsers, IconWorldWww, IconDatabase, IconMessageChatbot, IconBulb } from '@tabler/icons-react';

// Define Card Type (can be moved to a shared types file later)
interface AppCard {
  id: string;
  name: string;
  icon: JSX.Element;
  defaultPrompt: string;
  appId: number; // Add appId for context matching
}

// Define Cards for DeepSeek (appId: 1)
const deepSeekCards: AppCard[] = [
  { id: 'ds-network-search', name: '网络搜索', icon: <IconWorldWww size={24} />, defaultPrompt: '请帮我搜索关于 ', appId: 1 },
  { id: 'ds-campus-kb', name: '校园知识库', icon: <IconDatabase size={24} />, defaultPrompt: '校园知识库中关于 ', appId: 1 },
  { id: 'ds-academic-search', name: '学术检索', icon: <IconBook size={24} />, defaultPrompt: '查找关于 的学术论文', appId: 1 },
  { id: 'ds-ai-tutor', name: 'AI辅导员', icon: <IconMessageChatbot size={24} />, defaultPrompt: '请辅导我关于 ', appId: 1 },
  { id: 'ds-logistics-assistant', name: '后勤助手', icon: <IconUsers size={24} />, defaultPrompt: '关于后勤问题 ', appId: 1 },
];

export const DeepSeekAppPage = () => {
  const {
    state: { conversations, selectedCardId, activeAppId, cardInputPrompt }, // Get state from context
    handleSelectConversation, // Function to select existing convo
    dispatch, // Function to dispatch actions (like setting selectedCardId or cardInputPrompt)
  } = useContext(HomeContext);

  const handleCardClick = (card: AppCard) => {
    if (activeAppId !== card.appId) return; // Ensure click is for the correct active app

    console.log(`[Card Click - App ${activeAppId}] Clicked card: ${card.id}. Current selected: ${selectedCardId}`);

    // 1. Check if a conversation for this card already exists in the conversations list
    const existingConv = conversations.find(
      (conv) => conv.appId === card.appId && conv.cardId === card.id
    );

    if (existingConv) {
      // 2a. If exists, select the conversation (navigate to chat view) and clear card state
      console.log(`[Card Click - App ${activeAppId}] Found existing conversation ${existingConv.id}. Selecting it.`);
      handleSelectConversation(existingConv); // This will set selectedConversation
      dispatch({ field: 'selectedCardId', value: null }); // Clear selected card ID state
      dispatch({ field: 'cardInputPrompt', value: '' }); // Clear any prompt in input
    } else {
      // 2b. If not exists, handle card selection/deselection for creating a new chat
      console.log(`[Card Click - App ${activeAppId}] No existing conversation found. Handling card selection.`);
      if (selectedCardId === card.id) {
        // Deselect if clicking the already selected card
        console.log(`[Card Click - App ${activeAppId}] Deselecting card: ${card.id}`);
        dispatch({ field: 'selectedCardId', value: null });
        dispatch({ field: 'cardInputPrompt', value: '' }); // Clear prompt input
      } else {
        // Select the new card
        console.log(`[Card Click - App ${activeAppId}] Selecting card: ${card.id}`);
        dispatch({ field: 'selectedCardId', value: card.id });
        dispatch({ field: 'cardInputPrompt', value: card.defaultPrompt }); // Set default prompt
      }
    }
  };

  return (
    <div className="p-4 h-full flex flex-col justify-center items-center">
      {/* Optional Title */}
      <h2 className="text-2xl font-semibold mb-6 text-center dark:text-gray-200">DeepSeek 应用</h2>
      {/* Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {deepSeekCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 
              ${selectedCardId === card.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' 
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="mb-2 text-blue-600 dark:text-blue-400">{card.icon}</div>
            <span className="text-sm font-medium text-center dark:text-gray-300">{card.name}</span>
          </button>
        ))}
      </div>
      {/* Add some spacing at the bottom if needed, controlled by parent Chat.tsx padding */}
    </div>
  );
};
