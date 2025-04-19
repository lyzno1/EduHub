import React, { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { IconPencil, IconMessageCircleQuestion, IconBulb, IconPresentation, IconListDetails, IconCheckbox, IconMessageReport } from '@tabler/icons-react'; // Choose appropriate icons

// Define Card Type
interface AppCard {
  id: string;
  name: string;
  icon: JSX.Element;
  defaultPrompt: string;
  appId: number;
}

// Define Cards for Teacher Assistant (appId: 4)
const teacherAssistantCards: AppCard[] = [
  { id: 'ta-assignment-ideas', name: '作业构思', icon: <IconPencil size={24} />, defaultPrompt: '帮我构思一个关于 的作业', appId: 4 },
  { id: 'ta-student-tutoring', name: '学生辅导', icon: <IconMessageCircleQuestion size={24} />, defaultPrompt: '如何辅导在 方面有困难的学生？', appId: 4 },
  { id: 'ta-concept-explanation', name: '概念解释', icon: <IconBulb size={24} />, defaultPrompt: '请用简单的语言解释 ', appId: 4 },
  { id: 'ta-lecture-design', name: '讲座设计', icon: <IconPresentation size={24} />, defaultPrompt: '帮我设计一个关于 的讲座大纲', appId: 4 },
  { id: 'ta-lesson-plan', name: '课程计划', icon: <IconListDetails size={24} />, defaultPrompt: '为 课程制定一个教学计划', appId: 4 },
  { id: 'ta-quiz-generation', name: '测验生成', icon: <IconCheckbox size={24} />, defaultPrompt: '生成一个关于 的测验题目', appId: 4 },
  { id: 'ta-meeting-summary', name: '会议总结', icon: <IconMessageReport size={24} />, defaultPrompt: '根据以下会议记录生成总结 ', appId: 4 },
];

interface Props {
  inputBoxHeight: number;
  isInputExpanded: boolean;
}

export const TeacherAppPage: React.FC<Props> = ({ inputBoxHeight, isInputExpanded }) => {
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
      <h2 className="text-2xl font-semibold mb-6 text-center dark:text-gray-200">教师助手</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
        {teacherAssistantCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 
              ${selectedCardId === card.id
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md' 
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
            style={{ minHeight: '120px' }} // Ensure consistent card height
          >
            <div className="mb-2 text-purple-600 dark:text-purple-400">{card.icon}</div>
            <span className="text-sm font-medium text-center dark:text-gray-300">{card.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}; 