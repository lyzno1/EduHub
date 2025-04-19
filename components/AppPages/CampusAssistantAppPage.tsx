import React, { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconInfoCircle, IconUsers, IconHelp, IconMoodBoy } from '@tabler/icons-react';

// Define Card Type
interface AppCard {
  id: string;
  name: string;
  icon: JSX.Element;
  defaultPrompt: string;
  appId: number;
}

// Define Cards for Campus Assistant (appId: 3)
const campusAssistantCards: AppCard[] = [
  { id: 'ca-network-qa', name: '信息网络问答', icon: <IconInfoCircle size={24} />, defaultPrompt: '关于校园网/信息系统的问题 ', appId: 3 },
  { id: 'ca-teacher-qa', name: '教师问答', icon: <IconUsers size={24} />, defaultPrompt: '咨询教师相关问题 ', appId: 3 },
  { id: 'ca-student-qa', name: '学生问答', icon: <IconHelp size={24} />, defaultPrompt: '咨询学生相关问题 ', appId: 3 },
  { id: 'ca-freshman-helper', name: '新生助手', icon: <IconMoodBoy size={24} />, defaultPrompt: '新生入学指南 ', appId: 3 },
];

interface Props {
  inputBoxHeight: number;
  isInputExpanded: boolean;
}

export const CampusAssistantAppPage: React.FC<Props> = ({ inputBoxHeight, isInputExpanded }) => {
  const {
    state: { conversations, selectedCardId, activeAppId, cardInputPrompt },
    handleSelectConversation,
    dispatch,
  } = useContext(HomeContext);

  const handleCardClick = (card: AppCard) => {
    if (activeAppId !== card.appId) return;
    const existingConv = conversations.find(conv => conv.appId === card.appId && conv.cardId === card.id);
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