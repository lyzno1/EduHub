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
    const safeConfig = config || {};
    let rawUrl = safeConfig.apiUrl || process.env.NEXT_PUBLIC_DIFY_API_URL || DEFAULT_API_URL;
    
    rawUrl = rawUrl
      .replace(/\/+$/, '')
      .replace(/\/v1\/chat-messages$/, '')
      .replace(/:\d+/, ':8080');
    
    this.baseUrl = rawUrl;
    this.currentModel = 'dify';
    this.debug = false;
    this.timeout = safeConfig.timeout || Number(process.env.NEXT_PUBLIC_DIFY_TIMEOUT) || DEFAULT_TIMEOUT;
  }

  public setAppId(appId: string) {
    this.currentAppId = appId;
  }

  public setModel(model: string) {
    this.currentModel = model;
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
            // 保留错误处理，但不输出日志
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

      } catch (error) {
        const typedError = error instanceof Error ? error : new Error(String(error));
        if (errorCallback) {
          (errorCallback as (error: Error) => void)(typedError);
        }
        reject(typedError);
      }
    });
  }
}