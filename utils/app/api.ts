import { Plugin } from '@/types/plugin';
import { ModelType } from '@/types/openai';
import { DifyClient } from '@/services/dify';
import { getDifyConfig, difyAppConfig } from '@/config/dify';

// 创建默认的 DifyClient 实例
const defaultClient = new DifyClient(getDifyConfig());

// 注册默认应用配置
difyAppConfig.registerApp({
  appId: process.env.NEXT_PUBLIC_DIFY_APP_ID || 'default',
  apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY || '',
  model: process.env.NEXT_PUBLIC_DIFY_MODEL,
});

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

// 获取 DifyClient 实例
export const getDifyClient = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // 移动端每次创建新实例，避免共享实例导致的问题
  if (isMobile) {
    // 直接打印alert弹窗，确保在移动端也能看到日志
    try {
      const config = getDifyConfig();
      alert('移动端创建DifyClient: ' + config.apiUrl);
      
      // 创建新的实例而不是复用
      return new DifyClient({
        apiUrl: config.apiUrl,
        timeout: config.timeout || 45000, // 确保有默认值
        debug: true // 启用调试模式
      });
    } catch (err) {
      alert('创建DifyClient错误: ' + (err instanceof Error ? err.message : String(err)));
      throw err;
    }
  }
  
  return defaultClient;
};

// 获取 API Key
export const getApiKey = () => {
  return difyAppConfig.getCurrentConfig().apiKey;
};

// 切换 Dify 应用
export const switchDifyApp = (appId: string) => {
  difyAppConfig.switchApp(appId);
  const config = difyAppConfig.getCurrentConfig();
  defaultClient.setAppId(appId);
  if (config.model) {
    defaultClient.setModel(config.model);
  }
};

// 切换 Dify 模型
export const switchDifyModel = (model: string) => {
  const config = difyAppConfig.getCurrentConfig();
  difyAppConfig.updateAppConfig(config.appId, { model });
  defaultClient.setModel(model);
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
