import { DifyClient } from './client';
export * from './types';

// 创建默认客户端实例
const defaultClient = new DifyClient();

// 保持与原有 DifyStream 函数签名兼容的包装函数
export const DifyStream = async (
  query: string,
  key: string,
  user: string,
  conversationId?: string
) => {
  const stream = await defaultClient.createChatStream({
    query,
    key,
    user,
    conversationId
  });

  return { stream };
};

// 导出客户端类,以支持自定义实例化
export { DifyClient }; 