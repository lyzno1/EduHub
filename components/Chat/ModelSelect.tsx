import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

export const ModelSelect = () => {
  const { t } = useTranslation('chat');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const {
    state: { selectedConversation, defaultModelId },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleChange = (model: OpenAIModel) => {
    if (selectedConversation) {
      handleUpdateConversation(selectedConversation, {
        key: 'model',
        value: model,
      });
    }
  };

  const modelOptions = Object.values(OpenAIModels).map((model) => {
    return (
      <div
        key={model.id}
        className={`flex cursor-pointer items-center justify-between px-3 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-[#343541]/90 ${
          selectedConversation?.model.id === model.id
            ? 'bg-gray-100 dark:bg-[#343541]/90'
            : ''
        }`}
        onClick={() => {
          handleChange(model);
          setIsOpen(false);
        }}
      >
        <div className="flex items-center">
          <div className="text-sm font-medium text-black dark:text-white">
            {model.name}
          </div>
        </div>
        {selectedConversation?.model.id === model.id && (
          <IconCheck size={18} className="text-green-500 dark:text-green-400" />
        )}
      </div>
    );
  });

  // 高亮显示DeepSeek模型选项
  const deepSeekModelIndex = Object.values(OpenAIModels).findIndex(
    model => model.id === OpenAIModelID.DEEPSEEK_CHAT
  );
  const deepSeekModelOption = deepSeekModelIndex !== -1 ? modelOptions[deepSeekModelIndex] : null;

  return (
    <div className="relative w-full">
      <button
        className="relative w-full cursor-pointer rounded border border-gray-300 bg-white py-2 px-4 text-left text-sm font-normal text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-[#343541] dark:text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="ml-2 text-sm">{selectedConversation?.model.name}</div>
          </div>
          <IconChevronDown size={18} className="ml-2" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-[#343541]">
          <div className="max-h-64 overflow-auto">
            {/* 如果有DeepSeek模型，将其单独显示在顶部 */}
            {deepSeekModelOption && (
              <div className="border-b border-gray-200 pb-2 dark:border-gray-700">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300">
                  推荐模型
                </div>
                {deepSeekModelOption}
              </div>
            )}
            
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300">
              {deepSeekModelOption ? '其他模型' : '可用模型'}
            </div>
            {modelOptions}
          </div>
        </div>
      )}
    </div>
  );
};
