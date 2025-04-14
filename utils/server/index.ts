import { Message } from '@/types/chat';
import { OpenAIModel, ModelType } from '@/types/openai';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';
import { createStreamResponse } from './streamUtils';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MOBILE_CHUNK_SIZE = 500; // 移动端分块大小，较大以减少更新频率
const DESKTOP_CHUNK_SIZE = 1000; // 桌面端分块大小
const MOBILE_FLUSH_INTERVAL = 150; // 移动端刷新间隔（毫秒）
const DESKTOP_FLUSH_INTERVAL = 80; // 桌面端刷新间隔（毫秒）

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 检测是否为移动端
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

export const DifyStream = async (
  query: string | {
    query: string;
    user_id?: string;
    conversation_id?: string;
    inputs?: Record<string, any>;
    response_mode?: string;
    user?: any;
  },
  key?: string,
  user?: string,
  existingConversationId?: string,
) => {
  const url = process.env.DIFY_API_URL || 'http://localhost:8088/v1/chat-messages';
  const apiKey = key || process.env.DIFY_API_KEY || '';
  
  // 检测是否为对象形式的查询
  const isObjectQuery = typeof query === 'object';
  const isMobile = isMobileDevice();
  
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      // 构建请求体
      const requestBody = isObjectQuery 
        ? query 
        : {
            query,
            response_mode: 'streaming',
            user: user || 'anonymous-user',
            inputs: {},
            ...(existingConversationId ? { conversation_id: existingConversationId } : {}),
            auto_generate_name: true
          };
      
      console.log('DifyStream请求参数:', {
        url,
        conversationId: isObjectQuery 
          ? (query.conversation_id || '未设置') 
          : (existingConversationId || '未设置'),
        isMobile
      });
      
      const controller = new AbortController();
      const timeoutDuration = Number(process.env.DIFY_API_TIMEOUT || (isMobile ? 60000 : 30000)); // 移动端延长超时时间
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
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
      
      // 根据设备类型设置不同的批处理参数
      const batchingOptions = {
        maxBatchSize: isMobile ? MOBILE_CHUNK_SIZE : DESKTOP_CHUNK_SIZE,
        maxBatchDelay: isMobile ? MOBILE_FLUSH_INTERVAL : DESKTOP_FLUSH_INTERVAL
      };
      
      // 使用轻量级流处理工具创建流式响应
      const stream = createStreamResponse(
        res, 
        // 可选的自定义字段提取函数
        (data) => {
          // 处理不同类型的事件
          if (data.event === 'message' || data.event === 'agent_message') {
            return {
              conversation_id: data.conversation_id,
              answer: data.answer
            };
          } else if (data.event === 'message_end') {
            return {
              conversation_id: data.conversation_id,
              answer: '',
              event: 'message_end'
            };
          } else if (data.event === 'error') {
            throw new Error(data.message || 'Dify API error');
          } else {
            // 处理其他事件类型（如ping等）
            return null; // 返回null表示跳过此事件
          }
        },
        timeoutDuration,
        batchingOptions
      );
      
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
