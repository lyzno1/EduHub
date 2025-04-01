import { Plugin } from '@/types/plugin';

export const getEndpoint = (plugin: Plugin | null) => {
  if (plugin) {
    return plugin.api;
  }

  return '/api/chat';
};

// 新增函数，用于获取模型对应的API端点
export const getModelEndpoint = (modelType: string | undefined) => {
  console.log("Model type for API endpoint:", modelType);
  
  if (modelType === 'deepseek') {
    console.log("Using DeepSeek API endpoint");
    return '/api/deepseek-chat';
  }
  
  // 默认使用常规的chat API
  console.log("Using default chat API endpoint");
  return '/api/chat';
};
