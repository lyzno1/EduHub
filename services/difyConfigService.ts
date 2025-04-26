import difyKeysData from '@/dify_keys.json';
import { DifyApiConfig, DifyAppCardConfig, DifyConfigStructure, DifyFolderConfig, DifyModelConfig } from '@/types/dify';

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
    // 类型断言确保加载的数据符合新结构
    this.config = difyKeysData as unknown as DifyConfigStructure;
    this.initialize();
  }

  /**
   * 初始化配置服务，构建查找映射
   */
  private initialize(): void {
    if (this.initialized) return;

    try {
      // 创建 cardId -> card 和 appId -> folder 的映射
    for (const folderKey in this.config) {
        if (folderKey === 'global') continue; // 跳过全局配置
      
      const folder = this.config[folderKey] as DifyFolderConfig;
      
        // 添加 folderKey 到配置对象中，如果需要的话
      folder.folderKey = folderKey;

      // 创建 appId -> folder 的映射
      this.folderConfigMap.set(folder.appId, folder);
      
        // 确保 cards 是数组
      if (!folder.cards || !Array.isArray(folder.cards)) {
        folder.cards = [];
      }

      // 为每个卡片创建映射
      for (const card of folder.cards) {
        this.cardConfigMap.set(card.cardId, card);
      }
    }

      // 验证全局模型配置是否存在
      if (!this.config.global || !Array.isArray(this.config.global.models) || this.config.global.models.length === 0) {
        console.error('[DifyConfigService] 初始化错误：全局模型配置 (global.models) 无效或为空！');
        // 可以选择抛出错误或设置一个空状态
        this.config.global = { ...this.config.global, models: [] }; // 保证 models 是数组
      }
      // 确保至少有一个默认模型
      else if (!this.config.global.models.some(m => m.isDefault === true)) {
        console.warn('[DifyConfigService] 警告：全局模型中没有显式设置默认模型 (isDefault: true)，将使用第一个模型作为默认模型。');
        this.config.global.models[0].isDefault = true; // 强制设置第一个为默认
      }

    this.initialized = true;
    // console.log('[DifyConfigService] 初始化完成，已加载:', {
    //   folders: this.folderConfigMap.size,
    //     cards: this.cardConfigMap.size,
    //     globalModels: this.config.global?.models?.length || 0
    //   });

    } catch (error) {
      console.error('[DifyConfigService] 初始化过程中发生严重错误:', error);
      // 在这里可以设置服务为不可用状态或抛出错误
      this.initialized = false; // 标记为未成功初始化
      // 保证 models 存在且为数组，即使 global 配置有问题
      if (!this.config.global) {
          // @ts-ignore // 临时的类型绕过，因为结构可能不完整
          this.config.global = { appId: 0, displayName: 'Global', apiUrl: '', models: [] };
      } else if (!this.config.global.models) {
          this.config.global.models = [];
      }
    }
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
    Array.from(this.folderConfigMap.entries()).forEach(([appId, folder]) => {
      result[appId] = folder;
    });
    return result;
  }

  /**
   * 获取特定文件夹下的所有卡片
   * @param appId 文件夹/App ID
   * @returns 卡片配置数组，如果找不到文件夹则返回空数组
   */
  getCardsForFolder(appId: number): DifyAppCardConfig[] {
    const folder = this.folderConfigMap.get(appId);
    return folder?.cards || [];
  }

  /**
   * 获取卡片所属的文件夹
   * @param cardId 卡片 ID
   * @returns 文件夹配置，如果找不到则返回 null
   */
  getFolderForCard(cardId: string): DifyFolderConfig | null {
    const card = this.cardConfigMap.get(cardId);
    if (!card) return null;

    for (const folder of Array.from(this.folderConfigMap.values())) {
      if (folder.cards?.some((c: DifyAppCardConfig) => c.cardId === cardId)) {
        return folder;
      }
    }

    return null;
  }

  /**
   * 获取全局共享的 API URL
   * @returns 全局 API URL，如果未配置则返回 null
   */
  getGlobalApiUrl(): string | null {
    return this.config.global?.apiUrl || null;
  }

  /**
   * 获取所有全局模型的配置列表
   * @returns 全局模型配置数组，如果未配置则返回空数组
   */
  getGlobalModels(): DifyModelConfig[] {
    return this.config.global?.models || [];
  }

  /**
   * 获取默认的全局模型配置
   * @returns 默认全局模型配置，如果找不到或未配置则返回 null
   */
  getDefaultGlobalModel(): DifyModelConfig | null {
    const models = this.getGlobalModels();
    if (models.length === 0) return null;
    
    // 优先查找 isDefault: true 的模型
    const defaultModel = models.find(m => m.isDefault === true);
    if (defaultModel) {
      return defaultModel;
    }
    
    // 如果没有显式默认，返回第一个
    return models[0];
  }

  /**
   * 根据模型名称获取全局模型的 API Key
   * @param modelName 模型名称
   * @returns 对应的 API Key；如果找不到指定名称的模型，则返回默认模型的 API Key；如果都没有则返回 null
   */
  getGlobalModelApiKey(modelName: string | null | undefined): string | null {
    const models = this.getGlobalModels();
    if (models.length === 0) return null;

    // 尝试根据名称查找
    if (modelName) {
      const model = models.find(m => m.name === modelName);
      if (model) {
        return model.apiKey;
      }
      console.warn(`[DifyConfigService] 未找到名称为 "${modelName}" 的全局模型，将使用默认模型 API Key。`);
    }

    // 如果没有提供名称或找不到名称，返回默认模型的 API Key
    const defaultModel = this.getDefaultGlobalModel();
    return defaultModel?.apiKey || null;
  }

  /**
   * 通过卡片 ID 获取 Dify API 配置 (apiKey 和 apiUrl)
   * @param cardId 卡片 ID
   * @returns Dify API 配置对象；如果找不到卡片配置，则返回默认全局模型的配置；如果全局配置也无效，则返回 null
   */
  getDifyConfigForCard(cardId: string): DifyApiConfig | null { // 返回类型改为可为 null
    const card = this.cardConfigMap.get(cardId);
    if (card && card.difyConfig) {
      return card.difyConfig;
    }
    
    // 回退到默认全局模型配置
    console.warn(`[DifyConfigService] 未找到卡片 ID: ${cardId} 或其 difyConfig，使用默认全局模型配置。`);
    const defaultModel = this.getDefaultGlobalModel();
    const globalApiUrl = this.getGlobalApiUrl();

    if (defaultModel && defaultModel.apiKey && globalApiUrl) {
      return {
        apiKey: defaultModel.apiKey,
        apiUrl: globalApiUrl
      };
    }

    // 如果连默认全局模型配置都获取不到
    console.error(`[DifyConfigService] 无法获取卡片 ${cardId} 的配置，也无法获取默认全局模型配置！`);
    return null;
  }
}

// 创建单例实例
const difyConfigService = new DifyConfigService();

export default difyConfigService; 