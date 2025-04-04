import { IconBook, IconSchool, IconUser } from '@tabler/icons-react';
import React, { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';

// 定义类型
interface FunctionItem {
  id: string;
  name: string;
}

interface CategoryItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  children: FunctionItem[];
}

interface FunctionCardProps {
  category: CategoryItem;
  isDarkMode: boolean;
  handleFunctionClick: (categoryId: string, functionId: string) => void;
}

export const FunctionCards: React.FC = () => {
  const {
    state: { lightMode },
  } = useContext(HomeContext);

  // 判断是否为深色模式
  const isDarkMode = lightMode === 'dark';
  
  // 定义功能分类和子功能
  const functionCategories = [
    {
      id: 'teacher',
      name: '教师助手',
      icon: <IconUser size={24} />,
      description: '面向教师的智能教学辅助工具',
      children: [
        { id: 'teacher-1', name: '课程规划' },
        { id: 'teacher-2', name: '挑战识别' },
        { id: 'teacher-3', name: '测试生成' }
      ]
    },
    {
      id: 'student',
      name: '学生助手',
      icon: <IconSchool size={24} />,
      description: '提供学习与交流的智能服务',
      children: [
        { id: 'student-1', name: '写作导师' },
        { id: 'student-2', name: '项目分析' },
        { id: 'student-3', name: '同伴学习' },
        { id: 'student-4', name: '决策讨论' }
      ]
    },
    {
      id: 'knowledge',
      name: '校园服务',
      icon: <IconBook size={24} />,
      description: '面向校园的一站式信息服务',
      children: [
        { id: 'knowledge-1', name: '智能助手' },
        { id: 'knowledge-2', name: '课程助教' },
        { id: 'knowledge-3', name: '校园助手' }
      ]
    }
  ];

  const handleFunctionClick = (categoryId: string, functionId: string) => {
    console.log(`功能点击：${categoryId} - ${functionId}`);
    // TODO: 实现具体功能的业务逻辑
  };

  const FunctionCard = ({ 
    category, 
    isDarkMode, 
    handleFunctionClick 
  }: FunctionCardProps) => {
    const getDefaultShadow = () => {
      return isDarkMode 
        ? '0 2px 5px rgba(0, 0, 0, 0.3)' 
        : '0 1px 3px rgba(0, 0, 0, 0.1)';
    };

    const getHoverShadow = () => {
      return isDarkMode 
        ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
        : '0 4px 12px rgba(59, 130, 246, 0.2)';
    };

    return (
      <div
        className="function-card mb-2 overflow-hidden rounded-lg transition-all duration-300 ease-in-out"
        style={{
          boxShadow: getDefaultShadow(),
          border: `1px solid ${isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
          transition: 'box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = getHoverShadow();
          e.currentTarget.style.borderColor = isDarkMode ? 'rgba(107, 114, 128, 0.8)' : 'rgba(191, 219, 254, 1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = getDefaultShadow();
          e.currentTarget.style.borderColor = isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(229, 231, 235, 0.8)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center mb-2">
            <div className={`function-card-icon p-2 rounded-lg mr-3 ${
              isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
            }`}>
              <div className={isDarkMode ? 'text-blue-400' : 'text-blue-500'}>
                {category.icon}
              </div>
            </div>
            <h3 className={`function-card-title text-lg font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              {category.name}
            </h3>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {category.description}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {category.children.map((func) => (
              <button
                key={func.id}
                className={`function-card-button text-sm px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-md transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:shadow-gray-900/30' 
                    : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:shadow-blue-500/20'
                }`}
                style={{
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleFunctionClick(category.id, func.id)}
              >
                {func.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="function-cards-container w-full">
      <div className="function-cards-grid grid grid-cols-1 sm:grid-cols-3 gap-4">
        {functionCategories.map((category) => (
          <FunctionCard
            key={category.id}
            category={category}
            isDarkMode={isDarkMode}
            handleFunctionClick={handleFunctionClick}
          />
        ))}
      </div>
    </div>
  );
}; 