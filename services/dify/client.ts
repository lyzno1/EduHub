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

  // 检查字符串是否为有效的UUID格式
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
  
  // 尝试格式化或验证对话ID
  private validateConversationId(id: string | undefined): string | undefined {
    if (!id || id.trim() === '') {
      return undefined;
    }
    
    // 如果已经是有效的UUID，直接返回
    if (this.isValidUUID(id)) {
      return id;
    }
    
    // 尝试处理特殊格式的ID
    if (id.startsWith('conv_')) {
      // 如果使用特殊前缀，可能需要移除前缀或者直接返回undefined创建新会话
      console.warn('检测到非UUID格式的对话ID，将创建新会话');
      return undefined;
    }
    
    // 保守处理：无法确认格式时返回undefined
    return undefined;
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
      let streamConversationId = this.validateConversationId(conversationId);

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

        const requestParams: any = {
          query,
          response_mode: 'streaming',
          user: user,
          inputs: inputs || {},
          auto_generate_name: autoGenerateName,
          ...(model && { model }),
          ...(temperature && { temperature })
        };
        
        // 只有当conversation_id为有效值时才添加
        if (streamConversationId) {
          requestParams['conversation_id'] = streamConversationId;
        }

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
    
    // 移动端使用alert以确保可见
    if (isMobile) {
      alert(`[移动端] 发送请求: ${body.conversation_id || '新对话'}`);
    }
    
    try {
      // 统一URL构建逻辑
      const apiEndpoint = `${this.baseUrl}${API_PATHS.CHAT_MESSAGES}`;
      const timeout = this.timeout;
      
      // 统一处理conversationId，确保空字符串和undefined都作相同处理
      const requestBody = { 
        ...body
      };
      
      // 验证和处理conversation_id
      const validatedId = this.validateConversationId(requestBody.conversation_id);
      
      if (validatedId) {
        requestBody.conversation_id = validatedId;
        
        if (isMobile) {
          alert(`[移动端] 使用有效的对话ID: ${validatedId}`);
        }
      } else {
        // 删除无效的conversation_id
        delete requestBody.conversation_id;
        
        if (isMobile) {
          alert('[移动端] 无效的对话ID格式，将创建新对话');
        }
      }
      
      if (isDebug) {
        console.log('处理后的请求参数:', JSON.stringify(requestBody));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
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
      
      console.log(`${isMobile ? '[移动端]' : '[桌面端]'} 请求响应状态: ${response.status}`);
      
      if (!response.ok) {
        const responseTime = Date.now() - startTime;
        
        if (isMobile) {
          alert(`[移动端] 请求失败: ${response.status}`);
        }
        
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.message || '';
          
          // 统一处理会话不存在的错误
          if (errorText.includes('Conversation Not Exists') || errorText.includes('会话不存在')) {
            if (isMobile) {
              alert('[移动端] 对话不存在，重置会话ID');
            }
            // 统一错误信息格式
            throw new Error('Conversation Not Exists');
          }
        } catch (e: any) {
          if (e.message === 'Conversation Not Exists') {
            throw e;
          }
          errorText = '无法获取错误详情';
        }
        
        throw new Error(
          `请求失败: ${response.status} ${response.statusText}, 服务器消息: ${errorText}`,
        );
      }
      
      if (isMobile) {
        alert('[移动端] 收到响应，开始处理数据');
      }
      
      // 添加对话ID回调
      await this.readResponseAsStream(
        response, 
        onMessage, 
        isMobile,
        (conversationId) => {
          if (isMobile) {
            alert(`[移动端] 收到并保存对话ID: ${conversationId}`);
          }
        }
      );
      
      if (isMobile) {
        alert('[移动端] 数据处理完成');
      }
      
      onStop();
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error?.message || '未知错误';
      
      if (isMobile) {
        alert(`[移动端] 错误: ${errorMessage}`);
      }
      
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
    let localConversationId = '';
    
    if (isMobile) {
      alert('[移动端] 开始读取数据流');
    }
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (isMobile) {
          alert('[移动端] 数据流读取完成');
        }
        break;
      }
      
      if (isMobile) {
        alert(`[移动端] 收到数据: ${value.length} 字节`);
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
            
            // 提取会话ID，确保在移动端和桌面端一致性处理
            if (parsedData.conversation_id && parsedData.conversation_id.trim() !== '') {
              if (isMobile) {
                alert(`[移动端] 收到对话ID: ${parsedData.conversation_id}`);
              }
              
              if (!localConversationId || localConversationId.trim() === '') {
                localConversationId = parsedData.conversation_id;
                
                if (onConversationId) {
                  onConversationId(parsedData.conversation_id);
                }
              }
            }
            
            onMessage(parsedData.answer || '');
          } catch (e) {
            if (isMobile) {
              alert(`[移动端] 解析数据失败: ${line}`);
            }
            console.error('[DifyClient] Failed to parse data', line, e);
          }
        }
      }
    }
  }
}