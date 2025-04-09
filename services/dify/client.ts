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
      let messageCallback: ((chunk: string) => void) | null = null;
      let errorCallback: ((error: Error) => void) | null = null;
      let completeCallback: (() => void) | null = null;

      const stream: DifyStream = {
        onMessage: (callback: (chunk: string) => void) => {
          messageCallback = callback;
        },
        onError: (callback: (error: Error) => void) => {
          errorCallback = callback;
        },
        onComplete: (callback: () => void) => {
          completeCallback = callback;
        }
      };

      try {
        const apiEndpoint = this.baseUrl;
        
        if (this.debug) {
          console.log('创建聊天流 - 配置信息:', {
            endpoint: apiEndpoint,
            conversationId,
            user
          });
        }

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
              'Connection': 'keep-alive',
              'Cache-Control': 'no-cache',
              ...(this.currentAppId && { 'X-App-ID': this.currentAppId })
            },
            body: JSON.stringify(requestParams),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            let errorMessage = `API请求失败: ${response.status}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
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

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  if (completeCallback) completeCallback();
                  break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.trim() === '') continue;
                  
                  if (line.startsWith('data: ')) {
                    const eventData = line.slice(6);
                    
                    try {
                      const data = JSON.parse(eventData) as ChatResponse;
                      
                      switch (data.event) {
                        case EVENTS.MESSAGE:
                          if (data.answer && messageCallback) {
                            messageCallback(data.answer);
                          }
                          break;

                        case EVENTS.MESSAGE_END:
                          if (completeCallback) completeCallback();
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
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error(String(error));
        if (errorCallback) {
          errorCallback(typedError);
        }
        reject(typedError);
      }
    });
  }

  async streamChat(
    body: RequestBody,
    signal: AbortSignal | undefined,
    onMessage: (message: string) => void,
    onError: (error: Error) => void,
    onStop: () => void,
  ) {
    const isDebug = this.debug || this.isMobileDevice();
    const isMobile = this.isMobileDevice();
    const startTime = Date.now();
    
    if (isMobile) {
      alert('开始发送请求');
    }
    
    try {
      if (isDebug) {
        console.log('[DifyClient] sending request to', this.baseUrl);
        console.log('[DifyClient] request body', body);
      }
      
      const url = this.baseUrl;
      const timeout = isMobile ? this.timeout * 1.5 : this.timeout;
      
      if (isMobile) {
        console.log(`[移动端] 请求URL: ${url}`);
        console.log(`[移动端] 超时设置: ${timeout}ms`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        if (isMobile) alert('请求超时');
        onError(new Error(`连接超时: ${timeout}ms`));
      }, timeout);

      const combinedSignal = signal
        ? new AbortSignalWrapper(signal, controller.signal).signal
        : controller.signal;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);
      
      if (isMobile) {
        alert(`请求响应状态: ${response.status}`);
      }
      
      if (!response.ok) {
        const responseTime = Date.now() - startTime;
        if (isMobile) {
          alert(`请求失败: ${response.status} ${response.statusText}, 耗时: ${responseTime}ms`);
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
        alert('收到响应，开始处理数据流');
      }
      
      await this.readResponseAsStream(response, onMessage, isMobile);
      
      if (isMobile) {
        alert('数据流处理完成');
      }
      
      onStop();
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error?.message || '未知错误';
      
      if (isMobile) {
        alert(`错误发生: ${errorMessage}, 耗时: ${responseTime}ms`);
      }
      
      console.error(`[DifyClient] error: ${errorMessage}`, error);
      onError(error);
    }
  }
  
  async readResponseAsStream(
    response: Response, 
    onMessage: (message: string) => void,
    isMobile: boolean
  ) {
    if (!response.body) {
      throw new Error('响应体为空');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    if (isMobile) {
      alert('开始读取数据流');
    }
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (isMobile) {
          alert('数据流读取完成');
        }
        break;
      }
      
      if (isMobile) {
        alert(`收到数据: ${value.length} 字节`);
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
            onMessage(parsedData.answer || '');
          } catch (e) {
            if (isMobile) {
              alert(`解析数据失败: ${line}`);
            }
            console.error('[DifyClient] Failed to parse data', line, e);
          }
        }
      }
    }
  }
}