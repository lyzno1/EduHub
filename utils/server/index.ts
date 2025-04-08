import { Message } from '@/types/chat';
import { OpenAIModel, ModelType } from '@/types/openai';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MOBILE_CHUNK_SIZE = 100; // 移动端分块大小
const MOBILE_FLUSH_INTERVAL = 50; // 移动端刷新间隔（毫秒）

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 检测是否为移动端
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

export const DifyStream = async (
  query: string,
  key: string,
  user: string,
  existingConversationId: string,
) => {
  const url = process.env.DIFY_API_URL || 'http://localhost:8088/v1/chat-messages';
  const isMobile = isMobileDevice();
  
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const requestBody = {
        query,
        response_mode: 'streaming',
        user: user || 'anonymous-user',
        inputs: {},
        conversation_id: existingConversationId || '',
        auto_generate_name: true
      };
      
      const controller = new AbortController();
      const timeoutDuration = Number(process.env.DIFY_API_TIMEOUT || (isMobile ? 60000 : 30000)); // 移动端延长超时时间
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        method: 'POST',
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        keepalive: true
      });
      
      clearTimeout(timeoutId);
      
      if (res.status !== 200) {
        const errorBody = await res.text();
        let errorMessage = `Dify API returned ${res.status}`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorBody;
        } catch {
          errorMessage = errorBody;
        }
        throw new Error(errorMessage);
      }
      
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          let lastMessageTime = Date.now();
          
          // 心跳检测
          const heartbeatInterval = setInterval(() => {
            const now = Date.now();
            if (now - lastMessageTime > timeoutDuration) {
              clearInterval(heartbeatInterval);
              controller.error(new Error('Connection timeout'));
            }
          }, 5000);
          
          const flushBuffer = () => {
            if (buffer) {
              const chunk = buffer;
              buffer = '';
              controller.enqueue(encoder.encode(chunk + '\n'));
            }
          };
          
          // 移动端特殊处理：使用 setTimeout 定期刷新缓冲区
          let flushInterval: NodeJS.Timeout | null = null;
          if (isMobile) {
            flushInterval = setInterval(flushBuffer, MOBILE_FLUSH_INTERVAL);
          }
          
          const onParse = (event: ParsedEvent | ReconnectInterval) => {
            if (event.type === 'event') {
              try {
                lastMessageTime = Date.now();
                const data = JSON.parse(event.data);
                
                switch (data.event) {
                  case 'message':
                    const response = JSON.stringify({
                      conversation_id: data.conversation_id,
                      answer: data.answer || ''
                    });
                    
                    if (isMobile) {
                      // 移动端：累积到缓冲区
                      buffer += response;
                      if (buffer.length >= MOBILE_CHUNK_SIZE) {
                        flushBuffer();
                      }
                    } else {
                      // 桌面端：直接发送
                      controller.enqueue(encoder.encode(response + '\n'));
                    }
                    break;
                    
                  case 'message_end':
                    if (isMobile && flushInterval) {
                      clearInterval(flushInterval);
                      flushBuffer();
                    }
                    clearInterval(heartbeatInterval);
                    controller.close();
                    break;
                    
                  case 'error':
                    clearInterval(heartbeatInterval);
                    if (flushInterval) clearInterval(flushInterval);
                    throw new Error(`Dify API error: ${data.message}`);
                    
                  case 'ping':
                    lastMessageTime = Date.now();
                    break;
                }
              } catch (e) {
                clearInterval(heartbeatInterval);
                if (flushInterval) clearInterval(flushInterval);
                controller.error(e);
              }
            }
          };
          
          const parser = createParser(onParse);
          
          try {
            for await (const chunk of res.body as any) {
              parser.feed(decoder.decode(chunk));
            }
          } catch (e) {
            clearInterval(heartbeatInterval);
            if (flushInterval) clearInterval(flushInterval);
            throw e;
          }
        }
      });
      
      return { stream };
      
    } catch (error) {
      retries++;
      if (retries === MAX_RETRIES) {
        throw error;
      }
      await wait(RETRY_DELAY * retries);
    }
  }
  
  throw new Error('Maximum retries exceeded');
};

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export class ModelStreamFactory {
  static async getStream(
    modelType: string,
    query: string,
    key: string,
    user: string,
    conversationId: string
  ) {
    console.log(`Getting stream for model type: ${modelType}`);
    
    switch (modelType) {
      case ModelType.DIFY:
        return { stream: await DifyStream(query, key, user, conversationId) };
      default:
        throw new Error(`Unsupported model type: ${modelType}`);
    }
  }
}
