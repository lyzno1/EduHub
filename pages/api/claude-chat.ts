import { createChatHandler } from './chat-template';
import { ModelType } from '@/types/openai';
import { Message } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

// 将消息转换为Claude API所需的格式
function convertToClaudeMessages(messages: Message[]) {
  // Claude的系统消息
  const systemMessage = "You are Claude, a helpful, harmless, and honest AI assistant created by Anthropic.";
  
  // Claude使用特殊格式组织对话历史
  let claudeContent = `${systemMessage}\n\n`;
  
  messages.forEach(message => {
    if (message.role === 'user') {
      claudeContent += `Human: ${message.content}\n\n`;
    } 
    else if (message.role === 'assistant') {
      claudeContent += `Assistant: ${message.content}\n\n`;
    }
  });
  
  // 添加最后的Assistant前缀，让模型开始回复
  claudeContent += "Assistant:";
  
  // Claude 2.1版本的API格式
  return {
    model: "claude-2.1",
    prompt: claudeContent,
    temperature: 0.7,
    max_tokens_to_sample: 4000,
    stream: true
  };
}

// 使用模板创建处理器
const handler = (req: Request) => createChatHandler(req, ModelType.CLAUDE, convertToClaudeMessages);

export default handler; 