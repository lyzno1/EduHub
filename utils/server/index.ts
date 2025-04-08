import { Message } from '@/types/chat';
import { OpenAIModel, ModelType } from '@/types/openai';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export const DifyStream = async (
  query: string,
  key: string,
  user: string,
  existingConversationId: string,
) => {
  // 从环境变量获取 URL
  const url = process.env.DIFY_API_URL || 'http://localhost:8088/v1/chat-messages';
  console.log('Using Dify URL:', url);
  
  try {
    // 构建请求体
    const requestBody = {
      query,
      response_mode: 'streaming',
      user: user || 'anonymous-user',
      inputs: {},
      conversation_id: existingConversationId || '',
      auto_generate_name: true
    };
    
    console.log('Dify request parameters:', {
      url,
      user,
      conversationId: existingConversationId || 'none'
    });
    
    // 发起 HTTP 请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 
      Number(process.env.DIFY_API_TIMEOUT || 30000));
    
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      method: 'POST',
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // 处理错误响应
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
    
    // 创建可读流
    const stream = new ReadableStream({
      async start(controller) {
        // 超时处理
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutDuration = Number(process.env.DIFY_API_TIMEOUT || 30000);
        
        const resetTimeout = () => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            console.log('Dify API response timeout');
            controller.close();
          }, timeoutDuration);
        };
        
        resetTimeout();
        
        const onParse = (event: ParsedEvent | ReconnectInterval) => {
          if (event.type === 'event') {
            try {
              const data = JSON.parse(event.data);
              
              switch (data.event) {
                case 'message':
                  // 重置超时
                  resetTimeout();
                  
                  // 发送消息块
                  const response = JSON.stringify({
                    conversation_id: data.conversation_id,
                    answer: data.answer || ''
                  }) + "\n";
                  
                  controller.enqueue(encoder.encode(response));
                  break;
                  
                case 'message_end':
                  console.log('Dify message completed:', data.conversation_id);
                  if (timeoutId) clearTimeout(timeoutId);
                  controller.close();
                  break;
                  
                case 'error':
                  console.error('Dify API error:', data.message);
                  throw new Error(`Dify API error: ${data.message}`);
                  
                case 'ping':
                  // 忽略心跳
                  break;
                  
                default:
                  console.log('Unhandled event type:', data.event);
              }
            } catch (e) {
              console.error('Error parsing Dify event:', e);
              if (timeoutId) clearTimeout(timeoutId);
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
          console.error('Error reading Dify stream:', e);
          if (timeoutId) clearTimeout(timeoutId);
          throw e;
        }
      },
    });
    
    return { stream };
  } catch (error) {
    console.error('Dify request failed:', error);
    throw error;
  }
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
