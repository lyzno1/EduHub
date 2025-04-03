import { Plugin } from '@/types/plugin';
import { ModelType } from '@/types/openai';

export const getEndpoint = (plugin: Plugin | null) => {
  if (plugin) {
    return plugin.api;
  }

  return '/api/chat';
};

// 统一的API端点路由函数
export const getModelEndpoint = (modelType: string | undefined) => {
  console.log("Model type for API endpoint:", modelType);
  
  switch(modelType) {
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
    
    case ModelType.DIFY:
    default:
      // 默认使用常规的chat API (连接到Dify)
      console.log("Using default chat API endpoint (Dify)");
      return '/api/chat';
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
