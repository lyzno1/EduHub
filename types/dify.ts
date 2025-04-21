// 定义 Dify API 连接配置的基础结构
export interface DifyApiConfig {
  apiKey: string;
  apiUrl: string;
}

// Dify API 响应类型
export interface DifyResponse {
  event: string;
  message?: string;
  conversation_id?: string;
  message_id?: string;
  created_at?: number;
}

// Dify 消息事件
export interface DifyMessageEvent extends DifyResponse {
  event: 'message';
  data?: {
    answer?: string;
    [key: string]: any;
  };
}

// Dify 事件类型
export type DifyEvent = DifyResponse | DifyMessageEvent;

// Dify 请求配置
export interface DifyRequestConfig {
  query: string;
  inputs?: Record<string, any>;
  response_mode: 'streaming';
  user: string;
  conversation_id?: string;
  auto_generate_name?: boolean;
}

// 配置中每个应用卡片的数据结构
export interface DifyAppCardConfig {
  cardId: string;     // 卡片的唯一标识符 (例如 'ch-swe-test') - 名称已更新
  name: string;     // 卡片上显示的名称 (例如 '软件工程测试')
  iconName: string; // 用于查找对应图标组件的名称 (例如 'IconTestPipe')
  difyConfig: DifyApiConfig; // 此卡片绑定的 Dify API 配置 (必需)
  // defaultPrompt 字段已被移除
}

// 代表 dify_keys.json 中每个文件夹/分组配置的数据结构
export interface DifyFolderConfig {
  appId: number;             // 文件夹/分组的数字 ID (用于 UI 状态)
  displayName: string;       // 文件夹/分组在界面上显示的名称 (例如 '课程助手')
  cards: DifyAppCardConfig[]; // 该文件夹包含的卡片配置数组
  // 不再包含 apiKey, apiUrl, appKey
}

// 代表整个 dify_keys.json 文件结构
export interface DifyConfigStructure {
  global: {
    appId: 0;
    displayName: string;
    difyConfig: DifyApiConfig; // 全局默认配置
    cards: [];
  };
  // 使用索引签名来表示其他的文件夹配置
  // 注意：这里的值类型应为 DifyFolderConfig，但索引签名要求兼容所有属性
  // 为了类型安全，在使用时最好还是显式访问已知键 (deepseek, courseHelper, etc.)
  // 或者在加载配置时进行转换
  [folderKey: string]: DifyFolderConfig | {
    appId: 0;
    displayName: string;
    difyConfig: DifyApiConfig;
    cards: [];
  };
} 