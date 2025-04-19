import React, { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconTestPipe, IconCode } from '@tabler/icons-react';
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
  appId: number;
  appName: keyof AppCardPromptsType;
}

// Define Cards for Course Helper (appId: 2, appName: 'courseHelper')
const courseHelperAppId = 2;
const courseHelperAppName = 'courseHelper';
const courseHelperCardsData: Omit<AppCard, 'defaultPrompt' | 'appName'>[] = [
  { id: 'ch-swe-test', name: '软件工程测试', icon: <IconTestPipe size={24} />, appId: courseHelperAppId },
  { id: 'ch-oss-dev', name: '开源软件开发技术', icon: <IconCode size={24} />, appId: courseHelperAppId },
];

// Add appName and defaultPrompt dynamically
const appPrompts = prompts.appCardPrompts as AppCardPromptsType;
const courseHelperCards: (AppCard & { defaultPrompt: string })[] = courseHelperCardsData.map(card => ({
  ...card,
  appName: courseHelperAppName,
  defaultPrompt: appPrompts[courseHelperAppName]?.[card.id] || ''
}));

// Props received from Chat.tsx (example)
interface Props {
  inputBoxHeight: number;
  isInputExpanded: boolean;
}

export const CourseHelperAppPage: React.FC<Props> = ({ inputBoxHeight, isInputExpanded }) => {
  const {
    state: { conversations, selectedCardId, activeAppId },
    handleSelectConversation,
    dispatch,
  } = useContext(HomeContext);

  const handleCardClick = (card: AppCard & { defaultPrompt: string }) => {
    if (activeAppId !== card.appId) return;

    console.log(`[Card Click - App ${card.appName}] Clicked card: ${card.id}. Current selected: ${selectedCardId}`);

    const existingConv = conversations.find(conv => conv.appId === card.appId && conv.cardId === card.id);
    if (existingConv) {
      console.log(`[Card Click - App ${card.appName}] Found existing conversation ${existingConv.id}. Selecting it.`);
      handleSelectConversation(existingConv);
      dispatch({ field: 'selectedCardId', value: null });
      dispatch({ field: 'cardInputPrompt', value: '' });
    } else {
      console.log(`[Card Click - App ${card.appName}] No existing conversation found. Handling card selection.`);
      if (selectedCardId === card.id) {
        console.log(`[Card Click - App ${card.appName}] Deselecting card: ${card.id}`);
        dispatch({ field: 'selectedCardId', value: null });
        dispatch({ field: 'cardInputPrompt', value: '' });
      } else {
        console.log(`[Card Click - App ${card.appName}] Selecting card: ${card.id}`);
        dispatch({ field: 'selectedCardId', value: card.id });
        dispatch({ field: 'cardInputPrompt', value: card.defaultPrompt });
        console.log(`[Card Click - App ${card.appName}] Setting cardInputPrompt to: ${card.defaultPrompt}`);
      }
    }
  };

  return (
    <div className="p-4 h-full flex flex-col justify-center items-center">
      <h2 className="text-2xl font-semibold mb-6 text-center dark:text-gray-200">课程助手</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {courseHelperCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 
              ${selectedCardId === card.id
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 shadow-md' 
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="mb-2 text-yellow-600 dark:text-yellow-400">{card.icon}</div>
            <span className="text-sm font-medium text-center dark:text-gray-300">{card.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}; 