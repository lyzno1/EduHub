import React, { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconWorldWww, IconDatabase, IconBook, IconMessageChatbot, IconUsers } from '@tabler/icons-react';
import prompts from '@/prompt.json';

// Define the structure of appCardPrompts more explicitly
type AppCardPromptsType = {
  [appName: string]: {
    [cardId: string]: string;
  }
};

// Define Card Type (can be moved to a shared types file later)
interface AppCard {
  id: string;
  name: string;
  icon: JSX.Element;
  appId: number; // Keep appId for logic
  appName: keyof AppCardPromptsType; // <-- Add appName based on prompt keys
}

// Define Cards for DeepSeek (appId: 1, appName: 'deepseek')
const deepSeekAppId = 1;
const deepSeekAppName = 'deepseek'; // <-- Define appName constant
const deepSeekCardsData: Omit<AppCard, 'defaultPrompt' | 'appName'>[] = [
  { id: 'ds-network-search', name: '网络搜索', icon: <IconWorldWww size={24} />, appId: deepSeekAppId },
  { id: 'ds-campus-kb', name: '校园知识库', icon: <IconDatabase size={24} />, appId: deepSeekAppId },
  { id: 'ds-academic-search', name: '学术检索', icon: <IconBook size={24} />, appId: deepSeekAppId },
  { id: 'ds-ai-tutor', name: 'AI辅导员', icon: <IconMessageChatbot size={24} />, appId: deepSeekAppId },
  { id: 'ds-logistics-assistant', name: '后勤助手', icon: <IconUsers size={24} />, appId: deepSeekAppId },
];

// Add appName and defaultPrompt dynamically
const appPrompts = prompts.appCardPrompts as AppCardPromptsType; // Assert the type
const deepSeekCards: (AppCard & { defaultPrompt: string })[] = deepSeekCardsData.map(card => ({
  ...card,
  appName: deepSeekAppName, // <-- Assign appName
  // Fetch prompt using appName
  defaultPrompt: appPrompts[deepSeekAppName]?.[card.id] || ''
}));

export const DeepSeekAppPage = () => {
  const {
    state: { conversations, selectedCardId, activeAppId },
    handleSelectConversation,
    dispatch,
  } = useContext(HomeContext);

  const handleCardClick = (card: AppCard & { defaultPrompt: string }) => {
    if (activeAppId !== card.appId) return;

    // console.log(`[Card Click - App ${card.appName}] Clicked card: ${card.id}. Current selected: ${selectedCardId}`);

    const existingConv = conversations.find(
      (conv) => conv.appId === card.appId && conv.cardId === card.id
    );

    if (existingConv) {
      // console.log(`[Card Click - App ${card.appName}] Found existing conversation ${existingConv.id}. Selecting it.`);
      handleSelectConversation(existingConv);
      dispatch({ field: 'selectedCardId', value: null });
      dispatch({ field: 'cardInputPrompt', value: '' });
    } else {
      // console.log(`[Card Click - App ${card.appName}] No existing conversation found. Handling card selection.`);
      if (selectedCardId === card.id) {
        // console.log(`[Card Click - App ${card.appName}] Deselecting card: ${card.id}`);
        dispatch({ field: 'selectedCardId', value: null });
        dispatch({ field: 'cardInputPrompt', value: '' });
      } else {
        // console.log(`[Card Click - App ${card.appName}] Selecting card: ${card.id}`);
        dispatch({ field: 'selectedCardId', value: card.id });
        dispatch({ field: 'cardInputPrompt', value: card.defaultPrompt });
        // console.log(`[Card Click - App ${card.appName}] Setting cardInputPrompt to: ${card.defaultPrompt}`);
      }
    }
  };

  return (
    <div className="p-4 h-full flex flex-col justify-center items-center">
      <h2 className="text-2xl font-semibold mb-6 text-center text-blue-700 dark:text-blue-400">DeepSeek 应用</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {deepSeekCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 min-h-[120px] ${
              selectedCardId === card.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
            }`}
          >
            <div className="mb-2 text-blue-600 dark:text-blue-400">{card.icon}</div>
            <span className="text-sm font-medium text-center dark:text-gray-300">{card.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
