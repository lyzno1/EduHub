import { Message } from '@/types/chat';
import { OpenAIModel, ModelType } from '@/types/openai';

import { AZURE_DEPLOYMENT_ID, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

// 其他依赖和OpenAIError类定义保持不变

// 添加DeepSeek Stream函数，用于处理DeepSeek API的请求
export const DeepSeekStream = async (
  query: string,
  key: string,
  user: string,
  existingConversationId: string,
) => {
  // DeepSeek API URL
  const url = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

  console.log('DeepSeek URL:', url);
  console.log('Using conversation ID:', existingConversationId);

  // 解析消息
  let messages;
  try {
    // 尝试解析query作为JSON消息数组
    messages = JSON.parse(query);
    console.log('Using parsed message array');
  } catch (e) {
    // 如果解析失败，则query是普通文本，将其作为用户消息
    console.log('Using query as single user message');
    messages = [
      { role: "system", content: "You are a helpful, respectful and honest assistant." },
      { role: "user", content: query }
    ];
  }

  // 构建请求体
  const requestBody = {
    model: "deepseek-chat", // 默认模型，可根据实际情况调整
    messages: messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 2000,
  };

  console.log('DeepSeek request body:', JSON.stringify(requestBody));

  try {
    // 发起HTTP请求
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key || process.env.DEEPSEEK_API_KEY}`
      },
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // 处理非200的HTTP状态
    if (res.status !== 200) {
      console.error('DeepSeek API error status:', res.status);
      
      let errorMessage;
      try {
        const result = await res.json();
        console.error('DeepSeek API error details:', result);
        if (result.error) {
          errorMessage = result.error.message || 'Unknown API error';
          throw new OpenAIError(
            result.error.message,
            result.error.type || 'unknown',
            result.error.param || 'unknown',
            result.error.code || 'unknown',
          );
        } else {
          errorMessage = 'Unknown API error';
          throw new Error(`DeepSeek API returned an error: ${res.statusText}`);
        }
      } catch (parseError) {
        console.error('Error parsing API error response:', parseError);
        errorMessage = `DeepSeek API returned status ${res.status}: ${res.statusText}`;
        throw new Error(errorMessage);
      }
    }

    // 处理成功响应并创建一个ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        let text = '';
        let isStreamClosed = false; // 标志流是否已经关闭
        
        // 创建唯一的会话ID
        const newConversationId = existingConversationId || `convid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        // 安全地向流中添加数据的函数
        const safeEnqueue = (data: Uint8Array) => {
          if (!isStreamClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              console.error('Error enqueueing data to stream:', error);
              // 如果出现错误，标记流已关闭
              isStreamClosed = true;
            }
          }
        };

        // 安全地关闭流的函数
        const safeClose = () => {
          if (!isStreamClosed) {
            try {
              controller.close();
              isStreamClosed = true;
              console.log('DeepSeek stream closed successfully');
            } catch (error) {
              console.error('Error closing stream:', error);
            }
          }
        };

        const onParse = (event: ParsedEvent | ReconnectInterval) => {
          if (event.type === 'event') {
            const data = event.data;
            
            try {
              if (data === "[DONE]") {
                // 流结束
                console.log('DeepSeek stream completed');
                
                // 确保在流结束时发送最终消息
                if (text && !isStreamClosed) {
                  const finalMessage = JSON.stringify({
                    conversation_id: newConversationId,
                    answer: text,
                    finished: true
                  }) + "\n";
                  safeEnqueue(encoder.encode(finalMessage));
                }
                
                safeClose();
                return;
              }
              
              const json = JSON.parse(data);
              const delta = json.choices[0]?.delta?.content || "";
              
              if (delta && !isStreamClosed) {
                text += delta;
                
                // 将解析后的数据加入stream，采用与DifyStream兼容的格式
                const response = JSON.stringify({ 
                  conversation_id: newConversationId, 
                  answer: delta 
                }) + "\n";
                
                safeEnqueue(encoder.encode(response));
              }
              
              // 如果是结束消息，但不在这里关闭流，让[DONE]事件来关闭
              if (json.choices[0]?.finish_reason) {
                console.log('DeepSeek response finish_reason:', json.choices[0].finish_reason);
                // 不在这里关闭流，只记录结束原因
              }
            } catch (e) {
              console.error('Error parsing DeepSeek API response:', e);
              if (!isStreamClosed) {
                controller.error(e);
                isStreamClosed = true;
              }
            }
          }
        };

        const parser = createParser(onParse);

        try {
          for await (const chunk of res.body as any) {
            // 如果流已关闭，不再处理后续数据
            if (isStreamClosed) break;
            parser.feed(decoder.decode(chunk));
          }
        } catch (readError) {
          console.error('Error reading DeepSeek API response stream:', readError);
          if (!isStreamClosed) {
            controller.error(readError);
            isStreamClosed = true;
          }
        }
      },
    });

    return {
      stream
    };
  } catch (error) {
    console.error('DeepSeek API request failed:', error);
    throw error;
  }
};

