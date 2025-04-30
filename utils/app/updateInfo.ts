export interface UpdateInfo {
  version?: string;
  title: string;
  content: string[];
  date?: string;
}

/**
 * 将用户ID添加到已查看更新的用户列表中
 * @param userId 用户ID
 */
export const markUpdateAsViewed = (userId: string): void => {
  try {
    // 仅在客户端环境中执行
    if (typeof window !== 'undefined') {
      const storageKey = 'update_viewed_users';
      // 在客户端存储中获取已查看更新的用户列表
      const viewedUsers = localStorage.getItem(storageKey);
      let users: string[] = [];
      
      if (viewedUsers) {
        users = JSON.parse(viewedUsers);
      }
      
      // 如果用户ID不在列表中，添加它
      if (!users.includes(userId)) {
        users.push(userId);
        localStorage.setItem(storageKey, JSON.stringify(users));
      }
    }
  } catch (error) {
    console.error('标记更新为已查看出错:', error);
  }
};

/**
 * 检查用户是否已经查看过最新更新
 * @param userId 用户ID
 * @returns 如果用户已查看过更新，返回true；否则返回false
 */
export const hasUserViewedUpdate = (userId: string): boolean => {
  try {
    // 仅在客户端环境中执行
    if (typeof window !== 'undefined') {
      const storageKey = 'update_viewed_users';
      const viewedUsers = localStorage.getItem(storageKey);
      
      if (!viewedUsers) {
        return false;
      }
      
      const users: string[] = JSON.parse(viewedUsers);
      return users.includes(userId);
    }
    return false;
  } catch (error) {
    console.error('检查用户是否查看过更新出错:', error);
    return false;
  }
}; 