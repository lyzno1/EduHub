import React, { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconInfoCircle, IconUsers, IconHelp, IconMoodBoy } from '@tabler/icons-react';
import prompts from '@/prompt.json'; // <-- Import prompt data

// Define the structure of appCardPrompts more explicitly
type AppCardPromptsType = {
  [appName: string]: { // <-- Key is now appName (string)
    [cardId: string]: string;
  }
};

// Define Card Type
interface AppCard {
  id: string;
  name: string;
  icon: JSX.Element;
  appId: number; // Keep appId for logic
  appName: keyof AppCardPromptsType; // <-- Add appName based on prompt keys
}

// Define Cards for Campus Assistant (appId: 3, appName: 'campusAssistant')
const campusAssistantAppId = 3;
const campusAssistantAppName = 'campusAssistant'; // <-- Define appName constant
const campusAssistantCardsData: Omit<AppCard, 'defaultPrompt' | 'appName'>[] = [
  { id: 'ca-network-qa', name: '信息网络问答', icon: <IconInfoCircle size={24} />, appId: campusAssistantAppId },
  { id: 'ca-teacher-qa', name: '教师问答', icon: <IconUsers size={24} />, appId: campusAssistantAppId },
  { id: 'ca-student-qa', name: '学生问答', icon: <IconHelp size={24} />, appId: campusAssistantAppId },
  { id: 'ca-freshman-helper', name: '新生助手', icon: <IconMoodBoy size={24} />, appId: campusAssistantAppId },
];

// Add appName and defaultPrompt dynamically
const appPrompts = prompts.appCardPrompts as AppCardPromptsType; // Assert the type
const campusAssistantCards: (AppCard & { defaultPrompt: string })[] = campusAssistantCardsData.map(card => ({
  ...card,
  appName: campusAssistantAppName, // <-- Assign appName
  // Fetch prompt using appName
  defaultPrompt: appPrompts[campusAssistantAppName]?.[card.id] || ''
}));

interface Props {
  inputBoxHeight: number;
  isInputExpanded: boolean;
}

export const CampusAssistantAppPage: React.FC<Props> = ({ inputBoxHeight, isInputExpanded }) => {
  const {
    state: { conversations, selectedCardId, activeAppId },
    handleSelectConversation,
    dispatch,
  } = useContext(HomeContext);

  const handleCardClick = (card: AppCard & { defaultPrompt: string }) => {
    if (activeAppId !== card.appId) return;

    console.log(`[Card Click - App ${card.appName}] Clicked card: ${card.id}. Current selected: ${selectedCardId}`); // Log appName

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
      <h2 className="text-2xl font-semibold mb-6 text-center dark:text-gray-200">校园助理</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 w-full max-w-md">
        {campusAssistantCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200
              ${selectedCardId === card.id
                ? 'border-green-500 bg-green-50 dark:bg-green-900/30 shadow-md'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="mb-2 text-green-600 dark:text-green-400">{card.icon}</div>
            <span className="text-sm font-medium text-center dark:text-gray-300">{card.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}; 