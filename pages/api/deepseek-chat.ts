import { createChatHandler } from './chat-template';
import { ModelType } from '@/types/openai';
import { Message } from '@/types/chat';

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

// 使用模板创建处理器
const handler = (req: Request) => createChatHandler(req, ModelType.DEEPSEEK, convertToDeepSeekMessages);

export default handler; 