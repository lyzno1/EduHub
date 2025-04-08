import { DifyConfig } from '@/services/dify';

export const getDifyConfig = (): DifyConfig => ({
  apiUrl: process.env.DIFY_API_URL || 'http://localhost:8088/v1/chat-messages',
  timeout: Number(process.env.DIFY_TIMEOUT || 30000),
  debug: process.env.NODE_ENV === 'development',
});

// 多应用配置
export interface DifyAppConfig {
  appId: string;
  apiKey: string;
  model?: string;
  temperature?: number;
}

// 应用配置管理
class DifyAppConfigManager {
  private static instance: DifyAppConfigManager;
  private currentConfig: DifyAppConfig | null = null;
  private configMap: Map<string, DifyAppConfig> = new Map();

  private constructor() {}

  static getInstance(): DifyAppConfigManager {
    if (!DifyAppConfigManager.instance) {
      DifyAppConfigManager.instance = new DifyAppConfigManager();
    }
    return DifyAppConfigManager.instance;
  }

  // 注册应用配置
  registerApp(config: DifyAppConfig) {
    this.configMap.set(config.appId, config);
    if (!this.currentConfig) {
      this.currentConfig = config;
    }
  }

  // 切换当前应用
  switchApp(appId: string) {
    const config = this.configMap.get(appId);
    if (!config) {
      throw new Error(`App ID ${appId} not found`);
    }
    this.currentConfig = config;
  }

  // 获取当前配置
  getCurrentConfig(): DifyAppConfig {
    if (!this.currentConfig) {
      throw new Error('No app config registered');
    }
    return this.currentConfig;
  }

  // 更新应用配置
  updateAppConfig(appId: string, updates: Partial<DifyAppConfig>) {
    const config = this.configMap.get(appId);
    if (!config) {
      throw new Error(`App ID ${appId} not found`);
    }
    Object.assign(config, updates);
    if (this.currentConfig?.appId === appId) {
      this.currentConfig = config;
    }
  }
}

export const difyAppConfig = DifyAppConfigManager.getInstance(); 