import { useState, useEffect } from 'react';

export const useMobileDetection = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 初始化检查
    checkMobile();
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);

    // 清理监听器
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}; 