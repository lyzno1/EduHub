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
    
    // 尝试从conv_前缀格式提取ID部分
    if (id.startsWith('conv_')) {
      const parts = id.split('_');
      if (parts.length >= 3) {
        // 尝试组装为UUID格式
        try {
          // 假设最后部分可能是随机字符串，尝试构造一个有效的UUID
          // 使用时间戳部分和随机部分构造UUID
          const timestamp = parts[1];
          const randomPart = parts[2];
          
          if (timestamp && timestamp.length > 8 && randomPart && randomPart.length > 4) {
            // 提取数字并格式化为UUID格式
            const uuidParts = [
              timestamp.slice(0, 8),                         // 8个字符
              timestamp.slice(8, 12),                        // 4个字符
              '4' + timestamp.slice(12, 15),                 // UUID版本4的格式
              '8' + randomPart.slice(0, 3),                  // UUID变体
              randomPart.slice(3, 15)                        // 剩余部分
            ];
            
            const formattedUUID = uuidParts.join('-');
            
            // 验证生成的UUID格式是否正确
            if (this.isValidUUID(formattedUUID)) {
              console.log(`已将对话ID ${id} 转换为UUID格式: ${formattedUUID}`);
              return formattedUUID;
            }
          }
        } catch (e) {
          console.error('转换对话ID格式失败:', e);
        }
      }
      
      // 如果无法转换为有效UUID，尝试使用固定格式
      // 构造一个基于当前时间的UUID v4格式ID
      return this.generateUUID();
    }
    
    // 对于其他格式，尝试通用方法转换为UUID
    return this.generateUUID();
  }

  // 生成一个符合UUID v4格式的随机ID
  private generateUUID(): string {
    // 使用当前时间戳和随机数生成UUID
    const timestamp = Date.now().toString(16);
    const randomStr = Math.random().toString(16).substring(2, 10);
    
    // 组合UUID各段
    const p1 = timestamp.slice(0, 8).padStart(8, '0');
    const p2 = timestamp.slice(8, 12).padStart(4, '0');
    const p3 = '4' + timestamp.slice(12, 15).padStart(3, '0');
    const p4 = (8 + Math.floor(Math.random() * 4)).toString(16) + randomStr.slice(0, 3);
    const p5 = randomStr.slice(3, 15).padStart(12, '0');
    
    const uuid = `${p1}-${p2}-${p3}-${p4}-${p5}`;
    console.log('已生成新的UUID:', uuid);
    return uuid;
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

              // 立即处理每一段数据
              const text = decoder.decode(value, { stream: true });
              buffer += text;

              // 更改分隔符检测逻辑，确保能处理不同格式的数据
              // 尝试多种分隔符，提高兼容性
              const separators = ['\n\n', '\n', '\r\n\r\n', '\r\n'];
              let splitFound = false;
              
              for (const separator of separators) {
                if (buffer.includes(separator)) {
                  const lines = buffer.split(separator);
                  // 保留最后一部分作为新的buffer
                  buffer = lines.pop() || '';
                  
                  for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    // 尝试多种数据前缀格式
                    let eventData = '';
                    if (line.startsWith('data:')) {
                      eventData = line.slice(5).trim();
                    } else if (line.includes('data:')) {
                      // 兼容数据中间包含data:的情况
                      const parts = line.split('data:');
                      eventData = parts[parts.length - 1].trim();
                    } else {
                      // 尝试直接解析
                      eventData = line.trim();
                    }
                    
                    if (!eventData || eventData === '[DONE]') {
                      if (completeCallback) {
                        completeCallback();
                      }
                      continue;
                    }

                    try {
                      const data = JSON.parse(eventData);
                      
                      // 捕获并更新conversationId
                      if (data.conversation_id && (!streamConversationId || streamConversationId === '')) {
                        streamConversationId = data.conversation_id;
                        console.log('收到新的conversationId:', streamConversationId);
                      }

                      if (data.event === 'message') {
                        if (messageCallback && data.answer !== undefined) {
                          // 即使是空字符串也要回调，确保流式效果
                          messageCallback(data.answer);
                        }
                      } else if (data.event === 'message_end') {
                        if (completeCallback) {
                          completeCallback();
                        }
                      } else if (data.answer !== undefined) {
                        // 兼容没有event字段的情况
                        if (messageCallback) {
                          messageCallback(data.answer);
                        }
                      }
                    } catch (e) {
                      console.error('解析事件数据失败:', eventData, e);
                    }
                  }
                  
                  splitFound = true;
                  break;
                }
              }
              
              // 如果没有找到任何分隔符但buffer较大，尝试直接处理
              if (!splitFound && buffer.length > 100) {
                try {
                  // 尝试解析整个buffer
                  const data = JSON.parse(buffer);
                  if (data.answer !== undefined && messageCallback) {
                    messageCallback(data.answer);
                    buffer = '';
                  }
                } catch (e) {
                  // 解析失败，继续等待更多数据
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
          alert(`[移动端] 使用对话ID: ${validatedId}${validatedId !== requestBody.conversation_id ? ' (已转换)' : ''}`);
        }
      } else {
        // 当返回undefined的极端情况
        delete requestBody.conversation_id;
        
        if (isMobile) {
          alert('[移动端] 无法验证对话ID，将创建新对话');
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
    
    // 添加调试计数器，跟踪数据处理
    let chunkCount = 0;
    let messageCount = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (isMobile) {
            alert(`[移动端] 数据流读取完成，共处理 ${chunkCount} 个数据块, ${messageCount} 条消息`);
          }
          break;
        }
        
        chunkCount++;
        
        // 立即处理收到的数据
        const text = decoder.decode(value, { stream: true });
        buffer += text;
        
        // 尝试使用多种分隔符
        const separators = ['\n\n', '\n', '\r\n\r\n', '\r\n'];
        let foundSeparator = false;
        
        for (const separator of separators) {
          if (buffer.includes(separator)) {
            const lines = buffer.split(separator);
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              let dataContent = '';
              if (line.startsWith('data: ')) {
                dataContent = line.slice(6);
              } else if (line.includes('data:')) {
                const dataParts = line.split('data:');
                dataContent = dataParts[dataParts.length - 1].trim();
              } else {
                dataContent = line.trim();
              }
              
              if (dataContent === '[DONE]') continue;
              
              try {
                const parsedData = JSON.parse(dataContent);
                
                // 提取会话ID
                if (parsedData.conversation_id && parsedData.conversation_id.trim() !== '') {
                  if (!localConversationId || localConversationId.trim() === '') {
                    localConversationId = parsedData.conversation_id;
                    
                    if (onConversationId) {
                      onConversationId(parsedData.conversation_id);
                    }
                  }
                }
                
                if (parsedData.answer !== undefined) {
                  // 检测到回答内容
                  messageCount++;
                  onMessage(parsedData.answer);
                } else if (parsedData.event === 'message' && parsedData.answer !== undefined) {
                  // 兼容event模式
                  messageCount++;
                  onMessage(parsedData.answer);
                }
              } catch (e) {
                console.error('解析数据失败:', dataContent);
              }
            }
            
            foundSeparator = true;
            break;
          }
        }
        
        // 如果buffer积累太多但没找到分隔符，尝试解析整个buffer
        if (!foundSeparator && buffer.length > 100) {
          try {
            const data = JSON.parse(buffer);
            if (data.answer !== undefined) {
              messageCount++;
              onMessage(data.answer);
              buffer = '';
            }
          } catch (e) {
            // 解析失败，继续等待更多数据
          }
        }
      }
    } catch (error: any) {
      console.error('读取流数据错误:', error);
      if (isMobile) {
        alert(`[移动端] 读取数据出错: ${error.message}`);
      }
      throw error;
    }
  }
}