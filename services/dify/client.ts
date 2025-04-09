import { ParsedEvent, ReconnectInterval, createParser } from 'eventsource-parser';
import { API_PATHS, DEFAULT_API_URL, DEFAULT_TIMEOUT, DEFAULT_USER, EVENTS } from './constants';
import { ChatParams, ChatResponse, DifyConfig, StreamResponse } from './types';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

export type MessageCallback = (chunk: string) => void;
export type ErrorCallback = (error: Error) => void;
export type CompleteCallback = () => void;

export interface DifyStream {
  onMessage: (callback: MessageCallback) => void;
  onError: (callback: ErrorCallback) => void;
  onComplete: (callback: CompleteCallback) => void;
  conversationId?: string;
}

export interface RequestBody {
  query: string;
  response_mode?: string;
  conversation_id?: string;
  user?: string;
  inputs?: Record<string, any>;
  auto_generate_name?: boolean;
  model?: string;
  temperature?: number;
}

class AbortSignalWrapper {
  signal: AbortSignal;
  
  constructor(...signals: AbortSignal[]) {
    this.signal = signals[0];
    
    for (let i = 1; i < signals.length; i++) {
      signals[i].addEventListener('abort', () => {
        if (!this.signal.aborted) {
          const event = new Event('abort');
          this.signal.dispatchEvent(event);
        }
      });
    }
  }
}

export class DifyClient {
  private baseUrl: string;
  private currentModel: string;
  private debug: boolean;
  private timeout: number;
  private currentAppId?: string;

  constructor(config: Partial<DifyConfig> = {}) {
    const safeConfig = config || {};
    let rawUrl = safeConfig.apiUrl || process.env.NEXT_PUBLIC_DIFY_API_URL || DEFAULT_API_URL;
    
    // 确保baseUrl不包含API路径
    if (rawUrl.endsWith(API_PATHS.CHAT_MESSAGES)) {
      rawUrl = rawUrl.slice(0, -API_PATHS.CHAT_MESSAGES.length);
    }
    // 确保baseUrl不以斜杠结尾
    this.baseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    this.currentModel = 'dify';
    this.debug = safeConfig.debug || false;
    this.timeout = safeConfig.timeout || Number(process.env.NEXT_PUBLIC_DIFY_TIMEOUT) || DEFAULT_TIMEOUT;
    
    if (this.debug) {
      console.log('DifyClient初始化配置:', {
        baseUrl: this.baseUrl,
        model: this.currentModel,
        timeout: this.timeout
      });
    }
  }

  public setAppId(appId: string) {
    this.currentAppId = appId;
  }

  public setModel(model: string) {
    this.currentModel = model;
  }

