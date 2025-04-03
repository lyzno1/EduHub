import React, { useRef, useEffect, useState } from 'react';

interface ConfirmPopoverProps {
  isOpen: boolean;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
  position?: 'top' | 'right' | 'bottom' | 'left';
}

const ConfirmPopover: React.FC<ConfirmPopoverProps> = ({
  isOpen,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'danger',
  position = 'top'
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  
  // 在组件挂载和更新时获取按钮位置
  useEffect(() => {
    if (!isOpen) return;
    
    // 尝试获取所有的删除按钮
    const buttons = document.querySelectorAll('button[id^="delete-button-"]');
    let deleteButton: HTMLElement | null = null;
    
    // 找到当前激活的按钮（带有bg-gray-200或dark:bg-gray-700类的按钮）
    buttons.forEach(button => {
      if ((button as HTMLElement).classList.contains('bg-gray-200') || 
          (button as HTMLElement).classList.contains('dark:bg-gray-700')) {
        deleteButton = button as HTMLElement;
      }
    });
    
    // 如果找不到激活的按钮，则使用第一个找到的按钮
    if (!deleteButton && buttons.length > 0) {
      deleteButton = buttons[0] as HTMLElement;
    }
    
    if (deleteButton) {
      const rect = deleteButton.getBoundingClientRect();
      setPopoverPosition({
        top: rect.top + rect.height/2 + window.scrollY,
        left: rect.right - 6 + window.scrollX,  // 完全贴合垃圾桶
      });
    }
  }, [isOpen]);
  
  // 点击外部关闭气泡
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel]);
  
  if (!isOpen) return null;
  
  // 颜色配置
  const colors = {
    danger: {
      confirmButton: 'bg-red-500 hover:bg-red-600 text-white',
      border: 'border-red-100 dark:border-red-900/30',
      bg: 'bg-red-50 dark:bg-gray-800',
      arrowBg: 'border-r-red-50 dark:border-r-gray-800',
    },
    warning: {
      confirmButton: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      border: 'border-yellow-100 dark:border-yellow-900/30',
      bg: 'bg-yellow-50 dark:bg-gray-800',
      arrowBg: 'border-r-yellow-50 dark:border-r-gray-800',
    },
    info: {
      confirmButton: 'bg-blue-500 hover:bg-blue-600 text-white',
      border: 'border-blue-100 dark:border-blue-900/30',
      bg: 'bg-blue-50 dark:bg-gray-800',
      arrowBg: 'border-r-blue-50 dark:border-r-gray-800',
    }
  };
  
  return (
    <>
      {/* 直接显示在按钮右侧 */}
      <div 
        className="fixed z-[9999] animate-fadeIn"
        ref={popoverRef}
        style={{ 
          animationDuration: '150ms',
          top: `${popoverPosition.top}px`,
          left: `${popoverPosition.left}px`,
          transform: 'translateY(-50%)',
          marginLeft: '-2px', // 更加贴近垃圾桶
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 气泡内容 */}
        <div 
          className={`w-32 rounded-xl ${colors[type].bg} py-2 px-2.5 shadow-lg border ${colors[type].border} dark:bg-gray-800 dark:text-white flex flex-col items-center`}
        >
          <p className="mb-2 font-medium text-center text-xs">{message}</p>
          
          <div className="flex justify-center space-x-2">
            <a
              href="#"
              className="rounded-full px-2.5 py-1 text-xs font-medium text-center text-gray-600 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-700/80 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
              }}
            >
              {cancelText}
            </a>
            <a
              href="#"
              className={`rounded-full px-2.5 py-1 text-xs font-medium text-center ${colors[type].confirmButton} transition-colors`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onConfirm();
              }}
            >
              {confirmText}
            </a>
          </div>
        </div>
        
        {/* 左侧箭头 */}
        <div 
          className={`absolute w-0 h-0 border-[6px] ${colors[type].arrowBg} border-t-transparent border-b-transparent border-l-transparent`}
          style={{
            right: 'calc(100% - 0px)',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10000
          }}
        ></div>
      </div>
    </>
  );
};

export default ConfirmPopover; 