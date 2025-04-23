import { useEffect, useState, useCallback } from 'react';
import difyConfigService from '../services/difyConfigService';
import { DifyApiConfig, DifyModelConfig } from '@/types/dify';

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
 * 用于获取Dify API凭证的Hook (应用专属)
 * 仅处理 appId > 0 的情况，确保从dify_keys.json作为第一选择配置源
 * 全局配置 (appId=0) 应由调用者直接处理
 */
export const useDifyCredentials = () => {
  /**
   * 获取特定应用/卡片的Dify凭证
   * @param appId 应用ID (必须大于0)
   * @param cardId 卡片ID (可选)
   * @returns Dify配置 DifyApiConfig ({apiKey, apiUrl}) 或 null (如果找不到有效配置或 appId <= 0)
   */
  const getDifyCredentials = useCallback(
    (appId: number | null | undefined, cardId: string | null | undefined): DifyApiConfig | null => {
      // 明确不再处理全局配置
      if (appId === 0 || appId === null || appId === undefined) {
        console.warn('[useDifyCredentials] 此 hook 不处理全局配置 (appId=0)，请直接使用 DifyConfigService 获取全局模型配置。');
        return null;
      }

      try {
        // 1. 尝试获取特定卡片的配置
        if (cardId) {
          const card = difyConfigService.getCardConfig(cardId);
          // 确保卡片属于正确的 app
          if (card) {
             const folder = difyConfigService.getFolderForCard(cardId);
             if (folder && folder.appId === appId) {
                 console.log(`[useDifyCredentials] 找到卡片配置: appId=${appId}, cardId=${cardId}`);
                 return card.difyConfig; 
             }
             console.warn(`[useDifyCredentials] 卡片 ${cardId} 存在，但不属于应用 ${appId}`);
          }
        }

        // 2. 尝试获取应用级别的配置 (如果 dify_keys.json 中定义了的话)
        const folder = difyConfigService.getFolderConfig(appId);
        if (folder && folder.difyConfig) {
          console.log(`[useDifyCredentials] 找到应用级配置: appId=${appId}`);
          return folder.difyConfig;
        }

        // 3. 尝试获取应用下第一个卡片的配置作为回退
        if (folder && folder.cards && folder.cards.length > 0 && folder.cards[0].difyConfig) {
          console.warn(`[useDifyCredentials] 回退：使用应用 ${appId} 第一个卡片的配置`);
          return folder.cards[0].difyConfig;
        }
        
        // 4. 最后回退到默认全局模型配置 (apiKey + globalApiUrl)
        console.warn(`[useDifyCredentials] 回退：无法找到应用 ${appId} (卡片ID: ${cardId}) 的特定配置，使用默认全局模型配置。`);
        const defaultModel = difyConfigService.getDefaultGlobalModel();
        const globalApiUrl = difyConfigService.getGlobalApiUrl();

        if (defaultModel && defaultModel.apiKey && globalApiUrl) {
          return {
            apiKey: defaultModel.apiKey,
            apiUrl: globalApiUrl
          };
        }

        // 如果连默认全局配置都获取不到
        console.error(`[useDifyCredentials] 严重错误：无法为 appId=${appId} 获取任何有效配置，也无法获取默认全局配置！`);
        return null;

      } catch (error) {
        console.error(`[useDifyCredentials] 获取凭证时出错 (appId=${appId}, cardId=${cardId}):`, error);
        return null;
      }
    },
    [] // 依赖项为空，因为 difyConfigService 是单例且其内部状态不应频繁变化
  );

  // 不再返回 configLoaded，因为服务总是在尝试初始化
  return {
    getDifyCredentials,
  };
}; 