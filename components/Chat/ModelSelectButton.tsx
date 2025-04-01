import { IconChevronDown } from '@tabler/icons-react';
import { useContext, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import HomeContext from '@/pages/api/home/home.context';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { IconBrandDeepseek } from '../Icons/DeepSeekIcon';

export const ModelSelectButton = () => {
  const { t } = useTranslation('chat');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    state: { selectedConversation },
    handleUpdateConversation,
  } = useContext(HomeContext);

  const handleModelChange = (model: OpenAIModel) => {
    if (selectedConversation) {
      handleUpdateConversation(selectedConversation, {
        key: 'model',
        value: model,
      });
    }
    setIsOpen(false);
  };

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentModel = selectedConversation?.model || OpenAIModels[OpenAIModelID.DEEPSEEK_CHAT];
  
  // 根据模型类型返回不同的图标
  const getModelIcon = (model: OpenAIModel) => {
    if (model.apiType === 'deepseek') {
      return <IconBrandDeepseek size={18} />;
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-2 rounded-md bg-transparent py-2 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50/30 dark:text-gray-300 dark:hover:bg-gray-800/30"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {getModelIcon(currentModel)}
          <span>{currentModel.name}</span>
        </div>
        <IconChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="p-1">
            {/* DeepSeek模型（优先显示） */}
            <div className="mb-1 border-b border-gray-100 pb-1 dark:border-gray-700">
              <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                推荐模型
              </div>
              {Object.values(OpenAIModels)
                .filter(model => model.apiType === 'deepseek')
                .map(model => (
                  <button
                    key={model.id}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left ${
                      currentModel.id === model.id
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/30'
                    }`}
                    onClick={() => handleModelChange(model)}
                  >
                    <IconBrandDeepseek size={16} className={currentModel.id === model.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} />
                    <span>{model.name}</span>
                  </button>
                ))}
            </div>
            
            {/* 其他模型 */}
            <div>
              <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                其他模型
              </div>
              {Object.values(OpenAIModels)
                .filter(model => model.apiType !== 'deepseek')
                .map(model => (
                  <button
                    key={model.id}
                    className={`flex w-full items-center rounded-md px-2 py-1.5 text-sm text-left ${
                      currentModel.id === model.id
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/30'
                    }`}
                    onClick={() => handleModelChange(model)}
                  >
                    <span className="ml-6">{model.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 