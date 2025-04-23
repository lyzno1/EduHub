import { useEffect, useState } from 'react';
import difyKeysJson from '../dify_keys.json';

type DifyConfig = {
  apiKey: string;
  apiUrl: string;
};

type CardConfig = {
  cardId: string;
  name: string;
  iconName: string;
  difyConfig: DifyConfig;
};

type AppConfig = {
  appId: number;
  displayName: string;
  difyConfig?: DifyConfig; // 全局配置有直接的difyConfig
  cards: CardConfig[];
};

// dify_keys.json的类型
type DifyKeysConfig = {
  global: AppConfig;
  [key: string]: AppConfig;
};

/**
 * 用于获取Dify API凭证的Hook
 * 确保从dify_keys.json作为第一选择配置源
 */
export const useDifyCredentials = () => {
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);
  const [difyKeysConfig, setDifyKeysConfig] = useState<DifyKeysConfig | null>(null);

  // 初始化时加载配置
  useEffect(() => {
    try {
      // 直接使用导入的JSON
      setDifyKeysConfig(difyKeysJson as unknown as DifyKeysConfig);
      setConfigLoaded(true);
    } catch (error) {
      console.error('加载Dify配置失败:', error);
      // 处理加载失败的情况，提供默认配置或错误状态
    }
  }, []);

  /**
   * 获取Dify凭证
   * @param appId 应用ID，0表示全局配置
   * @param cardId 卡片ID，对非全局应用有效
   * @returns Dify配置或null（如果找不到）
   */
  const getDifyCredentials = (
    appId: number | null | undefined, 
    cardId: string | null | undefined
  ): DifyConfig | null => {
    if (!configLoaded || !difyKeysConfig) {
      console.warn('Dify配置尚未加载完成');
      return null;
    }

    try {
      // 如果是全局应用（appId为0或null/undefined）
      if (appId === 0 || appId === null || appId === undefined) {
        if (difyKeysConfig.global && difyKeysConfig.global.difyConfig) {
          return difyKeysConfig.global.difyConfig;
        }
        console.warn('全局配置中没有找到difyConfig');
        return null;
      }

      // 找到对应的应用配置
      const appConfigs = Object.values(difyKeysConfig);
      const appConfig = appConfigs.find(config => config.appId === appId);
      
      if (!appConfig) {
        console.warn(`未找到appId为${appId}的应用配置`);
        // 回退到全局配置
        if (difyKeysConfig.global && difyKeysConfig.global.difyConfig) {
          console.warn(`回退使用全局配置`);
          return difyKeysConfig.global.difyConfig;
        }
        return null;
      }

      // 如果没有指定cardId但应用有直接的difyConfig，则使用应用级配置
      if ((!cardId || cardId === '') && appConfig.difyConfig) {
        return appConfig.difyConfig;
      }

      // 如果没有cardId但也没有应用级配置，则尝试使用第一个卡片的配置
      if (!cardId || cardId === '') {
        if (appConfig.cards && appConfig.cards.length > 0 && appConfig.cards[0].difyConfig) {
          console.warn(`应用${appId}没有指定cardId，使用第一个卡片的配置`);
          return appConfig.cards[0].difyConfig;
        }
        
        // 最后回退到全局配置
        if (difyKeysConfig.global && difyKeysConfig.global.difyConfig) {
          console.warn(`回退使用全局配置`);
          return difyKeysConfig.global.difyConfig;
        }
        
        console.warn(`应用${appId}没有可用的配置`);
        return null;
      }

      // 在应用的cards中查找对应的卡片
      const card = appConfig.cards.find(c => c.cardId === cardId);
      
      if (!card) {
        console.warn(`在应用${appId}中未找到cardId为${cardId}的卡片`);
        // 尝试使用应用级配置作为回退
        if (appConfig.difyConfig) {
          console.warn(`使用应用级配置作为回退`);
          return appConfig.difyConfig;
        }
        // 最后回退到全局配置
        if (difyKeysConfig.global && difyKeysConfig.global.difyConfig) {
          console.warn(`回退使用全局配置`);
          return difyKeysConfig.global.difyConfig;
        }
        return null;
      }

      return card.difyConfig;
    } catch (error) {
      console.error('获取Dify凭证时出错:', error);
      // 发生错误时回退到全局配置
      if (difyKeysConfig && difyKeysConfig.global && difyKeysConfig.global.difyConfig) {
        console.warn('错误情况下回退使用全局配置');
        return difyKeysConfig.global.difyConfig;
      }
      return null;
    }
  };

  return {
    configLoaded,
    getDifyCredentials,
  };
}; 