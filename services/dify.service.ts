import { getDifyApiUrl, getDifyApiKey, DifyResponse } from '@/config/dify.config';

export interface ChatMessageRequest {
  inputs?: Record<string, any>;
  query: string;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user?: string;
  files?: Array<{
    type: string;
    transfer_method: string;
    url?: string;
    content?: string;
  }>;
}

export class DifyService {
  private static instance: DifyService;
  private controller: AbortController | null = null;

  private constructor() {}

  public static getInstance(): DifyService {
    if (!DifyService.instance) {
      DifyService.instance = new DifyService();
    }
    return DifyService.instance;
  }

  public async sendChatMessage(
    appName: string,
    request: ChatMessageRequest,
    onMessage?: (response: DifyResponse) => void,
  ): Promise<void> {
    try {
      const apiKey = getDifyApiKey(appName);
      const url = getDifyApiUrl('/chat-messages');
      
      // 如果存在之前的请求，取消它
      if (this.controller) {
        this.controller.abort();
      }
      
      this.controller = new AbortController();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data: DifyResponse = JSON.parse(jsonStr);
              
              if (onMessage) {
                onMessage(data);
              }
            } catch (e) {
              console.error('解析响应数据失败:', e);
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('请求被取消');
      } else {
        console.error('发送消息失败:', error);
        throw error;
      }
    } finally {
      this.controller = null;
    }
  }

  public cancelRequest(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
} 