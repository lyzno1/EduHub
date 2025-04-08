import { ParsedEvent, ReconnectInterval, createParser } from 'eventsource-parser';
import { API_PATHS, DEFAULT_API_URL, DEFAULT_TIMEOUT, DEFAULT_USER, EVENTS } from './constants';
import { ChatParams, ChatResponse, DifyConfig, StreamResponse } from './types';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

export interface DifyStream {
  onMessage: (callback: (chunk: string) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  onComplete: (callback: () => void) => void;
}

export class DifyClient {
  private baseUrl: string;
  private currentModel: string;
  private debug: boolean;
  private timeout: number;
  private currentAppId?: string;

  constructor(config: Partial<DifyConfig> = {}) {
    // 确保 config 是一个对象
    const safeConfig = config || {};
    
    // 从环境变量或配置中获取基础 URL
    let rawUrl = safeConfig.apiUrl || process.env.NEXT_PUBLIC_DIFY_API_URL || DEFAULT_API_URL;
    
    // 清理 URL：
    // 1. 移除末尾的斜杠
    // 2. 移除可能存在的 API 路径
    // 3. 确保使用正确的端口 (8080)
    rawUrl = rawUrl
      .replace(/\/+$/, '')  // 移除末尾的斜杠
      .replace(/\/v1\/chat-messages$/, '')  // 移除 API 路径
      .replace(/:\d+/, ':8080');  // 将任何端口替换为 8080
    
    this.baseUrl = rawUrl;
    this.currentModel = 'dify';
    this.debug = safeConfig.debug || process.env.NODE_ENV === 'development';
    this.timeout = safeConfig.timeout || Number(process.env.NEXT_PUBLIC_DIFY_TIMEOUT) || DEFAULT_TIMEOUT;

    // 在开发环境下打印配置信息
    if (this.debug) {
      console.log('[DifyClient] Configuration:', {
        rawUrl,
        baseUrl: this.baseUrl,
        currentModel: this.currentModel,
        timeout: this.timeout,
        isLocalhost: this.baseUrl.includes('localhost'),
      });

      // 如果使用默认的 localhost 地址，给出警告
      if (this.baseUrl.includes('localhost')) {
        console.warn(
          '[DifyClient] ⚠️ Warning: Using localhost API URL\n' +
          'This is typically for development environment only.\n' +
          'Please set NEXT_PUBLIC_DIFY_API_URL in your .env file for production use.\n' +
          'Example: NEXT_PUBLIC_DIFY_API_URL=http://localhost:8080'
        );
      }

      // 如果没有配置 API URL，给出警告
      if (!process.env.NEXT_PUBLIC_DIFY_API_URL) {
        console.warn(
          '[DifyClient] ⚠️ Warning: NEXT_PUBLIC_DIFY_API_URL is not configured\n' +
          'Using default API URL: ' + this.baseUrl + '\n' +
          'Please set NEXT_PUBLIC_DIFY_API_URL in your .env file.'
        );
      }

      // 如果端口不是 8080，给出警告
      if (this.baseUrl.includes('localhost') && !this.baseUrl.includes(':8080')) {
        console.warn(
          '[DifyClient] ⚠️ Warning: Using non-standard port\n' +
          'Current URL: ' + this.baseUrl + '\n' +
          'Default Dify port is 8080. Please ensure your backend is configured correctly.'
        );
      }
    }
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log('[DifyClient]', ...args);
    }
  }

  private logError(error: Error, context?: Record<string, any>) {
    if (this.debug) {
      console.error('[DifyClient] Error:', {
        message: error.message,
        stack: error.stack,
        ...context
      });
    }
  }

  // 设置当前应用 ID
  public setAppId(appId: string) {
    this.currentAppId = appId;
    this.log('Switched to app:', appId);
  }

  // 设置当前模型
  public setModel(model: string) {
    this.currentModel = model;
    this.log('Switched to model:', model);
  }

  public async createChatStream({
    query,
    key,
    user = DEFAULT_USER,
    conversationId = '',
    inputs = {},
    autoGenerateName = true,
    model,
    temperature
  }: ChatParams): Promise<DifyStream> {
    // 记录发送的消息
    this.log('Sending message:', {
      content: query,
      conversationId: conversationId || 'new',
      user: user
    });

    return new Promise(async (resolve, reject) => {
      let messageCallback: ((chunk: string) => void) | null = null;
      let errorCallback: ((error: Error) => void) | null = null;
      let completeCallback: (() => void) | null = null;

      const stream: DifyStream = {
        onMessage: (callback) => {
          messageCallback = callback;
        },
        onError: (callback) => {
          errorCallback = callback;
        },
        onComplete: (callback) => {
          completeCallback = callback;
        }
      };

      try {
        const requestParams = {
          query,
          response_mode: 'streaming',
          conversation_id: conversationId,
          user: user,
          inputs: inputs || {},
          auto_generate_name: autoGenerateName,
          ...(model && { model }),
          ...(temperature && { temperature })
        };

        const apiEndpoint = `${this.baseUrl}${API_PATHS.CHAT_MESSAGES}`;
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'Accept': 'text/event-stream',
            ...(this.currentAppId && { 'X-App-ID': this.currentAppId })
          },
          body: JSON.stringify(requestParams),
        });

        if (!response.ok) {
          let errorMessage = `API request failed with status ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            this.logError(e as Error, { context: 'Error parsing error response' });
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                completeCallback?.();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim() === '') continue;
                
                if (line.startsWith('data: ')) {
                  const eventData = line.slice(6);
                  this.log('Processing event data:', eventData);
                  
                  try {
                    const data = JSON.parse(eventData) as ChatResponse;
                    
                    switch (data.event) {
                      case EVENTS.MESSAGE:
                        if (data.answer && messageCallback) {
                          messageCallback(data.answer);
                        }
                        break;

                      case EVENTS.MESSAGE_END:
                        this.log('Message completed:', data.conversation_id);
                        completeCallback?.();
                        return;

                      case EVENTS.ERROR:
                        const errorMsg = data.answer || 'Unknown error from server';
                        if (errorCallback) {
                          errorCallback(new Error(errorMsg));
                        }
                        return;
                    }
                  } catch (e) {
                    if (errorCallback) {
                      errorCallback(e as Error);
                    }
                    return;
                  }
                }
              }
            }
          } catch (e) {
            if (errorCallback) {
              errorCallback(e as Error);
            }
          }
        };

        processStream();
        resolve(stream);

      } catch (error: any) {
        if (errorCallback) {
          errorCallback(error);
        }
        reject(error);
      }
    });
  }
} 