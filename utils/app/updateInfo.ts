export interface UpdateInfo {
  version?: string;
  title: string;
  content: string[];
  date?: string;
}

/**
 * 将会话标记为已查看更新
 * @param userId 用户ID
 */
export const markUpdateAsViewed = (userId: string): void => {
  try {
    // 仅在客户端环境中执行
    if (typeof window !== 'undefined') {
      // 使用sessionStorage而非localStorage，确保每次会话都会显示通知
      sessionStorage.setItem('update_viewed', 'true');
    }
  } catch (error) {
    console.error('标记更新为已查看出错:', error);
  }
};

/**
 * 检查当前会话是否已经查看过更新
 * @returns 如果当前会话已查看过更新，返回true；否则返回false
 */
export const hasViewedUpdateInCurrentSession = (): boolean => {
  try {
    // 仅在客户端环境中执行
    if (typeof window !== 'undefined') {
      // 检查sessionStorage中是否有标记
      return sessionStorage.getItem('update_viewed') === 'true';
    }
    return false;
  } catch (error) {
    console.error('检查会话是否查看过更新出错:', error);
    return false;
  }
}; 