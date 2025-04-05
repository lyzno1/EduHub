import { Plugin } from '@/types/plugin';
import { ModelType } from '@/types/openai';

export const getEndpoint = (plugin: Plugin | null) => {
  if (plugin) {
    return plugin.url;
  }

  // 动态选择默认API端点，不硬编码
  return getModelEndpoint();
};

// 设置默认API类型
export const setDefaultApiType = (apiType: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('defaultApiType', apiType);
    console.log(`Default API type set to: ${apiType}`);
  }
};

// 获取默认API类型
export const getDefaultApiType = (): string => {
  if (typeof window !== 'undefined') {
    const savedType = localStorage.getItem('defaultApiType');
    return savedType || 'deepseek'; // 默认为deepseek
  }
  return 'deepseek'; // 服务器端渲染时默认返回
};

// 统一的API端点路由函数
export const getModelEndpoint = (modelType?: string) => {
  console.log("Model type for API endpoint:", modelType);
  
  switch(modelType) {
    case ModelType.DIFY:
      console.log("Using Dify API endpoint");
      return '/api/chat';
    
    case ModelType.DEEPSEEK:
      console.log("Using DeepSeek API endpoint");
      return '/api/deepseek-chat';
      
    case ModelType.CLAUDE:
      console.log("Using Claude API endpoint");
      return '/api/claude-chat';
    
    case ModelType.GEMINI:
      console.log("Using Gemini API endpoint");
      return '/api/gemini-chat';
    
    case ModelType.OPENAI:
      console.log("Using OpenAI API endpoint");
      return '/api/openai-chat';
    
    default:
      // 使用getDefaultApiType获取默认API类型
      const defaultApiType = getDefaultApiType();
      console.log(`Using default API endpoint (${defaultApiType})`);
      
      if (defaultApiType === 'dify') {
        return '/api/chat';
      } else {
        return '/api/deepseek-chat';
      }
  }
};

// API错误处理统一函数
export const handleApiError = (error: any) => {
  console.error('API request failed:', error);
  
  // 标准化错误响应格式
  return {
    error: {
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      type: 'server_error',
      param: null,
      code: error.code || null,
    }
  };
};
