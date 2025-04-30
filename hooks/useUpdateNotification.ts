import { useState, useEffect } from 'react';
import { UpdateInfo } from '@/utils/app/updateInfo';
import { markUpdateAsViewed, hasViewedUpdateInCurrentSession } from '@/utils/app/updateInfo';

interface UseUpdateNotificationResult {
  updateInfo: UpdateInfo | null;
  isLoading: boolean;
  error: Error | null;
  closeNotification: () => void;
}

export const useUpdateNotification = (userId: string): UseUpdateNotificationResult => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUpdateInfo = async () => {
    // 仅在客户端环境中执行
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 检查当前会话是否已经查看过更新
      if (hasViewedUpdateInCurrentSession()) {
        setUpdateInfo(null);
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/update-info');
      
      if (!response.ok) {
        throw new Error('获取更新信息失败');
      }
      
      const data = await response.json();
      setUpdateInfo(data);
    } catch (err) {
      console.error('获取更新信息时出错:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const closeNotification = () => {
    // 标记当前会话已查看更新
    markUpdateAsViewed(userId);
    setUpdateInfo(null);
  };

  useEffect(() => {
    // 确保在客户端环境中执行
    if (typeof window !== 'undefined') {
      fetchUpdateInfo();
    }
  }, []);

  return { updateInfo, isLoading, error, closeNotification };
};

export default useUpdateNotification; 