import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, DeepSeekStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

// 将消息转换为DeepSeek API所需的格式
function convertToDeepSeekMessages(messages: Message[]) {
  // 添加一个默认的系统消息
  const deepseekMessages = [
    { role: "system", content: "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible, while being safe. Your answers should not include any harmful, unethical, racist, sexist, toxic, dangerous, or illegal content." }
  ];
  
  // 转换用户和助手消息
  messages.forEach(message => {
    // 用户消息直接映射
    if (message.role === 'user') {
      deepseekMessages.push({ role: 'user', content: message.content });
    } 
    // 助手消息映射为assistant
    else if (message.role === 'assistant') {
      deepseekMessages.push({ role: 'assistant', content: message.content });
    }
  });
  
  return deepseekMessages;
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const {
      model,
      messages,
      key,
      prompt,
      temperature,
      conversationID,
      user,
    } = (await req.json()) as ChatBody;

    console.log('DeepSeek API request received');
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
    
    // 转换消息格式并传递给DeepSeekStream
    const deepseekMessages = convertToDeepSeekMessages(messages);
    
    console.log('Converted messages for DeepSeek:', JSON.stringify(deepseekMessages));
    
    // 使用DeepSeekStream处理请求
    const { stream } = await DeepSeekStream(
      JSON.stringify(deepseekMessages), // 将整个消息数组作为查询传递
      key || process.env.DEEPSEEK_API_KEY || '', 
      user || 'anonymous', 
      conversationID || ''
    );

    return new Response(stream);
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          type: 'server_error',
          param: null,
          code: null,
        },
      }),
      { status: 500 }
    );
  }
};

export default handler; 