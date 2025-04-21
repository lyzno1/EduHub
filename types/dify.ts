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
  id: string;       // 卡片的唯一标识符 (例如 'ch-swe-test')
  name: string;     // 卡片上显示的名称 (例如 '软件工程测试')
  iconName: string; // 用于查找对应图标组件的名称 (例如 'IconTestPipe')
}

// dify_keys.json 中每个应用配置的完整数据结构
export interface DifyAppConfig {
  apiKey: string;            // 该应用的 Dify API Key
  apiUrl: string;            // 该应用使用的 Dify API URL
  appId: number;             // 该应用的数字 ID (当前用于映射)
  displayName: string;       // 该应用在界面上显示的名称 (例如 '课程助手')
  cards: DifyAppCardConfig[]; // 该应用包含的卡片配置数组
  // appKey?: string;         // (可选) 应用的程序化键名 (例如 'courseHelper')，为下一步准备
} 