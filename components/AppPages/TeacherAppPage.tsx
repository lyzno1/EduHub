import React, { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconPencil, IconMessageCircleQuestion, IconBulb, IconPresentation, IconListDetails, IconCheckbox, IconMessageReport } from '@tabler/icons-react'; // Choose appropriate icons
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

// Define Cards for Teacher Assistant (appId: 4, appName: 'teacherAssistant')
const teacherAssistantAppId = 4;
const teacherAssistantAppName = 'teacherAssistant'; // <-- Define appName constant
const teacherAssistantCardsData: Omit<AppCard, 'defaultPrompt' | 'appName'>[] = [
  { id: 'ta-assignment-ideas', name: '作业构思', icon: <IconPencil size={24} />, appId: teacherAssistantAppId },
  { id: 'ta-student-tutoring', name: '学生辅导', icon: <IconMessageCircleQuestion size={24} />, appId: teacherAssistantAppId },
  { id: 'ta-concept-explanation', name: '概念解释', icon: <IconBulb size={24} />, appId: teacherAssistantAppId },
  { id: 'ta-lecture-design', name: '讲座设计', icon: <IconPresentation size={24} />, appId: teacherAssistantAppId },
  { id: 'ta-lesson-plan', name: '课程计划', icon: <IconListDetails size={24} />, appId: teacherAssistantAppId },
  { id: 'ta-quiz-generation', name: '测验生成', icon: <IconCheckbox size={24} />, appId: teacherAssistantAppId },
  { id: 'ta-meeting-summary', name: '会议总结', icon: <IconMessageReport size={24} />, appId: teacherAssistantAppId },
];

// Add appName and defaultPrompt dynamically
const appPrompts = prompts.appCardPrompts as AppCardPromptsType; // Assert the type
const teacherAssistantCards: (AppCard & { defaultPrompt: string })[] = teacherAssistantCardsData.map(card => ({
  ...card,
  appName: teacherAssistantAppName, // <-- Assign appName
  // Fetch prompt using appName
  defaultPrompt: appPrompts[teacherAssistantAppName]?.[card.id] || ''
}));

interface Props {
  inputBoxHeight: number;
  isInputExpanded: boolean;
}

export const TeacherAppPage: React.FC<Props> = ({ inputBoxHeight, isInputExpanded }) => {
  const {
    state: { conversations, selectedCardId, activeAppId },
    handleSelectConversation,
    dispatch,
  } = useContext(HomeContext);

  const handleCardClick = (card: AppCard & { defaultPrompt: string }) => {
    if (activeAppId !== card.appId) return;

    // console.log(`[Card Click - App ${card.appName}] Clicked card: ${card.id}. Current selected: ${selectedCardId}`); // Log appName

    const existingConv = conversations.find(conv => conv.appId === card.appId && conv.cardId === card.id);
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
      <h2 className="text-2xl font-semibold mb-6 text-center text-purple-700 dark:text-purple-400">教师助手</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
        {teacherAssistantCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 sm:min-h-[120px] ${
              selectedCardId === card.id
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md' // Selected state
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-purple-300 dark:hover:border-purple-700' // Unselected state + hover
            }`}
          >
            <div className="mb-2 text-purple-600 dark:text-purple-400">{card.icon}</div>
            <span className="text-sm font-medium text-center dark:text-gray-300">{card.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}; 