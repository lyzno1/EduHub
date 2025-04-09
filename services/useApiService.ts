import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';
import { ChatBody, ChatResponse } from '@/types/chat';

export interface GetModelsRequestProps {
  key: string;
}

export const DIFY_API_URL = process.env.NEXT_PUBLIC_DIFY_API_URL || 'http://localhost:8080/v1/chat-messages';

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
  onComplete?: () => void;
  onError?: (err: any) => void;
}) {
  try {
    const response = await fetch(DIFY_API_URL, {
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
        conversation_id: conversationId ?? '',
        auto_generate_name: true
      } as ChatBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim().startsWith('data:')) continue;
        const raw = part.replace(/^data:\s*/, '');
        if (raw === '[DONE]') {
          onComplete?.();
          return;
        }

        try {
          const json = JSON.parse(raw) as ChatResponse;
          if (json.event === 'message') {
            onMessage(json.answer || '');
          } else if (json.event === 'message_end') {
            onComplete?.();
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
          onError?.(err);
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
