import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';
import { DifyClient } from '@/services/dify';
import { getDifyConfig, difyAppConfig } from '@/config/dify';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

export const config = {
  runtime: 'edge',
};

// 创建 DifyClient 实例
const difyClient = new DifyClient(getDifyConfig());

// 注册默认应用配置
difyAppConfig.registerApp({
  appId: process.env.DIFY_APP_ID || 'default',
  apiKey: process.env.DIFY_API_KEY || '',
  model: process.env.DIFY_MODEL,
  temperature: Number(process.env.DIFY_TEMPERATURE || DEFAULT_TEMPERATURE)
});

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

    // 获取当前应用配置
    const currentConfig = difyAppConfig.getCurrentConfig();
    
    // 如果提供了模型,则切换模型
    if (model) {
      difyClient.setModel(model);
    } else if (currentConfig.model) {
      difyClient.setModel(currentConfig.model);
    }

    // 设置当前应用 ID
    difyClient.setAppId(currentConfig.appId);

    let query = messages[messages.length - 1].content;
    const stream = await difyClient.createChatStream({
      query,
      key: key || currentConfig.apiKey,
      user,
      conversationId: Dify_ConversationId,
      autoGenerateName: true
    });

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
