import React, { useState } from 'react';
import { IconX, IconChevronDown, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { DifyModelConfig } from '@/types/dify';
import { toast } from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableModels: DifyModelConfig[];
  currentModelName: string | null;
  onSelectModel: (modelName: string) => void;
}

export const ChatSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableModels,
  currentModelName,
  onSelectModel,
}) => {
  // 下拉框是否打开
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  // 确认对话框状态
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSelect = (modelName: string) => {
    onSelectModel(modelName);
    setIsModelDropdownOpen(false); // 选择后关闭下拉框
  };

  // 获取当前选中模型的显示名称
  const getCurrentModelDisplayName = () => {
    if (!currentModelName) return '未选择';
    
    const currentModel = availableModels.find(model => model.name === currentModelName);
    if (!currentModel) return currentModelName;
    
    return currentModel.isDefault 
      ? `${currentModel.name} (默认)` 
      : currentModel.name;
  };

  // 清空聊天记录
  const handleClearAllChats = () => {
    // 关闭确认对话框
    setShowClearConfirmDialog(false);
    
    try {
      // 清除所有与聊天相关的 localStorage 数据
      localStorage.removeItem('conversationHistory');
      localStorage.removeItem('selectedConversation');
      localStorage.removeItem('folders'); // 如果文件夹也要清除
      
      // 显示成功消息
      toast.success('聊天记录已清空，请刷新页面', { duration: 3000 });

      // 可选：在3秒后刷新页面，以确保状态被重置
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('清空聊天记录失败:', error);
      toast.error('清空聊天记录失败，请重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="relative w-full max-w-xl rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6 md:p-8" 
        onClick={(e) => e.stopPropagation()} // 防止点击内容区域关闭模态框
      >
        {/* 关闭按钮 */}
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={onClose}
          aria-label="关闭"
        >
          <IconX size={20} />
        </button>

        {/* 主设置页面 */}
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">聊天设置</h2>
        
        {/* 设置选项区域 */}
        <div className="space-y-6">
          {/* 模型选择区域 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              聊天模型
            </label>
            <div className="relative">
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-650"
              >
                <span>{getCurrentModelDisplayName()}</span>
                <IconChevronDown 
                  className={`h-5 w-5 text-gray-400 transition-transform ${isModelDropdownOpen ? 'transform rotate-180' : ''}`} 
                />
              </button>
              
              {/* 下拉选择框 */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-lg z-10">
                  {availableModels.length > 0 ? (
                    availableModels.map((model) => (
                      <button
                        key={model.name}
                        onClick={() => handleSelect(model.name)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-650 ${
                          currentModelName === model.name
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {model.name} {model.isDefault && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(默认)</span>}
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-2 text-gray-500 dark:text-gray-400">没有可用的对话模型配置。</p>
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              选择用于聊天对话的大语言模型
            </p>
          </div>
          
          {/* 数据管理选项 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <h3 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">数据管理</h3>
            
            {/* 清空聊天记录按钮 */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-red-700 dark:text-red-400 font-medium">清空所有聊天记录</p>
                  <p className="text-sm text-red-600/70 dark:text-red-300/70 mt-1">
                    删除当前账号所有聊天记录和历史数据，此操作不可恢复
                  </p>
                </div>
                <button 
                  onClick={() => setShowClearConfirmDialog(true)}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-800/60 text-red-700 dark:text-red-300 rounded-md flex items-center"
                >
                  <IconTrash size={16} className="mr-1.5" />
                  清空
                </button>
              </div>
            </div>
          </div>
          
          {/* 其他设置选项可在此处添加 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <h3 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">其他设置</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
              <p className="text-gray-600 dark:text-gray-300 font-medium">更多功能</p>
              {/* <p className="text-sm text-gray-500 dark:text-gray-400">...</p> */}
            </div>
          </div>
        </div>

        {/* 确认清空对话框 */}
        {showClearConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6">
              <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
                <IconAlertTriangle size={24} className="mr-2" />
                <h3 className="text-lg font-medium">确认清空所有聊天记录</h3>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                此操作将<span className="font-semibold">永久删除</span>您的所有聊天记录和历史数据，且<span className="font-semibold">无法恢复</span>。确认继续吗？
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowClearConfirmDialog(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md"
                >
                  取消
                </button>
                <button
                  onClick={handleClearAllChats}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center"
                >
                  <IconTrash size={16} className="mr-1.5" />
                  确认清空
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 