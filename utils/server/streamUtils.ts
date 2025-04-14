import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

/**
 * 创建流式响应 - 基于eduhub-old的轻量级实现
 * 
 * @param response 原始fetch响应
 * @param extractFields 自定义字段提取函数，默认提取conversation_id和answer
 * @param timeoutMs 超时时间(毫秒)，默认30秒
 * @param batchingOptions 批处理选项，控制数据发送频率
 * @returns ReadableStream包装的流
 */
export const createStreamResponse = (
  response: Response,
  extractFields?: (data: any) => any,
  timeoutMs: number = 30000,
  batchingOptions?: {
    maxBatchSize?: number; // 单批最大字符数
    maxBatchDelay?: number; // 最大批处理延迟(ms)
  }
): ReadableStream => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // 批处理默认配置
  const maxBatchSize = batchingOptions?.maxBatchSize || 1000; // 默认1000字符一批
  const maxBatchDelay = batchingOptions?.maxBatchDelay || 100; // 默认最多100ms发送一次

  return new ReadableStream({
    async start(controller) {
      // 添加超时逻辑
      let timeoutId: ReturnType<typeof setTimeout>;
      let batchTimeoutId: ReturnType<typeof setTimeout> | null = null;
      
      // 数据批处理缓冲区
      let dataBuffer: any[] = [];
      let lastBatchTime = Date.now();
      
      const resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // 超时前确保所有缓冲区数据都被发送
          flushBuffer(true);
          controller.close(); // 超时自动关闭流
        }, timeoutMs);
      };
      
      // 刷新缓冲区并发送数据
      const flushBuffer = (force = false) => {
        if (batchTimeoutId) {
          clearTimeout(batchTimeoutId);
          batchTimeoutId = null;
        }
        
        // 只有在强制刷新或有数据时才处理
        if (force || dataBuffer.length > 0) {
          // 将数据批量发送
          for (const chunk of dataBuffer) {
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
          }
          
          // 清空缓冲区
          dataBuffer = [];
          lastBatchTime = Date.now();
        }
      };

      resetTimeout(); // 初始化超时

      // 添加数据到缓冲区
      const addToBuffer = (data: any) => {
        if (!data) return; // 跳过null数据
        
        dataBuffer.push(data);
        
        // 检查是否需要立即发送
        const now = Date.now();
        const bufferSize = JSON.stringify(dataBuffer).length;
        const timeSinceLastBatch = now - lastBatchTime;
        
        // 如果缓冲区数据量超过阈值或上次发送间隔过长，立即发送
        if (bufferSize >= maxBatchSize || timeSinceLastBatch >= maxBatchDelay) {
          flushBuffer();
        } else if (!batchTimeoutId) {
          // 设置最大延迟定时器，确保数据不会在缓冲区停留太久
          batchTimeoutId = setTimeout(() => flushBuffer(), maxBatchDelay - timeSinceLastBatch);
        }
        
        // 重置超时
        resetTimeout();
      };

      // 事件解析器
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          try {
            const data = JSON.parse(event.data);
            
            // 提取必要字段 - 可自定义或使用默认行为
            const output = extractFields ? extractFields(data) : {
              conversation_id: data.conversation_id,
              answer: data.answer
            };
            
            // 添加到批处理缓冲区而不是立即发送
            addToBuffer(output);
          } catch (e) {
            console.error('解析事件数据失败:', e);
          }
        }
      };

      const parser = createParser(onParse);

      try {
        // 处理响应体
        for await (const chunk of response.body as any) {
          parser.feed(decoder.decode(chunk));
        }
        
        // 确保缓冲区中的所有数据都被发送
        flushBuffer(true);
        
        // 正常结束
        clearTimeout(timeoutId);
        controller.close();
      } catch (error) {
        // 错误处理
        clearTimeout(timeoutId);
        if (batchTimeoutId) clearTimeout(batchTimeoutId);
        console.error('流处理错误:', error);
        controller.error(error);
      }
    }
  });
}; 