import { ModelType } from '@/types/openai';
import { ModelStreamFactory, DifyStream } from '@/utils/server';
import keys from '@/dify_keys.json';

import { ChatBody } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const {
      model,
      messages,
      key,
      prompt,
      temperature,
      conversationID: Dify_ConversationId,
      user,
    } = (await req.json()) as ChatBody;

    // 获取最后一条消息内容作为查询
    let query = messages[messages.length - 1].content;
    
    // 记录请求信息
    console.log('API request received for dify-chat');
    console.log('Model:', model.id);
    console.log('Model key from model object:', model.key);
    console.log('Message count:', messages.length);
    
    // 尝试从多个来源获取API密钥
    // 1. 首先从模型ID查找keys文件
    let apiKey = keys[model.id] || '';
    console.log('API key from keys file:', apiKey ? '(found)' : '(not found)');
    
    // 2. 如果没有找到，使用model.key
    if (!apiKey && model.key) {
      apiKey = model.key;
      console.log('Using API key from model.key');
    }
    
    // 3. 如果仍然没有，使用传入的key参数
    if (!apiKey && key) {
      apiKey = key;
      console.log('Using API key from request key parameter');
    }
    
    // 4. 最后尝试环境变量
    if (!apiKey) {
      apiKey = process.env.DIFY_API_KEY || '';
      console.log('Using API key from environment:', apiKey ? '(found)' : '(not found)');
    }
    
    if (!apiKey) {
      console.error('No Dify API key available from any source');
      return new Response('Dify API key is required', { status: 400 });
    }
    
    console.log('Final API key status:', apiKey ? '(available)' : '(not available)');
    console.log('Conversation ID:', Dify_ConversationId || '(new conversation)');
    
    try {
      // 直接使用DifyStream，而不是通过ModelStreamFactory
      const { stream } = await DifyStream(
        query,
        apiKey,
        user || 'anonymous-user',  // 使用一致的默认用户标识符
        Dify_ConversationId || ''
      );

      return new Response(stream);
    } catch (error) {
      console.error('Error in DifyStream:', error);
      if (error instanceof Error) {
        // 提供更详细的错误信息
        return new Response(
          JSON.stringify({
            error: true,
            message: error.message,
            stack: error.stack
          }), 
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
      return new Response(`Dify API error: Unknown error`, { status: 500 });
    }
  } catch (error) {
    console.error('Error parsing request:', error);
    if (error instanceof Error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
    return new Response('Unknown error', { status: 500 });
  }
};

export default handler; 