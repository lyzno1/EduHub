import { useState, useEffect } from 'react';

interface UseInputHeightObserverOptions {
  selector: string;
  defaultHeight?: number;
  minHeightChange?: number;
  isEnabled?: boolean;
  checkIsExpanded?: boolean;
  expandedThreshold?: number; 
}

interface UseInputHeightObserverResult {
  height: number;
  isExpanded: boolean;
}

/**
 * 监听指定元素的 data-input-height 属性变化
 * 
 * @param options 配置选项
 * @returns 输入框高度和展开状态
 */
export const useInputHeightObserver = (options: UseInputHeightObserverOptions): UseInputHeightObserverResult => {
  const {
    selector,
    defaultHeight = 65,
    minHeightChange = 5,
    isEnabled = true,
    checkIsExpanded = false,
    expandedThreshold = 70
  } = options;

  const [height, setHeight] = useState<number>(defaultHeight);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    // 如果不启用，则跳过
    if (!isEnabled) {
      return;
    }

    // 查找目标输入框容器
    const inputContainer = document.querySelector(selector);
    if (!inputContainer) return;

    // 通过 MutationObserver 监听 data-input-height 属性的变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-input-height') {
          const newHeight = parseInt(inputContainer.getAttribute('data-input-height') || String(defaultHeight), 10);
          
          // 只有当高度显著变化时才更新状态
          if (Math.abs(newHeight - height) >= minHeightChange) {
            setHeight(newHeight);
            
            // 如果需要检查是否展开，则更新状态
            if (checkIsExpanded) {
              setIsExpanded(newHeight > expandedThreshold);
            }
          }
        }
      });
    });
    
    // 开始观察目标元素
    observer.observe(inputContainer, { attributes: true });
    
    // 清理函数
    return () => {
      observer.disconnect();
    };
  }, [
    selector, 
    defaultHeight, 
    minHeightChange, 
    isEnabled, 
    checkIsExpanded, 
    expandedThreshold, 
    height
  ]);

  return { height, isExpanded };
}; 