  private isMobileDevice(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
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
    return new Promise(async (resolve, reject) => {
      let messageCallback: MessageCallback | undefined;
      let errorCallback: ErrorCallback | undefined;
      let completeCallback: CompleteCallback | undefined;
      let streamConversationId = conversationId;

      const stream: DifyStream = {
        onMessage: (callback: MessageCallback) => {
          messageCallback = callback;
        },
        onError: (callback: ErrorCallback) => {
          errorCallback = callback;
        },
        onComplete: (callback: CompleteCallback) => {
          completeCallback = callback;
        },
        get conversationId() {
          return streamConversationId;
        }
      };

      const handleError = (error: Error) => {
        if (errorCallback) {
          errorCallback(error);
        }
      };

      try {
        const apiEndpoint = `${this.baseUrl}${API_PATHS.CHAT_MESSAGES}`;
        
        if (this.debug) {
          console.log('创建聊天流 - 配置信息:', {
            endpoint: apiEndpoint,
            conversationId: streamConversationId,
            user,
            key: key ? '已设置' : '未设置'
          });
        }

        const requestParams = {
          query,
          response_mode: 'streaming',
          ...(streamConversationId ? { conversation_id: streamConversationId } : {}),
          user: user,
          inputs: inputs || {},
          auto_generate_name: autoGenerateName,
          ...(model && { model }),
          ...(temperature && { temperature })
        };

        if (this.debug) {
          console.log('请求参数:', requestParams);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error(`请求超时: ${this.timeout}ms`));
        }, this.timeout);

        try {
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
              'Accept': 'text/event-stream',
              ...(this.currentAppId && { 'X-App-ID': this.currentAppId })
            },
            body: JSON.stringify(requestParams),
            signal: controller.signal,
            credentials: 'same-origin'
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            let errorMessage = `API请求失败: ${response.status}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
              
              if (errorMessage.includes('Conversation Not Exists')) {
                streamConversationId = '';
                handleError(new Error('Conversation Not Exists'));
                return;
              }
            } catch (e) {
              console.error('解析错误响应失败:', e);
            }
            throw new Error(errorMessage);
          }

          if (!response.body) {
            throw new Error('Response body is null');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const processStreamData = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  if (completeCallback) {
                    completeCallback();
                  }
                  break;
                }

                const text = decoder.decode(value, { stream: true });
                buffer += text;

                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (!line.trim() || !line.startsWith('data:')) continue;

                  const eventData = line.slice(5).trim();
                  if (eventData === '[DONE]') {
                    if (completeCallback) {
                      completeCallback();
                    }
                    break;
                  }

                  try {
                    const data = JSON.parse(eventData);

                    // 捕获并更新conversationId
                    if (data.conversation_id && (!streamConversationId || streamConversationId === '')) {
                      streamConversationId = data.conversation_id;
                      console.log('收到新的conversationId:', streamConversationId);
                    }

                    if (data.event === 'message') {
                      if (messageCallback && data.answer) {
                        messageCallback(data.answer);
                      }
                    } else if (data.event === 'message_end') {
                      if (completeCallback) {
                        completeCallback();
                      }
                    }
                  } catch (e) {
                    console.error('解析事件数据失败:', e);
                  }
                }
              }
            } catch (error: any) {
              console.error('处理流数据错误:', error);
              handleError(new Error(error?.message || '处理流数据错误'));
            }
          };

          processStreamData();
          resolve(stream);
        } catch (error: any) {
          clearTimeout(timeoutId);
          reject(error);
        }
      } catch (error: any) {
        reject(error);
      }
    });
  }

  public async streamChat({
    body, 
    key, 
    onMessage,
    onError = () => {},
    onStop = () => {},
    isMobile = false,
    isDebug = false,
    signal
  }: {
    body: RequestBody;
    key: string;
    onMessage: (message: string) => void;
    onError?: (error: Error) => void;
    onStop?: () => void;
    isMobile?: boolean;
    isDebug?: boolean;
    signal?: AbortSignal;
  }) {
    const startTime = Date.now();
    
    if (isMobile) {
      console.log('[移动端] 开始发送请求');
    }
    
    try {
      if (isDebug) {
        console.log('[DifyClient] sending request to', this.baseUrl);
        console.log('[DifyClient] request body', body);
      }
      
      // 统一URL构建逻辑
      const apiEndpoint = `${this.baseUrl}${API_PATHS.CHAT_MESSAGES}`;
      const timeout = isMobile ? this.timeout * 1.5 : this.timeout;
      
      if (isMobile) {
        console.log(`[移动端] 请求URL: ${apiEndpoint}`);
        console.log(`[移动端] 超时设置: ${timeout}ms`);
      }

      // 统一处理conversationId
      const requestBody = { 
        ...body,
        // 空字符串转为undefined
        conversation_id: body.conversation_id || undefined
      };
      
      if (isDebug) {
        console.log('处理后的请求参数:', requestBody);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        if (isMobile) console.error('请求超时');
        onError(new Error(`连接超时: ${timeout}ms`));
      }, timeout);

      const combinedSignal = signal
        ? new AbortSignalWrapper(signal, controller.signal).signal
        : controller.signal;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(key && { 'Authorization': `Bearer ${key}` }),
        ...(this.currentAppId && { 'X-App-ID': this.currentAppId })
      };
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: combinedSignal,
        credentials: 'same-origin'
      });

      clearTimeout(timeoutId);
      
      if (isMobile) {
        console.log(`请求响应状态: ${response.status}`);
      }
      
      if (!response.ok) {
        const responseTime = Date.now() - startTime;
        if (isMobile) {
          console.error(`请求失败: ${response.status} ${response.statusText}, 耗时: ${responseTime}ms`);
        }
        
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = '无法获取错误详情';
        }
        
        throw new Error(
          `请求失败: ${response.status} ${response.statusText}, 服务器消息: ${errorText}`,
        );
      }
      
      if (isMobile) {
        console.log('收到响应，开始处理数据流');
      }
      
      await this.readResponseAsStream(response, onMessage, isMobile);
      
      if (isMobile) {
        console.log('数据流处理完成');
      }
      
      onStop();
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error?.message || '未知错误';
      
      if (isMobile) {
        console.error(`错误发生: ${errorMessage}, 耗时: ${responseTime}ms`);
      }
      
      console.error(`[DifyClient] error: ${errorMessage}`, error);
      onError(error);
    }
  }
  
  async readResponseAsStream(
    response: Response, 
    onMessage: (message: string) => void,
    isMobile: boolean,
    onConversationId?: (id: string) => void
  ) {
    if (!response.body) {
      throw new Error('响应体为空');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    if (isMobile) {
      console.log('开始读取数据流');
    }
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (isMobile) {
          console.log('数据流读取完成');
        }
        break;
      }
      
      if (isMobile) {
        console.log(`收到数据: ${value.length} 字节`);
      }
      
      const text = decoder.decode(value, { stream: true });
      buffer += text;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsedData = JSON.parse(data);
            
            // 提取会话ID
            if (parsedData.conversation_id && onConversationId) {
              onConversationId(parsedData.conversation_id);
            }
            
            onMessage(parsedData.answer || '');
          } catch (e) {
            if (isMobile) {
              console.error(`解析数据失败: ${line}`);
            }
            console.error('[DifyClient] Failed to parse data', line, e);
          }
        }
      }
    }
  }
}