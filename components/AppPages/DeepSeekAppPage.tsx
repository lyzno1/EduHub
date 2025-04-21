import React, { useContext, useMemo } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconWorldWww, IconDatabase, IconBook, IconMessageChatbot, IconUsers } from '@tabler/icons-react';
import prompts from '@/prompt.json';
import { DifyAppConfig, DifyAppCardConfig } from '@/types/dify'; // Import shared types

// Define the structure of appCardPrompts more explicitly
type AppCardPromptsType = {
  [appName: string]: {
    [cardId: string]: string;
  }
};

// Helper type for processed card data
type ProcessedAppCard = DifyAppCardConfig & { defaultPrompt: string; appId: number; appName: string };

// Icon Map
const iconMap: { [key: string]: React.ComponentType<any> } = {
  IconWorldWww: IconWorldWww,
  IconDatabase: IconDatabase,
  IconBook: IconBook,
  IconMessageChatbot: IconMessageChatbot,
  IconUsers: IconUsers,
};

// Props expected by the component
interface Props {
  config: DifyAppConfig;
}

export const DeepSeekAppPage: React.FC<Props> = ({ config }) => {
  const {
    state: { conversations, selectedCardId, activeAppId },
    handleSelectConversation,
    dispatch,
  } = useContext(HomeContext);

  // Process cards to include default prompts
  const processedCards = useMemo(() => {
    const appPrompts = prompts.appCardPrompts as AppCardPromptsType;
    const appName = Object.keys(prompts.appCardPrompts).find(
      key => {
        const promptApp = appPrompts[key];
        return promptApp && config.cards.some((card: DifyAppCardConfig) => promptApp[card.id] !== undefined);
      }
    ) || '';
    
    const fallbackAppName = Object.keys(prompts.appCardPrompts).find(key => key.toLowerCase().includes(config.displayName.toLowerCase())) || '';
    const finalAppName = appName || fallbackAppName;
    console.log("[DeepSeekAppPage] Determined App Name for prompts:", finalAppName);

    if (!finalAppName) {
      console.warn("[DeepSeekAppPage] Could not determine appName for prompts based on config:", config.displayName);
    }

    return config.cards.map((card: DifyAppCardConfig): ProcessedAppCard => ({
      ...card,
      appId: config.appId,
      appName: finalAppName,
      defaultPrompt: appPrompts[finalAppName]?.[card.id] || ''
    }));
  }, [config]);

  const handleCardClick = (card: ProcessedAppCard) => {
    if (activeAppId !== card.appId) return;

    const existingConv = conversations.find(
      (conv) => conv.appId === card.appId && conv.cardId === card.id
    );

    if (existingConv) {
      handleSelectConversation(existingConv);
      dispatch({ field: 'selectedCardId', value: null });
      dispatch({ field: 'cardInputPrompt', value: '' });
    } else {
      if (selectedCardId === card.id) {
        dispatch({ field: 'selectedCardId', value: null });
        dispatch({ field: 'cardInputPrompt', value: '' });
      } else {
        dispatch({ field: 'selectedCardId', value: card.id });
        dispatch({ field: 'cardInputPrompt', value: card.defaultPrompt });
      }
    }
  };

  return (
    <div className="p-4 h-full flex flex-col justify-center items-center">
      <h2 className="text-2xl font-semibold mb-6 text-center text-blue-700 dark:text-blue-400">{config.displayName}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {processedCards.map((card: ProcessedAppCard) => {
          const IconComponent = iconMap[card.iconName];
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 sm:min-h-[120px] ${
                selectedCardId === card.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="mb-2 text-blue-600 dark:text-blue-400">
                {IconComponent ? <IconComponent size={24} /> : null}
              </div>
              <span className="text-sm font-medium text-center dark:text-gray-300">{card.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