export const DifyStream = async (
  query: string,
  key: string,
  user: string,
  existingConversationId: string,
) => {
  // 更新URL
  const url = process.env.DIFY_API_URL || 'https://api.dify.ai/v1/chat-messages';

  // 发起HTTP请求
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key || process.env.DIFY_API_KEY}`
    },
    method: 'POST',
    body: JSON.stringify({
      inputs: {}, // 这里可以根据API文档进行适当的调整
      query: query,
      response_mode: 'streaming',
      user: user,
      conversation_id: existingConversationId // 使用存在的conversation_id
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // 处理非200的HTTP状态
  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(`API returned an error: ${decoder.decode(result?.value) || result.statusText}`);
    }
  }

  // 处理成功响应并创建一个ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      // 添加超时逻辑
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutDuration = Number(process.env.DIFY_API_TIMEOUT || 5000);

      const resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          controller.close(); // 关闭流
        }, timeoutDuration);
      };

      resetTimeout(); // 初始化超时

      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = JSON.parse(event.data);

          // 更新conversation_id
          const newConversationId = data.conversation_id;

          // 如果需要，可以将其他字段也解析出来
          const answer = data.answer;

          // 每次收到数据，重置超时
          resetTimeout();

          // 将解析后的数据加入stream
          // 将解析后的数据加入stream，并在每个对象后添加换行符作为分隔符
          const queue = encoder.encode(JSON.stringify({ conversation_id: newConversationId, answer: answer }) + "\n");
          controller.enqueue(queue);
        }
      };
      // console.log('new||ConversationId', newConversationId);

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return {
    stream
  };
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

export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature : number,
  key: string,
  messages: Message[],
) => {
  let url = `${OPENAI_API_HOST}/v1/chat/completions`;
  if (OPENAI_API_TYPE === 'azure') {
    url = `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  }
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...(OPENAI_API_TYPE === 'azure' && {
        'api-key': `${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...((OPENAI_API_TYPE === 'openai' && OPENAI_ORGANIZATION) && {
        'OpenAI-Organization': OPENAI_ORGANIZATION,
      }),
    },
    method: 'POST',
    body: JSON.stringify({
      ...(OPENAI_API_TYPE === 'openai' && {model: model.id}),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: temperature,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error: ${
          decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          try {
            const json = JSON.parse(data);
            if (json.choices[0].finish_reason != null) {
              controller.close();
              return;
            }
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};

// 创建统一的ModelStreamFactory工厂类
export class ModelStreamFactory {
  /**
   * 获取适合特定模型类型的流处理器
   * @param modelType 模型类型
   * @param query 查询字符串或消息数组的JSON字符串
   * @param key API密钥
   * @param user 用户标识
   * @param conversationId 对话ID
   * @returns 包含流的对象
   */
  static async getStream(
    modelType: string,
    query: string,
    key: string,
    user: string,
    conversationId: string
  ) {
    console.log(`ModelStreamFactory: Processing ${modelType} model request`);
    
    switch (modelType) {
      case ModelType.DEEPSEEK:
        console.log('Using DeepSeek stream processor');
        return DeepSeekStream(query, key, user, conversationId);
        
      case ModelType.CLAUDE:
        // TODO: 实现Claude模型的流处理
        console.log('Claude API not yet implemented');
        throw new Error('Claude API not implemented yet');
        
      case ModelType.GEMINI:
        // TODO: 实现Gemini模型的流处理
        console.log('Gemini API not yet implemented');
        throw new Error('Gemini API not implemented yet');
        
      case ModelType.OPENAI:
        // TODO: 适配OpenAI流处理
        console.log('OpenAI direct API not fully implemented');
        throw new Error('OpenAI direct API not fully implemented');
        
      case ModelType.DIFY:
      default:
        console.log('Using Dify stream processor (default)');
        return DifyStream(query, key, user, conversationId);
    }
  }
}
