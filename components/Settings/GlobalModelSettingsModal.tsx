import React from 'react';
import { IconX } from '@tabler/icons-react';
import { DifyModelConfig } from '@/types/dify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableModels: DifyModelConfig[];
  currentModelName: string | null;
  onSelectModel: (modelName: string) => void;
}

export const GlobalModelSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableModels,
  currentModelName,
  onSelectModel,
}) => {
  if (!isOpen) {
    return null;
  }

  const handleSelect = (modelName: string) => {
    onSelectModel(modelName);
    // 选择后自动关闭模态框
    // onClose(); // 移动到 Home.tsx 的 handleSelectGlobalModel 中关闭
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6" 
        onClick={(e) => e.stopPropagation()} // 防止点击内容区域关闭模态框
      >
        {/* 关闭按钮 */}
        <button 
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={onClose}
          aria-label="关闭"
        >
          <IconX size={20} />
        </button>

        {/* 标题 */}
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">选择全局聊天模型</h2>

        {/* 模型列表 */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {availableModels.length > 0 ? (
            availableModels.map((model) => (
              <button
                key={model.name}
                onClick={() => handleSelect(model.name)}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-150 ${ 
                  currentModelName === model.name 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {model.name} {model.isDefault && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(默认)</span>}
              </button>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">没有可用的全局模型配置。</p>
          )}
        </div>
      </div>
    </div>
  );
}; 