import React, { useContext, useMemo } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconTestPipe, IconCode } from '@tabler/icons-react';
import prompts from '@/prompt.json';
import { DifyAppConfig, DifyAppCardConfig } from '@/types/dify'; // Import shared types

// Define the structure of appCardPrompts more explicitly
type AppCardPromptsType = {
  [appName: string]: {
    [cardId: string]: string;
  }
};

// Helper type for the component's specific card data including the prompt
type ProcessedAppCard = DifyAppCardConfig & { defaultPrompt: string; appId: number; appName: string };

// Icon Map
const iconMap: { [key: string]: React.ComponentType<any> } = {
  IconTestPipe: IconTestPipe,
  IconCode: IconCode,
  // Add other icons used across all app pages here if needed
};

// Props expected by the component
interface Props {
  config: DifyAppConfig; // Receive the specific app config
  // // We might not need these if the layout is handled outside
  // inputBoxHeight: number;
  // isInputExpanded: boolean;
}

export const CourseHelperAppPage: React.FC<Props> = ({ config }) => {
  const {
    state: { conversations, selectedCardId, activeAppId },
    handleSelectConversation,
    dispatch,
  } = useContext(HomeContext);

  // Process cards to include default prompts
  const processedCards = useMemo(() => {
    const appPrompts = prompts.appCardPrompts as AppCardPromptsType;
    
    // --- 优化 appName 获取逻辑 --- 
    let finalAppName = config.appKey; // 优先使用 config.appKey

    if (!finalAppName) {
      console.warn(`[CourseHelperAppPage] config.appKey is missing for ${config.displayName}. Falling back to guessing appName.`);
      // Fallback logic (保留原来的查找方式作为后备)
      const guessedAppName = Object.keys(prompts.appCardPrompts).find(
        key => {
          const promptApp = appPrompts[key];
          return promptApp && config.cards.some((card: DifyAppCardConfig) => promptApp[card.id] !== undefined);
        }
      ) || Object.keys(prompts.appCardPrompts).find(key => key.toLowerCase().includes(config.displayName.toLowerCase())) || '';
      finalAppName = guessedAppName;
    }
    // --- 结束优化 ---

    console.log("[CourseHelperAppPage] Determined App Name for prompts:", finalAppName);

    if (!finalAppName) {
      console.warn("[CourseHelperAppPage] Could not determine appName for prompts based on config:", config.displayName);
    }

    return config.cards.map((card: DifyAppCardConfig): ProcessedAppCard => ({
      ...card,
      appId: config.appId,
      appName: finalAppName, // Use the determined programmatic name
      defaultPrompt: appPrompts[finalAppName]?.[card.id] || ''
    }));
  }, [config]);

  const handleCardClick = (card: ProcessedAppCard) => {
    // Use card.appId from processed card data
    if (activeAppId !== card.appId) return;

    const existingConv = conversations.find((conv) => conv.appId === card.appId && conv.cardId === card.id);
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
      {/* Use displayName from config */}
      <h2 className="text-2xl font-semibold mb-6 text-center text-amber-700 dark:text-amber-400">{config.displayName}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {processedCards.map((card: ProcessedAppCard) => {
          const IconComponent = iconMap[card.iconName];
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 sm:min-h-[120px] ${
                selectedCardId === card.id
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700'
              }`}
            >
              {/* Render icon dynamically */}
              <div className="mb-2 text-yellow-600 dark:text-yellow-400">
                {IconComponent ? <IconComponent size={24} /> : null} 
              </div>
              {/* Use name from card config */}
              <span className="text-sm font-medium text-center dark:text-gray-300">{card.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}; 