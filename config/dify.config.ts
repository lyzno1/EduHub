export interface DifyConfig {
  baseURL: string;
  port: number;
  apiVersion: string;
}

export interface DifyApplication {
  name: string;
  apiKey: string;
  description?: string;
}

export interface DifyResponse {
  event: string;
  task_id?: string;
  workflow_run_id?: string;
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  data?: any;
  created_at?: number;
  metadata?: {
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      total_price: string;
      currency: string;
      latency: number;
    };
    retriever_resources?: Array<{
      position: number;
      dataset_id: string;
      dataset_name: string;
      document_id: string;
      document_name: string;
      segment_id: string;
      score: number;
      content: string;
    }>;
  };
}

// 默认配置
export const defaultDifyConfig: DifyConfig = {
  baseURL: 'http://localhost',
  port: 8080,
  apiVersion: 'v1'
};

// Dify应用列表
export const difyApplications: { [key: string]: DifyApplication } = {
  '写作导师': {
    name: '写作导师',
    apiKey: 'your-api-key-here',
    description: '提供写作指导和建议的AI助手'
  },
  '项目分析': {
    name: '项目分析',
    apiKey: 'your-api-key-here',
    description: '项目分析和评估助手'
  },
  'yyh-chat': {
    name: 'yyh-chat',
    apiKey: 'app-AomSdWL5wAUjnhBc1VyGo8RG',
    description: 'YYH的聊天助手'
  },
  // ... 其他应用配置
};

// 获取完整的API URL
export const getDifyApiUrl = (endpoint: string = '/chat-messages'): string => {
  const config = defaultDifyConfig;
  return `${config.baseURL}:${config.port}/${config.apiVersion}${endpoint}`;
};

// 获取应用的API密钥
export const getDifyApiKey = (appName: string): string => {
  const app = difyApplications[appName];
  if (!app) {
    throw new Error(`未找到应用: ${appName}`);
  }
  return app.apiKey;
}; 