import { IconBook, IconSchool, IconUser } from '@tabler/icons-react';
import React, { useContext, useEffect, useState } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import cardConfigData from '../../promptFunctionCards.json'; // Adjust path if needed
import toast from 'react-hot-toast';

// Define types based on the new JSON structure
interface FunctionButtonConfig {
  id: string;
  name: string;
  prompt: string;
}

interface CategoryConfig {
  id: string;
  name: string;
  icon: string; // Icon identifier string
  description: string;
  children: FunctionButtonConfig[];
}

// Keep existing props interface
interface FunctionCardsProps {
  scrollToBottom?: () => void;
  setContent?: React.Dispatch<React.SetStateAction<string>>;
}

// Define the icon mapping
const iconMap: { [key: string]: React.ReactNode } = {
  user: <IconUser />, // Map string to component
  school: <IconSchool />,
  book: <IconBook />,
  // Add more mappings if needed
};

// FunctionCard internal props need update
interface FunctionCardProps {
  category: CategoryConfig; // Use new type
  isDarkMode: boolean;
  handleFunctionClick: (categoryId: string, functionId: string) => void;
  isMobile: boolean;
  selectedFunctionId: string | null; // Pass down selected ID
}

export const FunctionCards: React.FC<FunctionCardsProps> = ({ scrollToBottom, setContent }) => {
  const {
    state: { lightMode },
  } = useContext(HomeContext);

  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Cast imported JSON data to the defined type
  const functionCategories: CategoryConfig[] = cardConfigData as CategoryConfig[];

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

  const isDarkMode = lightMode === 'dark';

  // Remove the hardcoded functionCategories array
  // const functionCategories = [ ... ];

  const handleFunctionClick = (categoryId: string, functionId: string) => {
    if (functionId === selectedFunctionId) {
      setSelectedFunctionId(null);
      if (setContent) setContent('');
      return;
    }

    // Find the button config within the imported data to get the prompt
    let promptText: string | undefined;
    let foundFunction: FunctionButtonConfig | undefined;

    for (const category of functionCategories) {
      foundFunction = category.children.find(f => f.id === functionId);
      if (foundFunction) {
        promptText = foundFunction.prompt; // Get prompt from the found button config
        break;
      }
    }

    if (foundFunction && typeof promptText === 'string' && promptText.trim() !== '') {
      if (setContent) {
        setContent(promptText);
        setSelectedFunctionId(functionId);

        const textarea = document.querySelector('textarea');
        if (textarea) textarea.focus();
        if (scrollToBottom) setTimeout(() => scrollToBottom(), 100);

      } else {
        console.warn('setContent function was not provided to FunctionCards');
      }
    } else {
      const functionName = foundFunction?.name || functionId;
      console.error(`Error: Prompt not found or is empty in config for function ID: ${functionId}`);
      toast.error(`未能为 "${functionName}" 功能找到有效的提示语配置。`);
      setSelectedFunctionId(null); 
    }
  };

  // Mobile Buttons Component - Adapt to new data structure
  const MobileButtons = () => {
    // Flatten the data from the imported config
    const allFunctions = functionCategories.flatMap(category =>
      category.children.map(func => ({
        categoryId: category.id,
        functionId: func.id,
        functionName: func.name
        // No need for categoryName here unless used in styling/logic
      }))
    );

    return (
      <div className="w-full">
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {allFunctions.map((func) => {
            const isSelected = func.functionId === selectedFunctionId;
            // Determine icon size based on isMobile state
            // const IconComponent = iconMap[category.icon] || <IconBook />; // Need category info if showing icons
            return (
              <button
                key={func.functionId}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 border ${isSelected
                  ? (isDarkMode
                      ? 'bg-blue-900/70 text-blue-200 border-blue-700 ring-1 ring-blue-600'
                      : 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-200')
                  : (isDarkMode
                      ? 'bg-gray-800 text-gray-200 border-gray-700 active:bg-gray-700'
                      : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50')
                }`}
                style={{
                  boxShadow: isSelected
                    ? (isDarkMode ? '0 1px 2px rgba(0, 100, 255, 0.3)' : '0 1px 3px rgba(59, 130, 246, 0.2)')
                    : (isDarkMode ? '0 1px 2px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)'),
                }}
                onClick={() => handleFunctionClick(func.categoryId, func.functionId)}
              >
                {func.functionName}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Function Card Component - Adapt to new data structure and icon map
  const FunctionCard = ({ category, isDarkMode, handleFunctionClick, isMobile, selectedFunctionId }: FunctionCardProps) => {
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

    // Get the icon component from the map, provide a default
    const IconComponent = iconMap[category.icon] || <IconBook size={isMobile ? 18 : 20} />; 
    // Clone element to apply dynamic size - more robust way
    const sizedIcon = React.isValidElement(IconComponent) 
        ? React.cloneElement(IconComponent, { size: isMobile ? 18 : 20, className: "sm:w-6 sm:h-6" } as any)
        : IconComponent;

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
            {/* Use the mapped and sized icon */}
            <div className={`function-card-icon p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <div className={isDarkMode ? 'text-blue-400' : 'text-blue-500'}>
                {sizedIcon}
              </div>
            </div>
            <h3 className={`function-card-title text-base sm:text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`} style={{ fontFamily: "'PingFang SC', Arial, sans-serif" }}>
              {category.name}
            </h3>
          </div>
          <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2 sm:mb-3`} style={{ fontFamily: "'PingFang SC', Arial, sans-serif", letterSpacing: '0.1px' }}>
            {category.description}
          </p>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 sm:mt-4">
            {category.children.map((func) => {
              const isSelected = func.id === selectedFunctionId;
              return (
                <button
                  key={func.id}
                  className={`function-card-button text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-md ${isSelected
                    ? (isDarkMode /* Selected */
                        ? 'bg-blue-900/70 text-blue-200 border border-blue-700 hover:bg-blue-800/80 hover:shadow-blue-900/40'
                        : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 hover:shadow-blue-500/30')
                    : (isDarkMode /* Unselected */
                        ? 'bg-gray-700 text-gray-200 border border-transparent hover:bg-gray-600 hover:shadow-gray-900/30'
                        : 'bg-gray-50 text-gray-700 border border-transparent hover:bg-blue-50 hover:text-blue-600 hover:shadow-blue-500/20')
                  }`}
                  style={{ transition: 'all 0.2s ease', fontFamily: "'PingFang SC', Arial, sans-serif" }}
                  onClick={() => handleFunctionClick(category.id, func.id)}
                >
                  {func.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Main return: Iterate over config data and pass selected ID down
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
              selectedFunctionId={selectedFunctionId} // Pass state down
            />
          ))}
        </div>
      )}
    </div>
  );
}; 