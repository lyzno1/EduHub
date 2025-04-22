import React, { useContext, useMemo } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import prompts from '@/prompt.json';
import { DifyFolderConfig, DifyAppCardConfig } from '@/types/dify';

// Define the structure of appCardPrompts more explicitly
type AppCardPromptsType = {
  [appName: string]: {
    [cardId: string]: string;
  }
};

// Helper type for processed card data
type ProcessedAppCard = DifyAppCardConfig & { defaultPrompt: string; appId: number; appName: string };

// Define theme color names
type ThemeColor = 'green' | 'amber' | 'blue' | 'purple'; // Extend as needed

// Props expected by the template component
interface Props {
  config: DifyFolderConfig;
  themeColor: ThemeColor;
  iconMap: { [key: string]: React.ComponentType<any> };
}

// Mapping theme colors to Tailwind classes to ensure PurgeCSS works
const themeClasses: Record<ThemeColor, {
  text: string;
  selectedBorderBg: string;
  hoverBorder: string;
  iconText: string;
}> = {
  green: {
    text: 'text-green-700 dark:text-green-400',
    selectedBorderBg: 'border-green-500 bg-green-50 dark:bg-green-900/30 shadow-md',
    hoverBorder: 'hover:border-green-300 dark:hover:border-green-700',
    iconText: 'text-green-600 dark:text-green-400',
  },
  amber: { // Note: Using 'amber' as key, but CSS classes might use 'yellow' based on original files
    text: 'text-amber-700 dark:text-amber-400',
    selectedBorderBg: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 shadow-md',
    hoverBorder: 'hover:border-yellow-300 dark:hover:border-yellow-700',
    iconText: 'text-yellow-600 dark:text-yellow-400',
  },
  blue: {
    text: 'text-blue-700 dark:text-blue-400',
    selectedBorderBg: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
    iconText: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    text: 'text-purple-700 dark:text-purple-400',
    selectedBorderBg: 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-700',
    iconText: 'text-purple-600 dark:text-purple-400',
  },
};

export const AppPageTemplate: React.FC<Props> = ({ config, themeColor, iconMap }) => {
  const {
    state: { conversations, selectedCardId, activeAppId },
    handleSelectConversation,
    dispatch,
  } = useContext(HomeContext);

  // Process cards to include default prompts
  const processedCards = useMemo(() => {
    const appPrompts = prompts.appCardPrompts as AppCardPromptsType;
    const folderKey = config.folderKey;

    // console.log(`[AppPageTemplate - ${folderKey}] Processing cards.`); // Optional generic log

    return config.cards.map((card: DifyAppCardConfig): ProcessedAppCard => ({
      ...card,
      appId: config.appId,
      appName: folderKey,
      defaultPrompt: appPrompts[folderKey]?.[card.cardId] || ''
    }));
  }, [config]);

  const handleCardClick = (card: ProcessedAppCard) => {
    // Ensure interaction only happens if the current app page matches the active app
    if (activeAppId !== card.appId) return;

    const existingConv = conversations.find((conv) =>
      conv.appId === card.appId && conv.cardId === card.cardId
    );

    if (existingConv) {
      handleSelectConversation(existingConv);
      // Reset card selection state when selecting an existing conversation
      dispatch({ field: 'selectedCardId', value: null });
      dispatch({ field: 'cardInputPrompt', value: '' });
    } else {
      // Toggle selection or set new card prompt
      if (selectedCardId === card.cardId) {
        // Deselect if clicking the already selected card
        dispatch({ field: 'selectedCardId', value: null });
        dispatch({ field: 'cardInputPrompt', value: '' });
      } else {
        // Select the new card and set its default prompt
        dispatch({ field: 'selectedCardId', value: card.cardId });
        dispatch({ field: 'cardInputPrompt', value: card.defaultPrompt });
      }
    }
  };

  // Get theme specific classes, default to green if not found
  const currentTheme = themeClasses[themeColor] || themeClasses.green;
  const baseCardClasses = 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700';

  return (
    <div className="p-4 h-full flex flex-col justify-center items-center">
      {/* Apply theme color to title */}
      <h2 className={`text-2xl font-semibold mb-6 text-center ${currentTheme.text}`}>
        {config.displayName}
      </h2>
      {/* Standardized grid layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-3xl">
        {processedCards.map((card: ProcessedAppCard) => {
          // Look up icon component from the passed map
          const IconComponent = iconMap[card.iconName];
          
          // --- Add logging for debugging icon issues ---
          if (!IconComponent) {
            console.warn(`[AppPageTemplate] Icon component not found in provided iconMap for card '${card.name}' (ID: ${card.cardId}). iconName specified in config: '${card.iconName}'. Rendering fallback or nothing.`);
          }
          // --- End logging ---
          
          return (
            <button
              key={card.cardId}
              onClick={() => handleCardClick(card)}
              // Apply dynamic theme classes for selection and hover states
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 min-h-[100px] sm:min-h-[120px] ${ // Added min-h for consistency
                selectedCardId === card.cardId
                  ? currentTheme.selectedBorderBg // Selected state styles
                  : `${baseCardClasses} ${currentTheme.hoverBorder}` // Default and hover state styles
              }`}
              // Disable button if the card's app doesn't match the active app
              disabled={activeAppId !== card.appId} 
              style={{ opacity: activeAppId !== card.appId ? 0.5 : 1 }} // Visual cue for disabled state
            >
              {/* Apply theme color to icon */}
              <div className={`mb-2 ${currentTheme.iconText}`}>
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