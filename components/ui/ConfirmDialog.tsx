import React from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  if (!isOpen) return null;

  // 阻止点击弹窗内部时关闭整个弹窗
  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 颜色配置
  const colors = {
    danger: {
      icon: 'text-red-500',
      confirmButton: 'bg-red-500 hover:bg-red-600 focus:ring-red-400',
      title: 'text-red-600 dark:text-red-400'
    },
    warning: {
      icon: 'text-yellow-500',
      confirmButton: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400',
      title: 'text-yellow-600 dark:text-yellow-400'
    },
    info: {
      icon: 'text-blue-500',
      confirmButton: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400',
      title: 'text-blue-600 dark:text-blue-400'
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onCancel}
    >
      <div 
        className="w-72 max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800"
        onClick={handleDialogClick}
      >
        <div className="mb-3 flex items-center">
          <div className={`mr-3 ${colors[type].icon}`}>
            <IconAlertTriangle size={24} />
          </div>
          <h3 className={`text-lg font-semibold ${colors[type].title}`}>
            {title}
          </h3>
        </div>
        
        <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
          {message}
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-2 ${colors[type].confirmButton}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog; 