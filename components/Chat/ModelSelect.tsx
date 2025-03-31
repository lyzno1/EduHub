import { IconChevronDown } from '@tabler/icons-react';
import { useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

export const ModelSelect = () => {
  const { t } = useTranslation('chat');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const {
    state: { selectedConversation, models, defaultModelId },
    handleUpdateConversation,
  } = useContext(HomeContext);

  const handleChange = (modelId: string) => {
    if (selectedConversation) {
      const model = models.find((model) => model.id === modelId);
      if (model) {
        handleUpdateConversation(selectedConversation, {
          key: 'model',
          value: model,
        });
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-stretch">
      <button
        className="flex h-[44px] items-center justify-center border-l border-r border-gray-300 px-3 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="max-w-[70px] overflow-hidden text-ellipsis whitespace-nowrap">
          {selectedConversation?.model.name || models.find(m => m.id === defaultModelId)?.name || 'Model'}
        </div>
        <IconChevronDown size={14} className="ml-1" />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-md border border-gray-300 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
          <div className="py-1">
            {models.map((model) => (
              <button
                key={model.id}
                className={`flex w-full items-center px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 ${
                  selectedConversation?.model.id === model.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                }`}
                onClick={() => handleChange(model.id)}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
