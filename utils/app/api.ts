import { Plugin } from '@/types/plugin';
import { ModelType } from '@/types/openai';

// Dify API 配置
export const DIFY_CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_DIFY_API_URL || 'http://localhost/v1/chat-messages',
  API_KEY: process.env.NEXT_PUBLIC_DIFY_API_KEY || '',
};

// 获取当前使用的API类型
export const getApiType = () => {
  if (typeof window !== 'undefined') {
    // 客户端渲染时从localStorage获取
    const savedType = localStorage.getItem('apiType');
    return savedType || 'dify'; // 默认为 dify
  }
  return 'dify'; // 服务器端渲染时默认返回
};

// 根据插件获取API端点
export const getEndpoint = (plugin: Plugin) => {
  return `/api/${plugin.id}`;
};

// 根据模型类型获取API端点
export const getModelEndpoint = () => {
  return DIFY_CONFIG.API_URL;
};

// 获取 API Key
export const getApiKey = () => {
  return DIFY_CONFIG.API_KEY;
};

// 处理API错误
export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  return {
    error: {
      message: error.message || 'An error occurred while processing your request.',
      type: error.type || 'api_error',
      param: error.param || null,
      code: error.code || null,
    },
  };
};
