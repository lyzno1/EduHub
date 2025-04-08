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