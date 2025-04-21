import difyKeysData from '@/dify_keys.json';
import { DifyApiConfig, DifyAppCardConfig, DifyConfigStructure, DifyFolderConfig } from '@/types/dify';

/**
 * Dify 配置管理服务
 * 提供集中管理和访问 dify_keys.json 配置的功能
 */
class DifyConfigService {
  private config: DifyConfigStructure;
  private cardConfigMap: Map<string, DifyAppCardConfig> = new Map();
  private folderConfigMap: Map<number, DifyFolderConfig> = new Map();
  private initialized = false;

  constructor() {
    this.config = difyKeysData as unknown as DifyConfigStructure;
    this.initialize();
  }

  /**
   * 初始化配置服务，构建查找映射
   */
  private initialize(): void {
    if (this.initialized) return;

    // 创建 cardId -> card 的映射
    for (const folderKey in this.config) {
      if (folderKey === 'global') continue;
      
      const folder = this.config[folderKey] as DifyFolderConfig;
      
      // 创建 appId -> folder 的映射
      this.folderConfigMap.set(folder.appId, folder);
      
      // 为每个卡片创建映射
      for (const card of folder.cards) {
        this.cardConfigMap.set(card.cardId, card);
      }
    }

    this.initialized = true;
    console.log('[DifyConfigService] 初始化完成，已加载:', {
      folders: this.folderConfigMap.size,
      cards: this.cardConfigMap.size
    });
  }

  /**
   * 通过卡片 ID 获取卡片配置
   * @param cardId 卡片 ID
   * @returns 卡片配置，如果找不到则返回 null
   */
  getCardConfig(cardId: string): DifyAppCardConfig | null {
    return this.cardConfigMap.get(cardId) || null;
  }

  /**
   * 通过卡片 ID 获取 Dify API 配置
   * @param cardId 卡片 ID
   * @returns Dify API 配置，如果找不到则返回全局默认配置
   */
  getDifyConfigForCard(cardId: string): DifyApiConfig {
    // 尝试获取卡片的 Dify 配置
    const card = this.cardConfigMap.get(cardId);
    if (card) {
      return card.difyConfig;
    }
    
    // 如果找不到卡片，返回全局默认配置
    console.warn(`[DifyConfigService] 未找到卡片 ID: ${cardId}，使用全局配置`);
    return this.getGlobalConfig();
  }

  /**
   * 通过文件夹 ID 获取文件夹配置
   * @param appId 文件夹/App ID
   * @returns 文件夹配置，如果找不到则返回 null
   */
  getFolderConfig(appId: number): DifyFolderConfig | null {
    return this.folderConfigMap.get(appId) || null;
  }

  /**
   * 获取所有文件夹配置（按 appId 索引）
   * @returns 文件夹配置的对象，以 appId 为键
   */
  getAllFolderConfigs(): Record<number, DifyFolderConfig> {
    const result: Record<number, DifyFolderConfig> = {};
    // 以数组形式获取 Map 的所有条目，避免直接遍历 Map
    Array.from(this.folderConfigMap.entries()).forEach(([appId, folder]) => {
      result[appId] = folder;
    });
    return result;
  }

  /**
   * 获取全局 Dify 配置
   * @returns 全局默认的 Dify API 配置
   */
  getGlobalConfig(): DifyApiConfig {
    return this.config.global.difyConfig;
  }

  /**
   * 获取特定文件夹下的所有卡片
   * @param appId 文件夹/App ID
   * @returns 卡片配置数组，如果找不到文件夹则返回空数组
   */
  getCardsForFolder(appId: number): DifyAppCardConfig[] {
    const folder = this.folderConfigMap.get(appId);
    return folder ? folder.cards : [];
  }

  /**
   * 获取卡片所属的文件夹
   * @param cardId 卡片 ID
   * @returns 文件夹配置，如果找不到则返回 null
   */
  getFolderForCard(cardId: string): DifyFolderConfig | null {
    const card = this.cardConfigMap.get(cardId);
    if (!card) return null;

    // 使用数组方法遍历 Map 的值，避免直接遍历 Map
    for (const folder of Array.from(this.folderConfigMap.values())) {
      if (folder.cards.some((c: DifyAppCardConfig) => c.cardId === cardId)) {
        return folder;
      }
    }

    return null;
  }
}

// 创建单例实例
const difyConfigService = new DifyConfigService();

export default difyConfigService; 