// API 相关常量
export const DEFAULT_API_URL = 'http://localhost:8080';
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_USER = 'anonymous';

// API 路径
export const API_PATHS = {
  CHAT_MESSAGES: '/chat-messages',
  CHAT_MESSAGES_STOP: '/chat-messages/{taskId}/stop'
} as const;

// 事件类型
export const EVENTS = {
  MESSAGE: 'message',
  MESSAGE_END: 'message_end',
  ERROR: 'error',
  PING: 'ping'
} as const; 