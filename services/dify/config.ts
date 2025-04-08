import { DifyConfig } from './types';

/**
 * 获取 Dify 配置
 * 优先级: 传入参数 > 环境变量 > 默认值
 */
export function getDifyConfig(config: Partial<DifyConfig> = {}): DifyConfig {
  const debug = process.env.NODE_ENV === 'development';
  
  // 从环境变量获取配置
  const envConfig = {
    apiUrl: process.env.NEXT_PUBLIC_DIFY_API_URL,
    debug: debug,
    timeout: process.env.NEXT_PUBLIC_DIFY_TIMEOUT ? parseInt(process.env.NEXT_PUBLIC_DIFY_TIMEOUT) : undefined
  };

  // 合并配置，优先使用传入的配置
  const mergedConfig: DifyConfig = {
    apiUrl: config.apiUrl || envConfig.apiUrl || 'http://localhost:8088',
    debug: config.debug ?? envConfig.debug ?? false,
    timeout: config.timeout || envConfig.timeout || 30000
  };

  // 在开发环境下打印配置信息
  if (mergedConfig.debug) {
    console.log('[Dify Config]', {
      apiUrl: mergedConfig.apiUrl,
      timeout: mergedConfig.timeout,
      debug: mergedConfig.debug,
      isLocalhost: mergedConfig.apiUrl?.includes('localhost')
    });

    // 如果使用默认的 localhost 地址，给出警告
    if (mergedConfig.apiUrl?.includes('localhost')) {
      console.warn(
        '[Dify Config] Warning: Using default localhost API URL. ' +
        'Please set NEXT_PUBLIC_DIFY_API_URL in your .env file for production use.'
      );
    }
  }

  return mergedConfig;
} 