import React from 'react';
import { IconRobot, IconCalendarEvent, IconMapPin, IconInfoCircle } from '@tabler/icons-react';

interface Props {
  inputBoxHeight: number;
  isInputExpanded: boolean;
}

export const CampusAssistantAppPage: React.FC<Props> = ({ inputBoxHeight, isInputExpanded }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 relative">
      {/* Top Content Area */}
      <div 
        className="flex flex-col items-center text-center max-w-3xl w-full welcome-text-container" 
        style={{
          transition: 'margin-top 0.2s ease-out', 
          marginTop: !isInputExpanded
            ? isMobile ? '-15vh' : '-20vh'
            : isMobile 
              ? `calc(-15vh - ${(inputBoxHeight - 65) / 2}px)` 
              : `calc(-20vh - ${(inputBoxHeight - 65) / 2}px)`,
        }}
      >
        <div className="mb-6 flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
          <IconRobot size={32} className="text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">校园智能助理</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">你的校园生活信息助手</p>
      </div>

      {/* App Specific Cards Area */}
      <div 
        className="w-full absolute bottom-[18vh] px-4"
        style={{
          bottom: !isInputExpanded
            ? '18vh' 
            : `calc(18vh - ${(inputBoxHeight - 65) / 2}px)`,
          transition: 'bottom 0.2s ease-out', 
          maxWidth: '800px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {/* Card 1 */}
          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
            <IconCalendarEvent size={24} className="mb-2 text-purple-500" />
            <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">活动与日程</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">查询近期校园活动、讲座或校历安排。</p>
          </div>
          {/* Card 2 */}
          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
            <IconMapPin size={24} className="mb-2 text-red-500" />
            <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">校园导航</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">查找教学楼、食堂、图书馆等地点位置。</p>
          </div>
          {/* Card 3 */}
          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
            <IconInfoCircle size={24} className="mb-2 text-teal-500" />
            <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">校园资讯</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">获取学校通知、规章制度或常用服务信息。</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 