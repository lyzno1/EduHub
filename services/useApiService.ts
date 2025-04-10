import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';
import { ChatBody, ChatResponse } from '@/types/chat';
import { API_PATHS } from './dify/constants';

export interface GetModelsRequestProps {
  key: string;
}

// 确保API_URL不包含API路径
export const DIFY_API_BASE_URL = process.env.NEXT_PUBLIC_DIFY_API_URL || 'http://localhost:8080';

export async function streamDifyChat({
  query,
  user,
  conversationId,
  onMessage,
  onComplete,
  onError
}: {
  query: string;
  user: string;
  conversationId?: string;
  onMessage: (chunk: string) => void;
  onComplete?: (conversationId?: string) => void;
  onError?: (err: any) => void;
}) {
  try {
    // 确保baseUrl不以斜杠结尾
    const baseUrl = DIFY_API_BASE_URL.endsWith('/') 
      ? DIFY_API_BASE_URL.slice(0, -1) 
      : DIFY_API_BASE_URL;
      
    // 统一URL构建逻辑
    const apiEndpoint = `${baseUrl}${API_PATHS.CHAT_MESSAGES}`;
    
    console.log('streamDifyChat API配置信息:', {
      endpoint: apiEndpoint,
      conversationId: conversationId || '未设置',
      user
    });

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        inputs: {},
        response_mode: 'streaming',
        user,
        // 统一conversationId处理逻辑，空字符串转为undefined
        ...(conversationId ? { conversation_id: conversationId } : {}),
        auto_generate_name: true
      } as ChatBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let receivedConversationId = conversationId;
    let pingCount = 0;
    let chunkCount = 0;
    let lastChunkTime = Date.now();

    while (true) {
      const { value, done } = await reader!.read();
      if (done) {
        console.log(`流读取完成，处理了${chunkCount}个数据块，收到${pingCount}次ping`);
        // 确保最后的完成回调被执行
        onComplete?.(receivedConversationId);
        break;
      }

      chunkCount++;
      lastChunkTime = Date.now();
      buffer += decoder.decode(value, { stream: true });
      
      // 尝试多种分隔符
      const separators = ['\n\n', '\n', '\r\n\r\n', '\r\n'];
      let foundSeparator = false;
      
      for (const separator of separators) {
        if (buffer.includes(separator)) {
          const parts = buffer.split(separator);
          buffer = parts.pop() || '';
          
          for (const part of parts) {
            // 处理ping消息
            if (part.trim() === 'event: ping' || part.trim() === 'ping' || part.includes('event: ping')) {
              pingCount++;
              console.log(`收到ping心跳消息 #${pingCount}`);
              continue;
            }
            
            if (!part.trim() || !part.trim().startsWith('data:')) continue;
            
            const raw = part.replace(/^data:\s*/, '');
            if (raw === '[DONE]') {
              onComplete?.(receivedConversationId);
              return;
            }

            try {
              const json = JSON.parse(raw) as ChatResponse;
              
              // 保存后端返回的conversationId
              if (json.conversation_id && (!receivedConversationId || receivedConversationId === '')) {
                receivedConversationId = json.conversation_id;
                console.log('收到新的conversationId:', receivedConversationId);
              }
              
              if (json.event === 'message') {
                onMessage(json.answer || '');
              } else if (json.event === 'message_end') {
                onComplete?.(receivedConversationId);
              } else if (json.event === 'ping') {
                pingCount++;
                console.log(`收到ping消息(JSON格式) #${pingCount}`);
              }
            } catch (err) {
              console.error('Error parsing SSE message:', err, 'Raw data:', raw);
              // 不要中断处理，继续处理下一个消息
            }
          }
          
          foundSeparator = true;
          break;
        }
      }
      
      // 如果buffer积累太多但没找到分隔符，尝试检查是否有ping消息
      if (!foundSeparator && buffer.length > 100) {
        if (buffer.includes('event: ping')) {
          pingCount++;
          console.log(`从buffer中提取到ping消息 #${pingCount}`);
          buffer = buffer.replace('event: ping', '').trim();
        }
        
        // 尝试解析整个buffer
        try {
          const json = JSON.parse(buffer);
          if (json.answer) {
            onMessage(json.answer);
            buffer = '';
          }
        } catch (e) {
          // 解析失败，继续等待更多数据
        }
      }
    }
  } catch (error) {
    console.error('Error in streamDifyChat:', error);
    onError?.(error);
  }
}

const useApiService = () => {
  const fetchService = useFetch();

  // const getModels = useCallback(
  // 	(
  // 		params: GetManagementRoutineInstanceDetailedParams,
  // 		signal?: AbortSignal
  // 	) => {
  // 		return fetchService.get<GetManagementRoutineInstanceDetailed>(
  // 			`/v1/ManagementRoutines/${params.managementRoutineId}/instances/${params.instanceId
  // 			}?sensorGroupIds=${params.sensorGroupId ?? ''}`,
  // 			{
  // 				signal,
  // 			}
  // 		);
  // 	},
  // 	[fetchService]
  // );

  const getModels = useCallback(
    (params: GetModelsRequestProps, signal?: AbortSignal) => {
      return fetchService.post<GetModelsRequestProps>(`/api/models`, {
        body: { key: params.key },
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  return {
    getModels,
    streamDifyChat
  };
};

export default useApiService;
