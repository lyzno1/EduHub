import { IconBook, IconSchool, IconUser } from '@tabler/icons-react';
import React, { useContext, useEffect, useState } from 'react';
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
  isMobile: boolean;
}

// 添加可选的scrollToBottom属性
interface FunctionCardsProps {
  scrollToBottom?: () => void;
  setContent?: React.Dispatch<React.SetStateAction<string>>;
}

export const FunctionCards: React.FC<FunctionCardsProps> = ({ scrollToBottom, setContent }) => {
  const {
    state: { lightMode },
  } = useContext(HomeContext);
  
  // 添加移动端检测
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 判断是否为深色模式
  const isDarkMode = lightMode === 'dark';
  
  // 定义功能分类和子功能
  const functionCategories = [
    {
      id: 'teacher',
      name: '教师助手',
      icon: <IconUser size={isMobile ? 18 : 20} className="sm:w-6 sm:h-6" />,
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
      icon: <IconSchool size={isMobile ? 18 : 20} className="sm:w-6 sm:h-6" />,
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
      icon: <IconBook size={isMobile ? 18 : 20} className="sm:w-6 sm:h-6" />,
      description: '面向校园的一站式信息服务',
      children: [
        { id: 'knowledge-1', name: '智能助手' },
        { id: 'knowledge-2', name: '课程助教' },
        { id: 'knowledge-3', name: '校园助手' }
      ]
    }
  ];

  const handleFunctionClick = (categoryId: string, functionId: string) => {
    const selectedCategory = functionCategories.find(c => c.id === categoryId);
    const selectedFunction = selectedCategory?.children.find(f => f.id === functionId);
    
    if (selectedFunction) {
      // 准备要插入的文本
      const promptText = `作为${selectedCategory?.name}中的${selectedFunction.name}，请帮我：`;
      
      // 使用React状态更新方式追加内容
      if (setContent) {
        setContent(prevContent => prevContent + promptText); // 修改为追加
        
        // 如果输入框获取焦点（可选，但体验更好）
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
        
        // 滚动到底部（如果提供了这个功能）
        if (scrollToBottom) {
          setTimeout(() => {
            scrollToBottom();
          }, 100); // 保持延迟以确保内容更新后滚动
        }
      } else {
        console.warn('setContent function was not provided to FunctionCards');
        // 如果没有 setContent，可以选择提供一个备用方案或提示错误
      }
    }
  };

  // 移动端简约版按钮组件
  const MobileButtons = () => {
    // 将所有功能扁平化为一个列表
    const allFunctions = functionCategories.flatMap(category => 
      category.children.map(func => ({
        categoryId: category.id,
        categoryName: category.name,
        functionId: func.id,
        functionName: func.name
      }))
    );
    
    return (
      <div className="w-full">
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {allFunctions.map((func) => (
            <button
              key={func.functionId}
              className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 border ${
                isDarkMode 
                  ? 'bg-gray-800 text-gray-200 border-gray-700 active:bg-gray-700' 
                  : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'
              }`}
              style={{
                boxShadow: isDarkMode 
                  ? '0 1px 2px rgba(0, 0, 0, 0.2)' 
                  : '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
              onClick={() => handleFunctionClick(func.categoryId, func.functionId)}
            >
              {func.functionName}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const FunctionCard = ({ 
    category, 
    isDarkMode, 
    handleFunctionClick,
    isMobile 
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
        <div className={`p-3 sm:p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center mb-1 sm:mb-2">
            <div className={`function-card-icon p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3 ${
              isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
            }`}>
              <div className={isDarkMode ? 'text-blue-400' : 'text-blue-500'}>
                {category.icon}
              </div>
            </div>
            <h3 className={`function-card-title text-base sm:text-lg font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}
            style={{ fontFamily: "'PingFang SC', Arial, sans-serif" }}>
              {category.name}
            </h3>
          </div>
          <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2 sm:mb-3`}
             style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.1px' }}>
            {category.description}
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 sm:mt-4">
            {category.children.map((func) => (
              <button
                key={func.id}
                className={`function-card-button text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 hover:shadow-md transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:shadow-gray-900/30' 
                    : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:shadow-blue-500/20'
                }`}
                style={{
                  transition: 'all 0.2s ease',
                  fontFamily: "'PingFang SC', Arial, sans-serif",
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

  // 根据设备类型返回不同的UI
  return (
    <div className="function-cards-container w-full">
      {isMobile ? (
        <MobileButtons />
      ) : (
        <div className="function-cards-grid grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        {functionCategories.map((category) => (
          <FunctionCard
            key={category.id}
            category={category}
            isDarkMode={isDarkMode}
            handleFunctionClick={handleFunctionClick}
              isMobile={isMobile}
          />
        ))}
      </div>
      )}
    </div>
  );
}; 