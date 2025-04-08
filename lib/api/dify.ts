import { DifyResponse, DifyEvent, DifyMessageEvent } from '@/types/dify';

const DIFY_API_BASE = 'http://localhost:8080';
const DIFY_API_KEY = 'app-AomSdWL5wAUjnhBc1VyGo8RG';

export interface StreamOptions {
  query: string;
  user: string;
  conversationId?: string;
  onMessage: (text: string) => void;
  onConversationId?: (id: string) => void;
  onComplete?: () => void;
  onError?: (error: any) => void;
  apiKey?: string;
}

export async function streamDifyChat({
  query,
  user,
  conversationId,
  onMessage,
  onConversationId,
  onComplete,
  onError,
  apiKey = DIFY_API_KEY
}: StreamOptions) {
  try {
    const response = await fetch(`${DIFY_API_BASE}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query,
        inputs: {},
        response_mode: 'streaming',
        user,
        conversation_id: conversationId || '',
        auto_generate_name: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentAnswer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6)) as DifyEvent;
          
          switch (data.event) {
            case 'message':
              const messageEvent = data as DifyMessageEvent;
              if (messageEvent.data?.answer) {
                currentAnswer += messageEvent.data.answer;
                onMessage(currentAnswer);
              }
              if (messageEvent.conversation_id && onConversationId) {
                onConversationId(messageEvent.conversation_id);
              }
              break;

            case 'error':
              onError?.(new Error(data.message || '未知错误'));
              break;

            case 'message_end':
            case 'workflow_finished':
              onComplete?.();
              break;

            case 'workflow_started':
            case 'node_started':
            case 'node_finished':
              // 这些是工作流事件，我们可以忽略它们
              // 如果需要，可以在这里添加处理逻辑
              break;

            default:
              console.debug('未处理的事件类型:', data.event, data);
              break;
          }
        } catch (err) {
          console.warn('解析消息失败:', err);
          console.warn('原始数据:', line);
          continue;
        }
      }
    }
  } catch (error) {
    onError?.(error);
  }
} 