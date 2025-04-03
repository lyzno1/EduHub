import { ModelStreamFactory, OpenAIError } from '@/utils/server';
import { ChatBody, Message } from '@/types/chat';
import { ModelType } from '@/types/openai';
import { handleApiError } from '@/utils/app/api';

export const config = {
  runtime: 'edge',
};

/**
 * 统一的API请求处理模板
 * @param req 请求对象
 * @param modelType 模型类型
 * @param messageProcessor 可选的消息预处理函数
 * @returns Response对象
 */
export const createChatHandler = async (
  req: Request, 
  modelType: ModelType,
  messageProcessor?: (messages: Message[]) => any
) => {
  try {
    // 解析请求体
    const {
      model,
      messages,
      key,
      prompt,
      temperature,
      conversationID,
      user,
    } = (await req.json()) as ChatBody;

    console.log(`API request received for ${modelType}`);
    console.log('Model:', model.name);
    console.log('Message count:', messages.length);

    // 确保至少有一条消息
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'No messages provided',
            type: 'invalid_request_error',
            param: null,
            code: null,
          },
        }),
        { status: 400 }
      );
    }

    // 获取最新用户消息
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Last message must be from user',
            type: 'invalid_request_error',
            param: null,
            code: null,
          },
        }),
        { status: 400 }
      );
    }
    
    // 处理消息
    let processedData;
    if (messageProcessor) {
      // 使用自定义消息处理器
      processedData = messageProcessor(messages);
    } else {
      // 默认处理：获取最后一条用户消息的内容
      processedData = lastMessage.content;
    }
    
    // 将处理后的数据转换为字符串
    const queryData = typeof processedData === 'string' 
      ? processedData 
      : JSON.stringify(processedData);
      
    console.log(`Processed data for ${modelType}:`, 
      queryData.length > 100 ? queryData.substring(0, 100) + '...' : queryData);
    
    // 使用工厂类处理请求
    const { stream } = await ModelStreamFactory.getStream(
      modelType,
      queryData,
      key || '', 
      user || 'anonymous', 
      conversationID || ''
    );

    return new Response(stream);
  } catch (error) {
    console.error(`${modelType} API error:`, error);
    
    return new Response(
      JSON.stringify(handleApiError(error)),
      { status: error instanceof OpenAIError ? 400 : 500 }
    );
  }
};

// 仅导出模板，不作为实际处理器
export default null; 